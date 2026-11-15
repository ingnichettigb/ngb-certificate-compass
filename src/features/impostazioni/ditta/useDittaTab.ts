/*
 * File:      useDittaTab.ts
 * Percorso:  src/features/impostazioni/ditta/useDittaTab.ts
 * Data creaz: 01/11/2026
 * Revisioni:
 *   rev 1 — 01/11/2026 12:00 — Hook per la gestione form e salvataggio anagrafica ditta.
 *   rev 2 — 01/11/2026 14:00 — Chiavi di cache condivise; normalizzazione ATECO.
 *   rev 3 — 06/11/2026 — Modifiche pendenti (isDirty), salvaAdesso e reimpostaForm.
 *   rev 4 — 15/11/2026 11:56 — Propagazione rischio dal catalogo ATECO.
 *   rev 5 — 15/11/2026 12:45 — Supporto stella ATECO principale, ricalcolo automatico del rischio per massima gravità con override manuale e reset pulito.
 *   rev 6 — 15/11/2026 — «Presenze contemporanee max» = somma delle presenze di tutte le sedi attive (quando tutte compilate); espone il riepilogo.
 *   rev 7 — 15/11/2026 — «N. Lavoratori» letto dall'anagrafica (solo in_forza, cessati esclusi) e date di aggiornamento impostate in automatico a oggi quando il dato cambia.
 *   rev 8 — 15/11/2026 — «Modifiche non salvate» solo per le modifiche dell'utente: l'allineamento automatico di N. lavoratori (anagrafica) e Presenze (sedi)
 *                        fa parte della base di confronto di isDirty, quindi aprire la finestra e premere «Torna» non chiede più conferma.
 *                        Il primo codice ATECO è «principale» (promozione senza errori di tipo).
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CHIAVE_DITTA,
  CHIAVE_LAVORATORI_IN_FORZA,
  CHIAVE_SOGLIE_DITTA,
  contaLavoratoriInForza,
  getDitta,
  salvaDitta,
  getSoglieDitta,
  DittaRecord,
} from "@/lib/api/ditta";
import { CHIAVE_SEDI, getSedi } from "@/lib/api/sedi";
import { riepilogaPresenze } from "@/features/ditta/presenze-sedi";
import {
  normalizzaAteco,
  suggerisciRischioAteco,
  LivelloRischio,
  CodiceAteco,
} from "@/features/ditta/regole-ditta";
import {
  useCatalogoAteco,
  trovaRischioInCatalogo,
  calcolaRischioMassimo,
} from "@/features/ditta/catalogo-ateco";

export type StatoNuovoAteco = {
  codice: string;
  descrizione: string;
  rischio?: LivelloRischio | null;
};

/** Confronto profondo con chiavi ordinate: due oggetti con gli stessi dati risultano uguali. */
function uguali(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(norm)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>)
              .filter(([k]) => k !== "updated_at" && k !== "created_at")
              .sort(([x], [y]) => x.localeCompare(y))
              .map(([k, val]) => [k, norm(val)]),
          )
        : v;
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}


/** Tutti i codici ATECO, con il primo promosso a «principale» se nessuno lo è. */
function conPrincipale(lista: CodiceAteco[]): CodiceAteco[] {
  if (lista.length === 0 || lista.some((c) => c.principale)) return lista;
  return lista.map((c, i) => (i === 0 ? { ...c, principale: true } : c));
}

/**
 * Valori che il programma ricava da solo (non digitati dall'utente):
 *  - N. lavoratori = lavoratori in forza dall'anagrafica (con data = oggi se il numero cambia);
 *  - Presenze contemporanee max = somma dei massimi delle sedi, quando sono tutti compilati.
 * La stessa funzione serve a riempire il form e a costruire la base di confronto di isDirty:
 * così il solo aprire la finestra non conta come «modifica non salvata».
 */
function conValoriAutomatici(
  record: DittaRecord,
  inForza: number | undefined,
  presenze: { completo: boolean; totale: number },
  oggi: string,
): DittaRecord {
  let r = record;
  if (inForza !== undefined && r.n_lavoratori_dichiarato !== inForza) {
    r = { ...r, n_lavoratori_dichiarato: inForza, n_lavoratori_data_aggiornamento: oggi };
  }
  if (presenze.completo && r.presenze_contemporanee_max !== presenze.totale) {
    r = { ...r, presenze_contemporanee_max: presenze.totale, presenze_data_aggiornamento: oggi };
  }
  return r;
}

export function useDittaTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<DittaRecord | null>(null);
  const [nuovoAteco, setNuovoAteco] = useState<StatoNuovoAteco>({
    codice: "",
    descrizione: "",
  });

  const { data: dittaDb, isLoading: loadingDitta } = useQuery({
    queryKey: CHIAVE_DITTA,
    queryFn: getDitta,
  });

  const { data: soglie = [] } = useQuery({
    queryKey: CHIAVE_SOGLIE_DITTA,
    queryFn: getSoglieDitta,
  });

  const { data: catalogoAteco = [] } = useCatalogoAteco();

  const { data: sedi = [] } = useQuery({ queryKey: CHIAVE_SEDI, queryFn: getSedi });
  const riepilogoPresenze = useMemo(() => riepilogaPresenze(sedi), [sedi]);

  // Lavoratori attivi dall'anagrafica dipendenti (stato in_forza): è il dato certo, non più digitato a mano
  const { data: inForza } = useQuery({
    queryKey: CHIAVE_LAVORATORI_IN_FORZA,
    queryFn: contaLavoratoriInForza,
  });

  const caricatoDaDb = useRef(false);
  const formPronto = form !== null;
  // «Oggi» fissato all'apertura: form e base di confronto usano la stessa data anche a cavallo della mezzanotte
  const oggiSessione = useRef(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (dittaDb && !caricatoDaDb.current) {
      setForm(dittaDb);
      caricatoDaDb.current = true;
    }
  }, [dittaDb]);

  // N. lavoratori = lavoratori in forza dall'anagrafica; la data si aggiorna a oggi solo se il numero cambia.
  // Propagazione automatica delle presenze: quando tutte le sedi attive hanno il loro massimo di presenti,
  // la somma diventa «Presenze contemporanee max» (tetto cautelativo dell'intera azienda).
  const lavoratoriInForm = form?.n_lavoratori_dichiarato ?? null;
  const presenzeInForm = form?.presenze_contemporanee_max ?? null;
  useEffect(() => {
    if (!formPronto) return;
    setForm((f) => (f ? conValoriAutomatici(f, inForza, riepilogoPresenze, oggiSessione.current) : f));
  }, [formPronto, inForza, lavoratoriInForm, presenzeInForm, riepilogoPresenze]);

  // Base di confronto = record del database con gli stessi valori automatici del form:
  // «modifiche non salvate» = solo ciò che l'utente ha cambiato (non il conteggio dell'anagrafica).
  const isDirty = useMemo(() => {
    if (!form || !dittaDb) return false;
    const base = conValoriAutomatici(dittaDb, inForza, riepilogoPresenze, oggiSessione.current);
    return !uguali(form, base);
  }, [form, dittaDb, inForza, riepilogoPresenze]);

  const mutazioneSalva = useMutation({
    mutationFn: salvaDitta,
    onSuccess: (datiAggiornati) => {
      setForm(datiAggiornati);
      qc.setQueryData(CHIAVE_DITTA, datiAggiornati);
      toast.success("Dati della Ditta salvati");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Salvataggio non riuscito", { description: msg });
    },
  });

  function updateCampo<K extends keyof DittaRecord>(campo: K, valore: DittaRecord[K]) {
    if (!form) return;
    const aggiornato = { ...form, [campo]: valore };
    const oggi = new Date().toISOString().slice(0, 10);
    if (campo === "n_lavoratori_dichiarato") {
      aggiornato.n_lavoratori_data_aggiornamento = valore === null ? null : oggi;
    }
    if (campo === "presenze_contemporanee_max") {
      aggiornato.presenze_data_aggiornamento = valore === null ? null : oggi;
    }
    setForm(aggiornato);
  }

  function aggiungiAteco() {
    if (!form || !nuovoAteco.codice.trim()) return;
    const codice = normalizzaAteco(nuovoAteco.codice);
    if (!codice) {
      toast.error("Codice ATECO non valido", { description: "Esempio: 85.31.20 oppure 85.31" });
      return;
    }
    if (form.codici_ateco.some((c) => c.codice === codice)) {
      toast.error("Codice ATECO già inserito");
      return;
    }

    // Lookup del rischio: dal form, oppure dal catalogo DB per divisione, oppure fallback
    const rischio =
      nuovoAteco.rischio ??
      trovaRischioInCatalogo(codice, catalogoAteco) ??
      suggerisciRischioAteco(codice);

    const primoCodice = form.codici_ateco.length === 0;
    const nuovo: CodiceAteco = {
      codice,
      descrizione: nuovoAteco.descrizione.trim(),
      ...(rischio ? { rischio } : {}),
      ...(primoCodice ? { principale: true } : {}),
    };

    const nuovaLista = [...form.codici_ateco, nuovo];
    const aggiornato: DittaRecord = { ...form, codici_ateco: nuovaLista };

    // Se il rischio aziendale non era impostato, o se il nuovo codice comporta un rischio più alto, allinea
    const rischioMax = calcolaRischioMassimo(nuovaLista);
    if (rischioMax && (!form.rischio_ditta || primoCodice)) {
      aggiornato.rischio_ditta = rischioMax;
    }

    setForm(aggiornato);
    setNuovoAteco({ codice: "", descrizione: "" });
  }

  function rimuoviAteco(index: number) {
    if (!form) return;
    const rimosso = form.codici_ateco[index];
    const nuovaLista = form.codici_ateco.filter((_, i) => i !== index);

    // Se è stato rimosso l'ATECO principale e ne rimangono altri, promuovi il primo
    const listaFinale = rimosso?.principale ? conPrincipale(nuovaLista) : nuovaLista;

    const aggiornato: DittaRecord = { ...form, codici_ateco: listaFinale };
    setForm(aggiornato);
  }

  function impostaPrincipale(index: number) {
    if (!form) return;
    const nuovaLista = form.codici_ateco.map((c, i) => ({
      ...c,
      principale: i === index,
    }));
    updateCampo("codici_ateco", nuovaLista);
  }

  /** Salva sul database; restituisce true se il salvataggio è riuscito. */
  async function salvaAdesso(): Promise<boolean> {
    if (!form) return false;
    if (!form.ragione_sociale.trim()) {
      toast.error("La Ragione Sociale è obbligatoria");
      return false;
    }
    try {
      await mutazioneSalva.mutateAsync(form);
      return true;
    } catch {
      return false;
    }
  }

  /** Scarta le modifiche non salvate e ripristina i dati del database. */
  function reimpostaForm() {
    if (dittaDb) setForm(dittaDb);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void salvaAdesso();
  }

  return {
    form,
    soglie,
    catalogoAteco,
    riepilogoPresenze,
    isLoading: loadingDitta,
    isSaving: mutazioneSalva.isPending,
    isDirty,
    salvaAdesso,
    reimpostaForm,
    nuovoAteco,
    setNuovoAteco,
    updateCampo,
    aggiungiAteco,
    rimuoviAteco,
    impostaPrincipale,
    handleSubmit,
  };
}

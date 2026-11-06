/*
 * File:      useDittaTab.ts
 * Percorso:  src/features/impostazioni/ditta/useDittaTab.ts
 * Data creaz: 01/11/2026
 * Revisioni:
 *   rev 1 — 01/11/2026 12:00 — Hook per la gestione form e salvataggio anagrafica ditta.
 *   rev 2 — 01/11/2026 14:00 — Chiavi di cache condivise con gli avvisi in testata; codice ATECO controllato e normalizzato (con
 *                              rischio suggerito per l'Istruzione); data di aggiornamento impostata da sola quando cambia il numero.
 *   rev 3 — 06/11/2026 — Modifiche pendenti (isDirty), salvaAdesso, reimpostaForm; il form non viene più sovrascritto
 *                        da un ricaricamento mentre ci sono modifiche non salvate.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CHIAVE_DITTA,
  CHIAVE_SOGLIE_DITTA,
  getDitta,
  salvaDitta,
  getSoglieDitta,
  DittaRecord,
  CodiceAteco,
} from "@/lib/api/ditta";
import { normalizzaAteco, suggerisciRischioAteco } from "@/features/ditta/regole-ditta";

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

export function useDittaTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<DittaRecord | null>(null);
  const [nuovoAteco, setNuovoAteco] = useState({ codice: "", descrizione: "" });

  const { data: dittaDb, isLoading: loadingDitta } = useQuery({
    queryKey: CHIAVE_DITTA,
    queryFn: getDitta,
  });

  const { data: soglie = [] } = useQuery({
    queryKey: CHIAVE_SOGLIE_DITTA,
    queryFn: getSoglieDitta,
  });

  // Modifiche non ancora salvate: confronto profondo, indipendente dall'ordine delle chiavi.
  const isDirty = useMemo(() => {
    if (!form || !dittaDb) return false;
    return !uguali(form, dittaDb);
  }, [form, dittaDb]);
  const dirtyRef = useRef(false);
  dirtyRef.current = isDirty;

  // Allinea il form al DB solo se non ci sono modifiche in corso (evita di perderle a un ricaricamento).
  useEffect(() => {
    if (dittaDb && !dirtyRef.current) setForm(dittaDb);
  }, [dittaDb]);

  const mutazioneSalva = useMutation({
    mutationFn: (dati: DittaRecord) => salvaDitta(dati),
    onSuccess: (datiSalvati) => {
      setForm(datiSalvati);
      qc.setQueryData(CHIAVE_DITTA, datiSalvati);
      qc.invalidateQueries({ queryKey: CHIAVE_DITTA });
      toast.success("Dati ditta salvati nel database con successo");
    },
    onError: (err: Error) => {
      toast.error("Errore salvataggio dati ditta", { description: err.message });
    },
  });

  function updateCampo<K extends keyof DittaRecord>(campo: K, valore: DittaRecord[K]) {
    if (!form) return;
    const oggi = new Date().toISOString().slice(0, 10);
    const aggiornato: DittaRecord = { ...form, [campo]: valore };
    // Quando cambia il numero, la data di aggiornamento si imposta da sola (resta modificabile).
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
    const rischio = suggerisciRischioAteco(codice);
    const nuovo: CodiceAteco = {
      codice,
      descrizione: nuovoAteco.descrizione.trim(),
      ...(rischio ? { rischio } : {}),
    };
    updateCampo("codici_ateco", [...form.codici_ateco, nuovo]);
    setNuovoAteco({ codice: "", descrizione: "" });
  }

  function rimuoviAteco(index: number) {
    if (!form) return;
    const nuovaLista = form.codici_ateco.filter((_, i) => i !== index);
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
      return false; // il toast di errore è già mostrato da onError
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
    handleSubmit,
  };
}

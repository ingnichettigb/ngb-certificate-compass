/*
 * File:      TabellaRaccordo.tsx
 * Percorso:  src/features/tabelle-raccordo/TabellaRaccordo.tsx
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Tabella generica delle tabelle di raccordo.
 *   rev 2 — 14/11/2026 21:50 — Bottoni standard e colonne regolabili, spostabili e ordinabili.
 *   rev 3 — 15/11/2026 10:50 — Bottone «Esporta» (Excel o CSV).
 *   rev 4 — 15/11/2026 12:04 — Ricerca veloce nella barra comandi, anti-crash uscite anticipate React e conteggio record semplificato.
 *   rev 5 — 15/11/2026 12:45 — Cache condivisa con Ditta (CHIAVE_CATALOGO_ATECO), riga gialla ben visibile, spunta Ditta isolata su codici_ateco e rimozione puntuale del codice.
 *   rev 6 — 15/11/2026 — Riga gialla con badge «In uso Ditta» anche nelle tabelle 03 (RLS), 04 e 07 (Primo Soccorso), 05 (Antincendio): fascia calcolata su lavoratori più alti tra dichiarato e in forza e su presenze totali delle sedi.
 *   rev 7 — 15/11/2026 — Tabelle 03, 04, 05: colonna «In uso Ditta» con spunta automatica e bloccata, uguale alla riga gialla (nessuna scrittura su «applica»).
 *                        Tabella 07: l'indice INAIL si sceglie a mano con «Applica» (la riga spuntata è gialla); senza spunta la riga gialla è solo «Proposta».
 *   rev 8 — 15/11/2026 — Colonna «Applica» ripristinata su TUTTE le tabelle. Nelle 03, 04, 05 e 07 la riga calcolata per la Ditta (gialla, «In uso Ditta»)
 *                        mostra la spunta e il programma la salva nel database (applica = true sulla fascia attiva, false sulle altre della stessa tabella).
 *                        Tabella 07: se più righe hanno stessa fascia e gruppo (indice INAIL) vale la scelta fatta a mano tra quelle; fuori dalla fascia
 *                        della Ditta la spunta non è modificabile. Bottone «Esporta» riparato (props e firma di esportaTabella) con «Applica» come a schermo.
 *                        Rimozione dell'ATECO principale senza errori di tipo.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { IntestazioneColonna } from "@/components/tabella-comune/IntestazioneColonna";
import { ordinaRighe, useColonneTabella } from "@/components/tabella-comune/useColonneTabella";
import { PulsanteEsporta } from "@/components/tabella-comune/PulsanteEsporta";
import { esportaTabella } from "@/components/tabella-comune/esporta-tabella";
import { tabellaRaccordoDaEsportare } from "./esporta-raccordo";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { leggiTutto, sb } from "@/lib/api/client";
import { CHIAVE_DITTA, CHIAVE_LAVORATORI_IN_FORZA, contaLavoratoriInForza, getDitta, getSoglieDitta, CHIAVE_SOGLIE_DITTA, calcolaSoglia } from "@/lib/api/ditta";
import { CHIAVE_SEDI, getSedi } from "@/lib/api/sedi";
import { lavoratoriDiRiferimento, nellaFascia, riepilogaPresenze } from "@/features/ditta/presenze-sedi";
import { CHIAVE_CATALOGO_ATECO } from "@/features/ditta/catalogo-ateco";
import type { Colonna, DefinizioneTabella, Riga } from "./definizioni";

const NESSUNA_RIGA: Riga[] = [];

interface Props {
  def: DefinizioneTabella;
}

function ErroreTabelle({ messaggio }: { messaggio: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <p className="font-semibold">Errore nel caricamento della tabella</p>
      <p className="mt-1 text-xs opacity-90">{messaggio}</p>
    </div>
  );
}

function messaggio(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
    return e.message;
  }
  return String(e);
}

function moduloDa(def: DefinizioneTabella, riga: Riga | null): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  for (const c of def.colonne) {
    if (riga && c.chiave in riga) {
      m[c.chiave] = riga[c.chiave];
    } else if (def.predefiniti && c.chiave in def.predefiniti) {
      m[c.chiave] = def.predefiniti[c.chiave];
    } else {
      m[c.chiave] = c.tipo === "bool" ? false : "";
    }
  }
  return m;
}

function valoriDa(def: DefinizioneTabella, modulo: Record<string, unknown>): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const c of def.colonne) {
    const raw = modulo[c.chiave];
    if (c.tipo === "numero") {
      v[c.chiave] = raw === "" || raw === null || raw === undefined ? null : Number(raw);
    } else if (c.tipo === "bool") {
      v[c.chiave] = Boolean(raw);
    } else {
      v[c.chiave] = raw === "" ? null : raw;
    }
  }
  return v;
}

function mostra(c: Colonna, valore: unknown): string {
  if (valore === null || valore === undefined || valore === "") return "—";
  if (c.tipo === "bool") return valore ? "Sì" : "No";
  return String(valore);
}

export function TabellaRaccordo({ def }: Props) {
  const qc = useQueryClient();
  const tabella = def.tabella ?? "";
  // Per ATECO usa la chiave unificata del catalogo; per le altre tabelle usa la chiave dedicata
  const chiave = useMemo(
    () => (def.id === "ateco" ? CHIAVE_CATALOGO_ATECO : (["raccordo", def.id] as const)),
    [def.id],
  );

  const [selezionata, setSelezionata] = useState<string | null>(null);
  const [modifica, setModifica] = useState<{ riga: Riga | null } | null>(null);
  const [modulo, setModulo] = useState<Record<string, unknown>>({});
  const [salvataggio, setSalvataggio] = useState(false);
  const [daCancellare, setDaCancellare] = useState<Riga | null>(null);
  const [ricerca, setRicerca] = useState("");
  const colonne = useColonneTabella(`raccordo:${def.id}`, def.colonne.map((c) => c.chiave));

  const {
    data: righe = NESSUNA_RIGA,
    isLoading,
    error,
  } = useQuery({
    queryKey: chiave,
    retry: false,
    queryFn: () =>
      leggiTutto<Riga>(() => {
        let q = sb.from(tabella).select("*");
        for (const [k, v] of Object.entries(def.filtro ?? {})) q = q.eq(k, v);
        q = q.order("ordine", { ascending: true });
        for (const k of def.ordinaPer ?? []) q = q.order(k, { ascending: true });
        return q.order("id", { ascending: true });
      }),
  });

  // Tabelle in cui la riga «in uso» della Ditta è calcolata in automatico (03 RLS, 04 e 07 Primo Soccorso, 05 Antincendio)
  const tipoSoglia =
    def.id === "soglie-rls"
      ? "rls"
      : def.id === "soglie-primo-soccorso" || def.id === "primo-soccorso"
        ? "primo_soccorso"
        : def.id === "soglie-antincendio"
          ? "antincendio"
          : null;
  const usaLavoratori = tipoSoglia === "rls" || tipoSoglia === "primo_soccorso";
  const e07 = def.id === "primo-soccorso";
  // 03, 04, 05: la spunta «Applica» è il risultato del calcolo (non modificabile a mano). 07: si può scegliere l'indice INAIL tra le righe in fascia.
  const spuntaAutomatica = tipoSoglia !== null && !e07;

  // Dati Ditta per l'evidenziazione: codici ATECO (Tabella 06) e numeri per le soglie
  const { data: ditta } = useQuery({
    queryKey: CHIAVE_DITTA,
    queryFn: getDitta,
    enabled: def.id === "ateco" || tipoSoglia !== null,
  });
  const { data: inForza } = useQuery({
    queryKey: CHIAVE_LAVORATORI_IN_FORZA,
    queryFn: contaLavoratoriInForza,
    enabled: usaLavoratori,
  });
  const { data: sedi } = useQuery({
    queryKey: CHIAVE_SEDI,
    queryFn: getSedi,
    enabled: tipoSoglia === "antincendio",
  });
  // Tabella 07: serve la soglia 04 per sapere quale gruppo risulta alla Ditta
  const { data: soglieDitta } = useQuery({
    queryKey: CHIAVE_SOGLIE_DITTA,
    queryFn: getSoglieDitta,
    enabled: def.id === "primo-soccorso",
  });

  // Numero su cui cade la fascia attiva: lavoratori più alti (RLS, PS) oppure presenze totali delle sedi (antincendio)
  const valoreDitta = useMemo<number | null>(() => {
    if (!ditta) return null;
    if (usaLavoratori) return lavoratoriDiRiferimento(ditta.n_lavoratori_dichiarato, inForza);
    if (tipoSoglia === "antincendio") {
      const r = riepilogaPresenze(sedi ?? []);
      return r.completo ? r.totale : (ditta.presenze_contemporanee_max ?? null);
    }
    return null;
  }, [ditta, inForza, sedi, tipoSoglia, usaLavoratori]);

  // Tabella 07: lettera del gruppo (A/B/C) risultante dalla Tabella 04 per la Ditta
  const gruppoDitta = useMemo<string | null>(() => {
    if (def.id !== "primo-soccorso" || valoreDitta === null || !soglieDitta) return null;
    const esito = calcolaSoglia(soglieDitta, "primo_soccorso", valoreDitta)?.esito ?? "";
    return /Gruppo\s+([ABC])/i.exec(esito)?.[1]?.toUpperCase() ?? null;
  }, [def.id, valoreDitta, soglieDitta]);

  // I dati della Ditta sono tutti arrivati: prima di allora la fascia calcolata potrebbe essere provvisoria e NON va scritta nel database
  const datiPronti =
    ditta !== undefined &&
    (!usaLavoratori || inForza !== undefined) &&
    (tipoSoglia !== "antincendio" || sedi !== undefined) &&
    (!e07 || soglieDitta !== undefined);

  // Righe in cui ricade la situazione attuale della Ditta (solo tabelle 03, 04, 05, 07)
  const idCalcolati = useMemo(() => {
    const ids = new Set<string>();
    if (tipoSoglia === null || valoreDitta === null) return ids;
    for (const r of righe) {
      if (!e07) {
        if (nellaFascia(valoreDitta, r["da"], r["a"])) ids.add(r.id);
        continue;
      }
      // Tabella 07: fascia testuale («1-2», «3-5», «6 o più») e gruppo della Tabella 04. Le righe per agricoltura non si deducono dal numero.
      const testo = String(r["lavoratori"] ?? "").toLowerCase();
      if (testo.includes("agricoltura")) continue;
      const m = /^(\d+)\s*-\s*(\d+)/.exec(testo) ?? /^(\d+)\s*o\s*più/.exec(testo);
      if (!m) continue;
      const fasciaOk = nellaFascia(valoreDitta, m[1], m[2] ?? null);
      if (fasciaOk && gruppoDitta !== null && String(r["gruppo"] ?? "").toUpperCase() === gruppoDitta) {
        ids.add(r.id);
      }
    }
    return ids;
  }, [righe, tipoSoglia, valoreDitta, e07, gruppoDitta]);

  // Righe «in uso Ditta» = righe spuntate «Applica». Tabella 07: se più righe hanno stessa fascia e gruppo (indice INAIL diverso)
  // e l'utente ne ha spuntate alcune tra queste, vale la sua scelta; altrimenti valgono tutte le righe calcolate.
  const idInUso = useMemo(() => {
    if (tipoSoglia === null) return new Set<string>();
    if (!e07) return idCalcolati;
    const spuntate = righe.filter((r) => Boolean(r["applica"])).map((r) => r.id);
    if (idCalcolati.size === 0) return new Set(spuntate);
    const dentro = spuntate.length > 0 && spuntate.every((id) => idCalcolati.has(id));
    return dentro ? new Set(spuntate) : idCalcolati;
  }, [righe, tipoSoglia, e07, idCalcolati]);

  // Allinea il database: applica = true sulla fascia attiva e false sulle altre della stessa tabella (cioè dello stesso ambito).
  const ultimaFirmaAllineamento = useRef("");
  useEffect(() => {
    if (tipoSoglia === null || !datiPronti || isLoading || valoreDitta === null) return;
    const daAccendere = righe.filter((r) => idInUso.has(r.id) && !r["applica"]).map((r) => r.id);
    const daSpegnere = righe.filter((r) => !idInUso.has(r.id) && Boolean(r["applica"])).map((r) => r.id);
    if (daAccendere.length === 0 && daSpegnere.length === 0) return;
    // Un solo tentativo per ogni differenza: se la scrittura fallisce non si ripete in ciclo
    const firma = `${tabella}|${daAccendere.join(",")}|${daSpegnere.join(",")}`;
    if (ultimaFirmaAllineamento.current === firma) return;
    ultimaFirmaAllineamento.current = firma;
    void (async () => {
      try {
        if (daSpegnere.length) {
          const { error: e } = await sb.from(tabella).update({ applica: false }).in("id", daSpegnere);
          if (e) throw e;
        }
        if (daAccendere.length) {
          const { error: e } = await sb.from(tabella).update({ applica: true }).in("id", daAccendere);
          if (e) throw e;
        }
        await qc.invalidateQueries({ queryKey: chiave });
      } catch (e) {
        console.warn("Allineamento della spunta «Applica» non riuscito", e);
      }
    })();
  }, [tipoSoglia, datiPronti, isLoading, valoreDitta, righe, idInUso, tabella, qc, chiave]);

  // Normalizzazione codici ditta (sia codice intero che divisione a 2 cifre)
  const codiciDittaAteco = useMemo(() => {
    if (def.id !== "ateco" || !ditta?.codici_ateco) return new Set<string>();
    const insieme = new Set<string>();
    for (const a of ditta.codici_ateco) {
      const pulito = a.codice.trim();
      insieme.add(pulito);
      const divisione = pulito.split(".")[0]?.slice(0, 2);
      if (divisione) insieme.add(divisione);
    }
    return insieme;
  }, [def.id, ditta?.codici_ateco]);

  // Filtraggio rapido da casella cerca
  const righeFiltrate = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return righe;
    return righe.filter((r) =>
      def.colonne.some((c) => String(r[c.chiave] ?? "").toLowerCase().includes(q)),
    );
  }, [righe, ricerca, def.colonne]);

  const selezionataRiga = righe.find((r) => r.id === selezionata) ?? null;
  const visibili = colonne.ordine
    .map((k) => def.colonne.find((c) => c.chiave === k))
    .filter((c): c is Colonna => Boolean(c));

  const mostrate = ordinaRighe(righeFiltrate, colonne.ordinamento);

  // Tutte le uscite anticipate avvengono TASSATIVAMENTE dopo tutti gli hook
  if (error) return <ErroreTabelle messaggio={messaggio(error)} />;

  /** Spunta «Applica» come la vede l'utente: ATECO = codici associati alla Ditta; 03, 04, 05, 07 = riga in uso; altre = campo del database. */
  const spuntatoRiga = (r: Riga): boolean =>
    def.id === "ateco"
      ? codiciDittaAteco.has(String(r["codice"] ?? "").trim())
      : tipoSoglia !== null
        ? idInUso.has(r.id)
        : Boolean(r["applica"]);

  const ricarica = () => qc.invalidateQueries({ queryKey: chiave });
  const prossimoOrdine = () => righe.reduce((m, r) => Math.max(m, Number(r["ordine"] ?? 0)), 0) + 1;

  function apriModulo(riga: Riga | null) {
    setModulo(moduloDa(def, riga));
    setModifica({ riga });
  }

  async function salva() {
    if (!modifica) return;
    for (const c of def.colonne) {
      if (c.obbligatorio && c.tipo !== "bool" && String(modulo[c.chiave] ?? "").trim() === "") {
        toast.error(`Compila «${c.etichetta}»`);
        return;
      }
    }
    setSalvataggio(true);
    try {
      const valori = valoriDa(def, modulo);
      if (modifica.riga) {
        const { error: e } = await sb.from(tabella).update(valori).eq("id", modifica.riga.id);
        if (e) throw e;
      } else {
        const { error: e } = await sb.from(tabella).insert({
          ...(def.predefiniti ?? {}),
          ...(def.filtro ?? {}),
          ...valori,
          ordine: prossimoOrdine(),
        });
        if (e) throw e;
      }
      await ricarica();
      setModifica(null);
      toast.success(modifica.riga ? "Record modificato" : "Record aggiunto");
    } catch (e) {
      toast.error("Salvataggio non riuscito", { description: messaggio(e) });
    } finally {
      setSalvataggio(false);
    }
  }

  async function duplica(riga: Riga) {
    try {
      const copia = def.alDuplicare ? def.alDuplicare(riga) : riga;
      const {
        id: _id,
        created_at: _c,
        updated_at: _u,
        n_assegnazioni: _n,
        ...resto
      } = copia as Record<string, unknown>;
      const { error: e } = await sb
        .from(tabella)
        .insert({ ...resto, applica: false, ordine: prossimoOrdine() });
      if (e) throw e;
      await ricarica();
      toast.success("Record duplicato");
    } catch (e) {
      toast.error("Duplicazione non riuscita", { description: messaggio(e) });
    }
  }

  async function conferma() {
    const riga = daCancellare;
    if (!riga) return;
    try {
      const blocco = def.controlloCancellazione ? await def.controlloCancellazione(riga) : null;
      if (blocco) {
        toast.error("Cancellazione non possibile", { description: blocco });
        return;
      }
      const { error: e } = await sb.from(tabella).delete().eq("id", riga.id);
      if (e) throw e;
      await ricarica();
      toast.success("Record cancellato");
    } catch (e) {
      toast.error("Cancellazione non riuscita", { description: messaggio(e) });
    } finally {
      setDaCancellare(null);
    }
  }

  /**
   * Gestione della spunta:
   * Per la Tabella 06 (ATECO), associa o dissocia il codice in ditta.codici_ateco in modo atomico.
   * Per le altre tabelle, aggiorna il campo «applica» della tabella di soglia.
   */
  async function cambiaSpunta(riga: Riga, valore: boolean) {
    if (def.id === "ateco") {
      const codiceRiga = String(riga["codice"] ?? "").trim();
      if (!codiceRiga) return;
      try {
        const attuali = ditta?.codici_ateco ?? [];
        let nuoviCodici = [...attuali];
        if (valore) {
          if (!nuoviCodici.some((a) => a.codice === codiceRiga)) {
            nuoviCodici.push({
              codice: codiceRiga,
              descrizione: String(riga["descrizione"] ?? ""),
              rischio: riga["rischio"] as "basso" | "medio" | "alto",
              principale: nuoviCodici.length === 0,
            });
          }
        } else {
          // Rimozione puntuale del solo codice selezionato (non distruttiva sui sottocodici)
          nuoviCodici = nuoviCodici.filter((a) => a.codice !== codiceRiga);
          if (nuoviCodici.length > 0 && !nuoviCodici.some((a) => a.principale)) {
            nuoviCodici = nuoviCodici.map((a, i) => (i === 0 ? { ...a, principale: true } : a));
          }
        }

        // Aggiorna atomicamente solo la colonna codici_ateco della Ditta
        const { error: e } = await sb
          .from("ditta")
          .update({ codici_ateco: nuoviCodici, updated_at: new Date().toISOString() })
          .eq("id", true);
        if (e) throw e;

        await qc.invalidateQueries({ queryKey: CHIAVE_DITTA });
        toast.success(
          valore
            ? `Codice ATECO ${codiceRiga} associato alla Ditta`
            : `Codice ATECO ${codiceRiga} rimosso dalla Ditta`,
        );
      } catch (e) {
        toast.error("Aggiornamento codice ATECO Ditta non riuscito", { description: messaggio(e) });
      }
      return;
    }

    // 03, 04, 05: la spunta è calcolata dal programma (e salvata dall'allineamento automatico): non si cambia a mano
    if (spuntaAutomatica) return;

    // Comportamento standard per le altre tabelle (07 compresa: indice INAIL spuntato a mano tra le righe in fascia)
    try {
      if (valore && def.gruppoSpunta) {
        const altre = righe
          .filter(
            (r) =>
              r.id !== riga.id && r["applica"] && def.gruppoSpunta!.every((k) => r[k] === riga[k]),
          )
          .map((r) => r.id);
        if (altre.length) {
          const { error: e } = await sb.from(tabella).update({ applica: false }).in("id", altre);
          if (e) throw e;
        }
      }
      const { error: e } = await sb.from(tabella).update({ applica: valore }).eq("id", riga.id);
      if (e) throw e;
      await ricarica();
    } catch (e) {
      toast.error("Spunta non salvata", { description: messaggio(e) });
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{def.descrizione}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => apriModulo(null)}>
          <Plus /> Aggiungi
        </Button>
        <Button
          type="button"
          disabled={!selezionataRiga}
          onClick={() => selezionataRiga && apriModulo(selezionataRiga)}
        >
          <Pencil /> Modifica
        </Button>
        <Button
          type="button"
          disabled={!selezionataRiga}
          onClick={() => selezionataRiga && duplica(selezionataRiga)}
        >
          <Copy /> Duplica
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={!selezionataRiga}
          onClick={() => selezionataRiga && setDaCancellare(selezionataRiga)}
        >
          <Trash2 /> Cancella
        </Button>

        {def.documento && (
          <a
            href={def.documento.url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLink className="size-4 mr-1" />
            {def.documento.etichetta}
          </a>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => colonne.ripristina()}
        >
          Ripristina colonne
        </Button>

        <PulsanteEsporta
          onEsporta={(formato) =>
            esportaTabella(
              // «Applica» esportato come a schermo (stessa spunta della tabella)
              tabellaRaccordoDaEsportare(
                def,
                visibili,
                mostrate.map((r) => ({ ...r, applica: spuntatoRiga(r) })),
              ),
              formato,
            )
          }
        />

        {/* Casella Cerca e conteggio record */}
        <div className="relative ml-auto flex items-center gap-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca nella tabella…"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-8 w-44 pl-8 text-xs bg-background"
          />
        </div>

        <span className={`text-xs text-muted-foreground ${def.documento ? "" : "ml-auto"}`}>
          {righeFiltrate.length} record
          {ricerca.trim() && ` (filtrati da ${righe.length})`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Caricamento…
        </div>
      ) : (
        <div className="scroll-visibile h-[calc(100vh-22rem)] min-h-[16rem] rounded-lg border border-border bg-surface">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 w-14 border-b border-border bg-muted px-3 py-2 text-center font-semibold">
                  N
                </th>
                {visibili.map((c) => (
                  <IntestazioneColonna
                    key={c.chiave}
                    chiave={c.chiave}
                    etichetta={c.etichetta}
                    colonne={colonne}
                    className={colonne.larghezze[c.chiave] ? "" : (c.larghezza ?? "")}
                  />
                ))}
                <th className="sticky top-0 z-10 w-28 border-b border-border bg-muted px-3 py-2 text-center font-semibold">
                  Applica
                </th>
              </tr>
            </thead>
            <tbody>
              {mostrate.map((r, i) => {
                const codiceRiga = String(r["codice"] ?? "").trim();
                const spuntato = spuntatoRiga(r);
                // Riga gialla «In uso Ditta» = riga spuntata «Applica» nelle tabelle 03, 04, 05, 06 e 07
                const inUso = (def.id === "ateco" || tipoSoglia !== null) && spuntato;
                // Tabella 07: se la Ditta ha una fascia, si possono spuntare solo le righe di quella fascia
                const fuoriFascia07 = e07 && idCalcolati.size > 0 && !idCalcolati.has(r.id);

                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelezionata(r.id)}
                    className={`cursor-pointer transition-colors ${
                      r.id === selezionata
                        ? "bg-primary/20"
                        : inUso
                          ? "bg-amber-100/90 border-l-4 border-l-amber-500 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                          : i % 2 === 0
                            ? "bg-surface"
                            : "bg-emerald-50 dark:bg-emerald-950/30"
                    } hover:bg-primary/10`}
                  >
                    <td className="px-3 py-1.5 text-center tabular-nums text-muted-foreground">
                      {i + 1}
                    </td>
                    {visibili.map((c) => (
                      <td key={c.chiave} className="overflow-hidden px-3 py-1.5 align-top">
                        <div className="flex items-center gap-1.5">
                          <span>{mostra(c, r[c.chiave])}</span>
                          {(def.id === "ateco" ? c.chiave === "codice" : c.chiave === visibili[0]?.chiave) && inUso && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-200/60 text-amber-900 border-amber-400 shrink-0 font-normal py-0 px-1.5 dark:bg-amber-900/50 dark:text-amber-200"
                            >
                              In uso Ditta
                            </Badge>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={spuntato}
                        disabled={spuntaAutomatica || fuoriFascia07}
                        title={
                          spuntaAutomatica
                            ? "Calcolato dal programma in base ai dati della Ditta"
                            : fuoriFascia07
                              ? "Fuori dalla fascia e dal gruppo calcolati per la Ditta"
                              : def.id === "ateco"
                                ? `Associa ${codiceRiga || `la riga ${i + 1}`} alla Ditta`
                                : undefined
                        }
                        onCheckedChange={(v) => cambiaSpunta(r, v === true)}
                        aria-label={`Applica la riga ${i + 1}`}
                      />
                    </td>
                  </tr>
                );
              })}
              {righeFiltrate.length === 0 && (
                <tr>
                  <td
                    colSpan={visibili.length + 2}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    {ricerca.trim()
                      ? `Nessun record corrispondente a «${ricerca}».`
                      : "Nessun record. Usa «Aggiungi» per inserirne uno."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog Aggiungi / Modifica */}
      <Dialog open={Boolean(modifica)} onOpenChange={(a) => !a && setModifica(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {modifica?.riga ? `Modifica record (${def.titolo})` : `Nuovo record in ${def.titolo}`}
            </DialogTitle>
            <DialogDescription>
              Compila i campi del record. I valori saranno salvati nella tabella di raccordo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            {def.colonne
              .filter((c) => !c.soloLettura)
              .map((c) => (
                <div key={c.chiave} className="grid grid-cols-3 items-center gap-2">
                  <Label htmlFor={`campo-${c.chiave}`} className="text-right text-xs">
                    {c.etichetta} {c.obbligatorio && <span className="text-destructive">*</span>}
                  </Label>
                  <div className="col-span-2">
                    {c.tipo === "bool" ? (
                      <Switch
                        id={`campo-${c.chiave}`}
                        checked={Boolean(modulo[c.chiave])}
                        onCheckedChange={(v) => setModulo((m) => ({ ...m, [c.chiave]: v }))}
                      />
                    ) : c.tipo === "scelta" && c.opzioni ? (
                      <Select
                        value={String(modulo[c.chiave] ?? "")}
                        onValueChange={(v) => setModulo((m) => ({ ...m, [c.chiave]: v }))}
                      >
                        <SelectTrigger id={`campo-${c.chiave}`}>
                          <SelectValue placeholder="Scegli…" />
                        </SelectTrigger>
                        <SelectContent>
                          {c.opzioni.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`campo-${c.chiave}`}
                        type={c.tipo === "numero" ? "number" : "text"}
                        value={modulo[c.chiave] === null || modulo[c.chiave] === undefined ? "" : String(modulo[c.chiave])}
                        onChange={(e) => setModulo((m) => ({ ...m, [c.chiave]: e.target.value }))}
                      />
                    )}
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModifica(null)}>
              Annulla
            </Button>
            <Button type="button" disabled={salvataggio} onClick={salva}>
              {salvataggio && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Conferma cancellazione */}
      <AlertDialog open={Boolean(daCancellare)} onOpenChange={(a) => !a && setDaCancellare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancellare questo record?</AlertDialogTitle>
            <AlertDialogDescription>
              L'operazione non può essere annullata. Se il record è collegato ad altre tabelle, la cancellazione potrebbe essere bloccata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={conferma}
            >
              Cancella
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/*
 * File:      TabellaTipiCorso.tsx
 * Percorso:  src/features/tipi-corso/TabellaTipiCorso.tsx
 * Tabella completa dei tipi di corso: intestazioni, righe, aggiunta e note.
 * Revisioni:
 * - Rev 3: 2026-10-26 17:15 - Raggruppamento per 7 argomenti con sfondi tenui e legenda.
 * - Rev (2026-11-04 08:40): Colonna N° progressiva, intestazione fissa e scorrimento orizzontale.
 * - Rev (2026-11-10): Colonne ridimensionabili (trascina il bordo dell'intestazione) e legenda ASPP/RSPP.
 */
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TipoCorso } from "@/lib/api";
import { RigaTipoCorso } from "./components/RigaTipoCorso";
import { FormNuovoCorso } from "./components/FormNuovoCorso";
import { useTabellaTipiCorso } from "./hooks/useTabellaTipiCorso";
import { useLarghezzeColonne } from "./components/useLarghezzeColonne";
import {
  GRUPPI_ARGOMENTO,
  GRUPPO_ASPP_RSPP_VISIVO,
  assegnaGruppoArgomento,
  isCorsoAsppRspp,
} from "./tipi-raggruppamento";

/** Larghezze iniziali in pixel: N°, maniglia, Codice, Corso, Ore, Validità, Agg. anni, Agg. ore, Codice agg., Al lavoratore, cestino. */
const LARGHEZZE_INIZIALI = [44, 64, 150, 340, 96, 104, 104, 100, 150, 104, 52];
const CHIAVE_LARGHEZZE = "tabella-tipi-corso:larghezze:v1";

type Chiave =
  | "codice"
  | "nome_corso"
  | "ore_minime_legge"
  | "durata_validita_anni"
  | "anni_aggiornamento"
  | "ore_aggiornamento"
  | "codice_corso_aggiornamento"
  | "visibile_lavoratore";
type Ord = { chiave: Chiave; dir: "asc" | "desc" };

/** Ordina i corsi per argomento (ordine fisso), poi per la colonna scelta; vuoti in fondo. */
export function ordina(corsi: TipoCorso[], ord: Ord): TipoCorso[] {
  const f = ord.dir === "asc" ? 1 : -1;
  return [...corsi].sort((a, b) => {
    const ga = assegnaGruppoArgomento(a).ordine;
    const gb = assegnaGruppoArgomento(b).ordine;
    if (ga !== gb) return ga - gb;
    // dentro «Sicurezza lavoratori» i corsi ASPP/RSPP stanno insieme, dopo gli altri
    const sa = isCorsoAsppRspp(a) ? 1 : 0;
    const sb = isCorsoAsppRspp(b) ? 1 : 0;
    if (sa !== sb) return sa - sb;
    const va = a[ord.chiave];
    const vb = b[ord.chiave];
    const vuotoA = va === null || va === undefined || va === "";
    const vuotoB = vb === null || vb === undefined || vb === "";
    if (vuotoA || vuotoB) return vuotoA === vuotoB ? 0 : vuotoA ? 1 : -1;
    if (typeof va === "string" && typeof vb === "string")
      return f * va.localeCompare(vb, "it", { numeric: true, sensitivity: "base" });
    return f * (Number(va) - Number(vb));
  });
}

export function TabellaTipiCorso() {
  const [ord, setOrd] = useState<Ord>({ chiave: "codice", dir: "asc" });
  const { larghezze, totale, maniglia, ripristina, modificate } = useLarghezzeColonne(
    CHIAVE_LARGHEZZE,
    LARGHEZZE_INIZIALI,
  );
  const {
    corsi,
    isLoading,
    error,
    busy,
    nuovo,
    setNuovo,
    sopra,
    salvaCampo,
    rimuovi,
    inserisci,
    sposta,
    rilasciaSu,
    iniziaTrascinamento,
    finisciTrascinamento,
    trascinaSopra,
    lasciaRiga,
  } = useTabellaTipiCorso();

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <p className="font-medium">Impossibile leggere la tabella</p>
        <p className="mt-1 text-xs">
          Se hai appena aggiornato l'app, esegui prima la migrazione SQL{" "}
          <code>20260919160000_tipi_corso_stato_regioni.sql</code>. Dettaglio:{" "}
          {(error as Error).message}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Caricamento…
      </div>
    );
  }

  const righe = ordina(corsi, ord);
  const renderManiglia = (indice: number) => (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label="Trascina per cambiare la larghezza della colonna (doppio clic: larghezza originale)"
      title="Trascina per allargare o restringere · doppio clic per ripristinare"
      className="absolute right-0 top-0 z-20 h-full w-2 cursor-col-resize touch-none select-none border-r border-border/60 hover:border-primary hover:bg-primary/20"
      {...maniglia(indice)}
    />
  );
  const intest = (chiave: Chiave, testo: string, indice: number, cls = "") => (
    <TableHead className={`relative overflow-hidden ${cls}`}>
      <button
        type="button"
        className="inline-flex max-w-full items-center gap-1 truncate font-medium hover:text-foreground"
        onClick={() =>
          setOrd((o) => ({ chiave, dir: o.chiave === chiave && o.dir === "asc" ? "desc" : "asc" }))
        }
      >
        {testo}
        {ord.chiave === chiave ? (
          ord.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
      {renderManiglia(indice)}
    </TableHead>
  );

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-medium text-muted-foreground">Argomenti:</span>
        {GRUPPI_ARGOMENTO.map((g) => (
          <span key={g.chiave} className={`rounded border border-border/40 px-2 py-0.5 font-medium ${g.coloreSfondo} ${g.coloreTesto}`}>
            {g.ordine}. {g.titolo}
          </span>
        ))}
        <span
          className={`rounded border border-border/40 px-2 py-0.5 font-medium ${GRUPPO_ASPP_RSPP_VISIVO.coloreSfondo} ${GRUPPO_ASPP_RSPP_VISIVO.coloreTesto}`}
          title="Fanno parte di «Sicurezza lavoratori» per stampe, matrici ed esportazioni"
        >
          ASPP / RSPP
        </span>
        {modificate && (
          <button
            type="button"
            onClick={ripristina}
            className="ml-auto rounded border border-border px-2 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Ripristina larghezze colonne
          </button>
        )}
      </div>
      <div className="rounded-lg border border-border [&>div]:max-h-[60vh]">
        <Table className="table-fixed" style={{ width: totale }}>
          <colgroup>
            {larghezze.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="relative overflow-hidden text-center">
                N°
                {renderManiglia(0)}
              </TableHead>
              <TableHead />
              {intest("codice", "Codice", 2)}
              {intest("nome_corso", "Corso", 3)}
              {intest("ore_minime_legge", "Ore corso", 4)}
              {intest("durata_validita_anni", "Validità (anni)", 5)}
              {intest("anni_aggiornamento", "Aggiorn. (anni)", 6)}
              {intest("ore_aggiornamento", "Aggiorn. (ore)", 7)}
              {intest("codice_corso_aggiornamento", "Codice aggiorn.", 8)}
              {intest("visibile_lavoratore", "Al lavoratore", 9, "text-center")}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {righe.map((c, n) => {
              const i = corsi.findIndex((x) => x.id === c.id);
              return (
              <RigaTipoCorso
                key={c.id}
                numero={n + 1}
                c={c}
                indice={i}
                totale={corsi.length}
                occupata={busy === c.id}
                inTrascinamento={sopra === c.id}
                onSalvaCampo={(campo, valore) => salvaCampo(c, campo, valore)}
                onRimuovi={() => rimuovi(c)}
                onSposta={(direzione) => sposta(i, direzione)}
                onIniziaTrascinamento={() => iniziaTrascinamento(c.id)}
                onFinisciTrascinamento={finisciTrascinamento}
                onTrascinaSopra={() => trascinaSopra(c.id)}
                onLasciaRiga={() => lasciaRiga(c.id)}
                onRilascia={() => rilasciaSu(c.id)}
              />
              );
            })}
            {!corsi.length && (
              <TableRow>
                <TableCell colSpan={11} className="py-6 text-center text-sm text-muted-foreground">
                  Nessun corso in tabella.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormNuovoCorso nuovo={nuovo} setNuovo={setNuovo} busy={busy} onInserisci={inserisci} />

      <p className="text-xs text-muted-foreground">
        "Al lavoratore" mostra o nasconde questo corso specifico nel modulo di invio: utile se un
        reparto può inviare solo certi tipi di attestato. Resta comunque visibile in cruscotto risorse umane e
        nella scheda dei dipendenti. Il cestino non funziona se il corso è già usato in qualche
        attestato caricato: in quel caso nascondilo con l'interruttore invece di eliminarlo.
      </p>
    </div>
  );
}

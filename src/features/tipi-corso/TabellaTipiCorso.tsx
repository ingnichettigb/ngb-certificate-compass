/*
 * File:      TabellaTipiCorso.tsx
 * Percorso:  src/features/tipi-corso/TabellaTipiCorso.tsx
 * Tabella completa dei tipi di corso: intestazioni, righe, aggiunta e note.
 * Revisioni:
 * - Rev 3: 2026-10-26 17:15 - Raggruppamento per 7 argomenti con sfondi tenui e legenda.
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
import { GRUPPI_ARGOMENTO, assegnaGruppoArgomento } from "./tipi-raggruppamento";

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
  const intest = (chiave: Chiave, testo: string, cls: string) => (
    <TableHead className={cls}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
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
    </TableHead>
  );

  return (
    <div className="min-w-0 space-y-3">
      <div className="rounded-lg border border-border [&>div]:max-h-[60vh]">
        <Table className="min-w-[900px]">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-8" />
              {intest("codice", "Codice", "w-32 min-w-[118px]")}
              {intest("nome_corso", "Corso", "min-w-[220px]")}
              {intest("ore_minime_legge", "Ore corso", "w-24 min-w-[72px]")}
              {intest("durata_validita_anni", "Validità (anni)", "w-28 min-w-[86px]")}
              {intest("anni_aggiornamento", "Aggiorn. (anni)", "w-28 min-w-[86px]")}
              {intest("ore_aggiornamento", "Aggiorn. (ore)", "w-24 min-w-[76px]")}
              {intest("codice_corso_aggiornamento", "Codice aggiorn.", "w-32 min-w-[118px]")}
              {intest("visibile_lavoratore", "Al lavoratore", "w-24 min-w-[84px] text-center")}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {righe.map((c) => {
              const i = corsi.findIndex((x) => x.id === c.id);
              return (
              <RigaTipoCorso
                key={c.id}
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
                <TableCell colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
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

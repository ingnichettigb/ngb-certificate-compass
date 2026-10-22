/*
 * File:      TabellaTipiCorso.tsx
 * Percorso:  src/features/tipi-corso/TabellaTipiCorso.tsx
 * Tabella completa dei tipi di corso: intestazioni, righe, aggiunta e note.
 */
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RigaTipoCorso } from "./components/RigaTipoCorso";
import { FormNuovoCorso } from "./components/FormNuovoCorso";
import { useTabellaTipiCorso } from "./hooks/useTabellaTipiCorso";

export function TabellaTipiCorso() {
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

  return (
    <div className="min-w-0 space-y-3">
      <div className="rounded-lg border border-border [&>div]:max-h-[60vh]">
        <Table className="min-w-[900px]">
          <TableHeader className="sticky top-0 z-10 bg-background">


            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-28 min-w-[104px]">Codice</TableHead>
              <TableHead className="min-w-[220px]">Corso</TableHead>
              <TableHead className="w-24 min-w-[72px]">Ore corso</TableHead>
              <TableHead className="w-28 min-w-[86px]">Validità (anni)</TableHead>
              <TableHead className="w-28 min-w-[86px]">Aggiorn. (anni)</TableHead>
              <TableHead className="w-24 min-w-[76px]">Aggiorn. (ore)</TableHead>
              <TableHead className="w-32 min-w-[104px]">Codice aggiorn.</TableHead>
              <TableHead className="w-24 min-w-[84px] text-center">Al lavoratore</TableHead>
              <TableHead className="w-10" />

            </TableRow>
          </TableHeader>
          <TableBody>
            {corsi.map((c, i) => (
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
            ))}
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
        reparto può inviare solo certi tipi di attestato. Resta comunque visibile in dashboard HR e
        nella scheda dei dipendenti. Il cestino non funziona se il corso è già usato in qualche
        attestato caricato: in quel caso nascondilo con l'interruttore invece di eliminarlo.
      </p>
    </div>
  );
}

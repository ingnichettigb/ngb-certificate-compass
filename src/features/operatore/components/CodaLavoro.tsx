/*
 * File:      CodaLavoro.tsx
 * Percorso:  src/features/operatore/components/CodaLavoro.tsx
 * Tabella della coda di lavoro con le azioni sui selezionati.
 */
import { Archive, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CodaRiga } from "../types";
import { RigaCoda } from "./RigaCoda";

export function CodaLavoro({
  righeCoda,
  selezionati,
  selezione,
  daArchiviare,
  archiviando,
  inviandoEmail,
  onSelezionaTutti,
  onToggle,
  onArchivia,
  onEmail,
  onCopiaAnagrafica,
  onModifica,
  onDuplica,
  onSalvaLocale,
  onCancella,
}: {
  righeCoda: CodaRiga[];
  selezionati: Set<string>;
  selezione: CodaRiga[];
  daArchiviare: CodaRiga[];
  archiviando: boolean;
  inviandoEmail: boolean;
  onSelezionaTutti: (tutti: boolean) => void;
  onToggle: (id: string) => void;
  onArchivia: (righe: CodaRiga[]) => void;
  onEmail: (righe: CodaRiga[]) => void;
  onCopiaAnagrafica: (r: CodaRiga) => void;
  onModifica: (r: CodaRiga) => void;
  onDuplica: (r: CodaRiga) => void;
  onSalvaLocale: (r: CodaRiga) => void;
  onCancella: (r: CodaRiga) => void;
}) {
  return (
      <Card>
        <CardHeader className="py-3 px-4 border-b flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">Coda di lavoro ({righeCoda.length})</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!selezione.length || archiviando || daArchiviare.length === 0}
              onClick={() => onArchivia(selezione)}
            >
              {archiviando ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}
              Aggiungi selezionati al DB{daArchiviare.length > 0 ? ` (${daArchiviare.length})` : ""}
            </Button>
            <Button
              size="sm"
              disabled={!selezione.length || inviandoEmail}
              onClick={() => onEmail(selezione)}
            >
              {inviandoEmail ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Unica email ({selezione.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">
                  <Checkbox
                    checked={righeCoda.length > 0 && selezione.length === righeCoda.length}
                    onCheckedChange={(v) => onSelezionaTutti(Boolean(v))}
                  />
                </th>
                <th className="p-2">Lavoratore</th>
                <th className="p-2">Corso</th>
                <th className="p-2">Data</th>
                <th className="p-2">Esito</th>
                <th className="p-2">Stato</th>
                <th className="p-2 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {righeCoda.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Nessuna valutazione in coda
                  </td>
                </tr>
              )}
              {righeCoda.map((r) => (
                <RigaCoda
                  key={r.id}
                  r={r}
                  selezionata={selezionati.has(r.id)}
                  archiviando={archiviando}
                  inviandoEmail={inviandoEmail}
                  onToggle={() => onToggle(r.id)}
                  onCopiaAnagrafica={() => onCopiaAnagrafica(r)}
                  onModifica={() => onModifica(r)}
                  onArchivia={() => onArchivia([r])}
                  onDuplica={() => onDuplica(r)}
                  onSalvaLocale={() => onSalvaLocale(r)}
                  onEmail={() => onEmail([r])}
                  onCancella={() => onCancella(r)}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
  );
}

/*
 * File:      IntestazioneOrdinabile.tsx
 * Percorso:  src/components/IntestazioneOrdinabile.tsx
 * Intestazione di colonna cliccabile per ordinare una tabella. Condivisa da Dipendenti e Scadenze:
 * il tipo della colonna è generico, così ogni tabella usa le proprie colonne.
 */
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type DirezioneSort = "asc" | "desc";

export function IntestazioneOrdinabile<C extends string>({
  colonna,
  titolo,
  colonnaAttiva,
  direzione,
  onOrdina,
}: {
  colonna: C;
  titolo: string;
  colonnaAttiva: C;
  direzione: DirezioneSort;
  onOrdina: (colonna: C) => void;
}) {
  const attiva = colonnaAttiva === colonna;
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={() => onOrdina(colonna)}
        className="inline-flex items-center gap-1 font-semibold hover:text-foreground transition-colors cursor-pointer"
        title={`Ordina per ${titolo}`}
      >
        <span>{titolo}</span>
        {attiva ? (
          direzione === "asc" ? (
            <ArrowUp className="size-3.5 text-primary" />
          ) : (
            <ArrowDown className="size-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="size-3 text-muted-foreground/50 opacity-60 hover:opacity-100" />
        )}
      </button>
    </th>
  );
}

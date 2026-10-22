/*
 * File:      IntestazioneOrdinabile.tsx
 * Percorso:  src/features/scadenze/components/IntestazioneOrdinabile.tsx
 * Intestazione di colonna cliccabile per ordinare la tabella.
 */
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { type ColonnaSort, type DirezioneSort } from "../types";

export function IntestazioneOrdinabile({
  colonna,
  titolo,
  colonnaAttiva,
  direzione,
  onOrdina,
}: {
  colonna: ColonnaSort;
  titolo: string;
  colonnaAttiva: ColonnaSort;
  direzione: DirezioneSort;
  onOrdina: (colonna: ColonnaSort) => void;
}) {
  const attiva = colonnaAttiva === colonna;
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={() => onOrdina(colonna)}
        className="inline-flex items-center gap-1 font-semibold hover:text-foreground transition-colors"
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

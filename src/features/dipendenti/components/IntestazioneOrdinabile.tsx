/*
 * File:      IntestazioneOrdinabile.tsx
 * Percorso:  src/features/dipendenti/components/IntestazioneOrdinabile.tsx
 * Intestazione di colonna cliccabile per ordinare la tabella attestati.
 */
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { type ColonnaSortAttestati, type DirezioneSort } from "../types";

export function IntestazioneOrdinabile({
  colonna,
  titolo,
  colonnaAttiva,
  direzione,
  onOrdina,
}: {
  colonna: ColonnaSortAttestati;
  titolo: string;
  colonnaAttiva: ColonnaSortAttestati;
  direzione: DirezioneSort;
  onOrdina: (colonna: ColonnaSortAttestati) => void;
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

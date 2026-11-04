/*
 * File:      RigaScadenza.tsx
 * Percorso:  src/features/scadenze/components/RigaScadenza.tsx
 * Una riga della tabella scadenze.
 * - Rev (2026-11-04 08:40): Colonna N° progressiva, intestazione fissa e scorrimento orizzontale.
 */
import { formatData, scaduto, type Attestato } from "@/lib/api";

export function RigaScadenza({ a, numero }: { a: Attestato; numero?: number }) {
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">{numero}</td>
      <td className="px-3 py-2 font-medium">
        {a.dipendenti?.cognome} {a.dipendenti?.nome}
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {a.codice_fiscale}
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {a.dipendenti?.reparto ?? "—"}
      </td>
      <td className="px-3 py-2">
        {a.tipi_corso?.nome_corso ?? "—"}
      </td>
      <td className="px-3 py-2">{formatData(a.data_corso)}</td>
      <td
        className={`px-3 py-2 ${
          scaduto(a.data_scadenza_calcolata)
            ? "font-semibold text-destructive"
            : "text-warning-foreground"
        }`}
      >
        {formatData(a.data_scadenza_calcolata)}
      </td>
    </tr>
  );
}

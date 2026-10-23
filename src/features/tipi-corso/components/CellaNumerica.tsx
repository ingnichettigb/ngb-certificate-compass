/*
 * File:      CellaNumerica.tsx
 * Percorso:  src/features/tipi-corso/components/CellaNumerica.tsx
 * Cella numerica modificabile sul posto (vuota = nessun valore).
 * Con zeroComeVuoto, "0", "NA", "N/A" o "non scade" salvano nessun valore.
 */
import { Input } from "@/components/ui/input";
import { TableCell } from "@/components/ui/table";

export function interpretaValore(testo: string, zeroComeVuoto = false): number | null {
  const t = testo.trim().toLowerCase().replace(",", ".");
  if (t === "" || ["na", "n/a", "n.a.", "non scade", "illimitata"].includes(t)) return null;
  const n = Number(t);
  if (Number.isNaN(n)) return null;
  if (zeroComeVuoto && n === 0) return null;
  return n;
}

export function CellaNumerica({
  valore,
  placeholder,
  disabled,
  onSalva,
  zeroComeVuoto = false,
  title,
}: {
  valore: number | null;
  placeholder?: string;
  disabled: boolean;
  onSalva: (valore: number | null) => void;
  zeroComeVuoto?: boolean;
  title?: string;
}) {
  return (
    <TableCell className="p-1.5">
      <Input
        type="text"
        inputMode="decimal"
        defaultValue={valore ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        title={title}
        onBlur={(e) => {
          const v = interpretaValore(e.target.value, zeroComeVuoto);
          if (v === null) e.target.value = "";
          onSalva(v);
        }}
        className="h-9 min-w-[90px]"
      />
    </TableCell>
  );
}

/*
 * File:      CellaNumerica.tsx
 * Percorso:  src/features/tipi-corso/components/CellaNumerica.tsx
 * Cella numerica modificabile sul posto (vuota = nessun valore).
 */
import { Input } from "@/components/ui/input";
import { TableCell } from "@/components/ui/table";

export function CellaNumerica({
  valore,
  placeholder,
  disabled,
  onSalva,
}: {
  valore: number | null;
  placeholder?: string;
  disabled: boolean;
  onSalva: (valore: number | null) => void;
}) {
  return (
    <TableCell className="p-1.5">
      <Input
        type="number"
        defaultValue={valore ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        onBlur={(e) => onSalva(e.target.value === "" ? null : Number(e.target.value))}
        className="h-9"
      />
    </TableCell>
  );
}

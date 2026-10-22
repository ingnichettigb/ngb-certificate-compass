/*
 * File:      Field.tsx
 * Percorso:  src/features/carica/components/Field.tsx
 * Campo con etichetta del modulo.
 */
import { Label } from "@/components/ui/label";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

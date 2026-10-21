/*
 * File:      Campo.tsx
 * Percorso:  src/features/dipendenti/components/Campo.tsx
 * Campo di testo con etichetta.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

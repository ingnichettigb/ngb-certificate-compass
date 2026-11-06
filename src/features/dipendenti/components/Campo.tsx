/*
 * File:      Campo.tsx
 * Percorso:  src/features/dipendenti/components/Campo.tsx
 * Data creazione: non registrata nel file originale.
 * Campo di testo con etichetta.
 * Revisioni:
 *   rev 1 — data originale — Campo di testo con etichetta.
 *   rev 2 — 06/11/2026 08:20 — Opzioni «evidenzia» (dato mancante, bordo giallo) e «autoFocus» per la coda «Da completare».
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Campo({
  label,
  value,
  onChange,
  type = "text",
  evidenzia = false,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  /** Dato mancante: bordo e sfondo giallo. */
  evidenzia?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        autoFocus={autoFocus}
        className={evidenzia ? "border-amber-500 bg-amber-500/10" : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

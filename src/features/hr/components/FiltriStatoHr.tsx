/*
 * File:      FiltriStatoHr.tsx
 * Percorso:  src/features/hr/components/FiltriStatoHr.tsx
 * Pulsanti per filtrare gli attestati per stato.
 */
import { type Stato } from "@/lib/api";
import { FILTRI } from "../types";

export function FiltriStatoHr({
  filtro,
  onCambia,
}: {
  filtro: Stato | "Tutti";
  onCambia: (f: Stato | "Tutti") => void;
}) {
  return (
  <div className="flex flex-wrap gap-2">
    {FILTRI.map((f) => (
      <button
        key={f}
        onClick={() => onCambia(f)}
        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
          filtro === f
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-surface text-muted-foreground hover:text-foreground"
        }`}
      >
        {f}
      </button>
    ))}
  </div>
  );
}

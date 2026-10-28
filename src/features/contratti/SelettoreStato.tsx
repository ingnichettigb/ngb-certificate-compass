/*
 * File:      SelettoreStato.tsx
 * Percorso:  src/features/contratti/SelettoreStato.tsx
 * Data creaz: 28/10/2026
 * Revisioni:
 *   rev 1 — 28/10/2026 09:55 — Filtro rapido In forza / In scadenza / Cessati / Tutti.
 */
import { type Dipendente } from "@/lib/api";
import { filtraPerStato, type FiltroStato } from "./contratto";

const VOCI: { id: FiltroStato; label: string }[] = [
  { id: "in_forza", label: "In forza" },
  { id: "in_scadenza", label: "Contratti in scadenza" },
  { id: "cessati", label: "Cessati" },
  { id: "tutti", label: "Tutti" },
];

export function SelettoreStato({
  valore,
  onCambia,
  dipendenti,
}: {
  valore: FiltroStato;
  onCambia: (f: FiltroStato) => void;
  dipendenti: Dipendente[];
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {VOCI.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={valore === id}
          onClick={() => onCambia(id)}
          className={`rounded-lg border-2 border-primary px-3 py-1 text-xs font-semibold transition-all ${
            valore === id ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          {label} ({filtraPerStato(dipendenti, id).length})
        </button>
      ))}
    </div>
  );
}

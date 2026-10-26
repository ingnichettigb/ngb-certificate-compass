/*
 * File:      SelettoreSezioniHr.tsx
 * Percorso:  src/features/hr/components/SelettoreSezioniHr.tsx
 * Data creaz: 26/10/2026
 * Revisioni:
 *   rev 1 — 26/10/2026 15:10 — Creazione: selettore attestati ricevuti vs archiviati.
 *   rev 2 — 26/10/2026 17:45 — Uniformazione stile: verde tenue a riposo e verde scuro attivo con bordo verde scuro.
 */
import { Archive, Inbox } from "lucide-react";

export type SezioneHr = "ricevuti" | "archiviati";

const BASE =
  "inline-flex items-center gap-2 rounded-lg border-2 border-primary px-4 py-2 text-sm font-semibold transition-all";
const RIPOSO =
  "bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground";
const ATTIVO =
  "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40";

export function SelettoreSezioniHr({
  sezione,
  onCambia,
}: {
  sezione: SezioneHr;
  onCambia: (s: SezioneHr) => void;
}) {
  const voci = [
    { id: "ricevuti" as const, label: "Gestione attestati ricevuti da Modulo lavoratore", Icona: Inbox },
    { id: "archiviati" as const, label: "Gestione attestati archiviati", Icona: Archive },
  ];
  return (
    <div className="mx-auto flex max-w-[1600px] flex-wrap gap-2 px-5 pt-4">
      {voci.map(({ id, label, Icona }) => (
        <button
          key={id}
          type="button"
          aria-pressed={sezione === id}
          onClick={() => onCambia(id)}
          className={`${BASE} ${sezione === id ? ATTIVO : RIPOSO}`}
        >
          <Icona className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

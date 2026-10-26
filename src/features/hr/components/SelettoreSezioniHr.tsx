/*
 * File:      SelettoreSezioniHr.tsx
 * Percorso:  src/features/hr/components/SelettoreSezioniHr.tsx
 * Creato:    26/10/2026
 * Revisioni:
 *   rev 1 — 26/10/2026 15:10 — creazione: due pulsanti per scegliere la sezione del cruscotto.
 * Selettore tra attestati ricevuti dal Modulo lavoratore e attestati archiviati.
 */
import { Archive, Inbox } from "lucide-react";

export type SezioneHr = "ricevuti" | "archiviati";

const BASE =
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all";
const RIPOSO = "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20";
const ATTIVO =
  "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 bg-gradient-to-b from-primary/80 to-primary";

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

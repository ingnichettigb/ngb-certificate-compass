/*
 * File:      SelettoreSezioniHr.tsx
 * Percorso:  src/features/hr/components/SelettoreSezioniHr.tsx
 * Data creaz: 26/10/2026
 * Revisioni:
 *   rev 1 — 26/10/2026 15:10 — Creazione: selettore attestati ricevuti vs archiviati.
 *   rev 2 — 26/10/2026 17:45 — Uniformazione stile: verde tenue a riposo e verde scuro attivo con bordo verde scuro.
 *   rev 3 — 26/10/2026 20:10 — Spazio sotto la riga perché la barra fissa in alto resti leggibile.
 *   rev 4 — 27/10/2026 09:25 — Rimozione wrapper pagina per allineamento sulla stessa riga dei comandi operativi.
 *   rev 5 — 28/10/2026 09:30 — Rinomina sezione ricevuti: «Modulo auto invio attestato».
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
    { id: "ricevuti" as const, label: "Gestione attestati ricevuti da Modulo auto invio", Icona: Inbox },
    { id: "archiviati" as const, label: "Gestione attestati archiviati", Icona: Archive },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
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

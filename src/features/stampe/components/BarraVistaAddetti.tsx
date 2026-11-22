/*
 * File:      BarraVistaAddetti.tsx
 * Percorso:  src/features/stampe/components/BarraVistaAddetti.tsx
 * Data creaz: 22/11/2026
 * Revisioni:
 *   rev 1 — 22/11/2026 — Due pulsanti esclusivi «Tutti gli addetti (N)» / «Richiedono formazione (N)», con il componente Button
 *            (variante «selezione», aria-pressed) e il conteggio in un badge.
 */
import { AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ETICHETTA_VISTA_ADDETTI, type VistaAddetti } from "../stampa-addetti";

type Props = {
  scelta: VistaAddetti;
  conteggi: Record<VistaAddetti, number>;
  onSeleziona: (v: VistaAddetti) => void;
};

const SCELTE: { vista: VistaAddetti; Icona: typeof Users; aiuto: string }[] = [
  { vista: "tutti", Icona: Users, aiuto: "Stampa l'intera squadra: addetti con il corso valido, in scadenza, scaduti e senza corso." },
  { vista: "formazione", Icona: AlertTriangle, aiuto: "Stampa solo chi deve fare il corso: scaduti e chi ha l'incarico ma non ha il corso («Manca»)." },
];

export function BarraVistaAddetti({ scelta, conteggi, onSeleziona }: Props) {
  return (
    <div role="group" aria-label="Quali addetti stampare" className="mb-2 flex flex-wrap items-center gap-2 print:hidden">
      {SCELTE.map(({ vista, Icona, aiuto }) => (
        <Button
          key={vista}
          type="button"
          variant="selezione"
          size="sm"
          aria-pressed={scelta === vista}
          data-aiuto={aiuto}
          onClick={() => onSeleziona(vista)}
        >
          <Icona />
          <span>{ETICHETTA_VISTA_ADDETTI[vista]}</span>
          <span className="rounded-full bg-black/10 px-1.5 text-[11px] leading-5 dark:bg-white/15">{conteggi[vista]}</span>
        </Button>
      ))}
    </div>
  );
}

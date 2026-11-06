/**
 * @file SelettoreStato.tsx
 * @path src/features/contratti/SelettoreStato.tsx
 * @created 2026-10-28
 * @revision 2026-11-05 21:30 - rev 5 - Pulsante «Da completare (N)» (solo se ci sono record da completare) e «Completa uno a uno»
 * @revision 2026-10-28 20:20 - rev 4 - Unificazione con il componente Button (verde standard e attivo)
 * @description Filtro rapido In forza / Nuovi arrivati / Da completare / In scadenza / Cessati / Senza PDF / Tutti.
 */
import { type Dipendente, type Attestato } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { filtraPerStato, type FiltroStato } from "./contratto";

const VOCI: { id: FiltroStato; label: string }[] = [
  { id: "in_forza", label: "In forza" },
  { id: "nuovi_arrivati", label: "Nuovi arrivati" },
  { id: "da_completare", label: "Da completare" },
  { id: "in_scadenza", label: "Contratti in scadenza" },
  { id: "cessati", label: "Cessati" },
  { id: "senza_pdf", label: "Senza PDF" },
  { id: "tutti", label: "Tutti" },
];

export function SelettoreStato({
  valore,
  onCambia,
  dipendenti,
  attestati = [],
  onCompletaUnoAUno,
}: {
  valore: FiltroStato;
  onCambia: (f: FiltroStato) => void;
  dipendenti: Dipendente[];
  attestati?: Attestato[];
  /** Apre la finestra che passa i record da completare uno alla volta. */
  onCompletaUnoAUno?: () => void;
}) {
  const oggi = new Date();
  const conteggi = Object.fromEntries(
    VOCI.map(({ id }) => [id, filtraPerStato(dipendenti, id, oggi, attestati).length]),
  ) as Record<FiltroStato, number>;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {VOCI.map(({ id, label }) => {
        const attivo = valore === id;
        // «Da completare» compare solo quando c'è qualcosa da completare (o se è il filtro attivo).
        if (id === "da_completare" && conteggi[id] === 0 && !attivo) return null;
        return (
          <Button
            key={id}
            type="button"
            size="sm"
            aria-pressed={attivo}
            onClick={() => onCambia(id)}
            className={attivo ? "bg-emerald-600 text-white border-emerald-700 shadow-md" : ""}
          >
            {label} ({conteggi[id]})
          </Button>
        );
      })}
      {valore === "da_completare" && onCompletaUnoAUno && conteggi.da_completare > 0 && (
        <Button type="button" size="sm" variant="outline" onClick={onCompletaUnoAUno}>
          Completa uno a uno
        </Button>
      )}
    </div>
  );
}

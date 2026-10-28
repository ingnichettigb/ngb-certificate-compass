/**
 * @file SelettoreStato.tsx
 * @path src/features/contratti/SelettoreStato.tsx
 * @created 2026-10-28
 * @revision 2026-10-28 20:20 - rev 4 - Unificazione con il componente Button (verde standard e attivo)
 * @description Filtro rapido In forza / In scadenza / Cessati / Senza PDF / Tutti.
 */
import { type Dipendente, type Attestato } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { filtraPerStato, type FiltroStato } from "./contratto";

const VOCI: { id: FiltroStato; label: string }[] = [
  { id: "in_forza", label: "In forza" },
  { id: "nuovi_arrivati", label: "Nuovi arrivati" },
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
}: {
  valore: FiltroStato;
  onCambia: (f: FiltroStato) => void;
  dipendenti: Dipendente[];
  attestati?: Attestato[];
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {VOCI.map(({ id, label }) => {
        const attivo = valore === id;
        return (
          <Button
            key={id}
            type="button"
            size="sm"
            aria-pressed={attivo}
            onClick={() => onCambia(id)}
            className={attivo ? "bg-emerald-600 text-white border-emerald-700 shadow-md" : ""}
          >
            {label} ({filtraPerStato(dipendenti, id, new Date(), attestati).length})
          </Button>
        );
      })}
    </div>
  );
}

/**
 * @file FiltriStatoHr.tsx
 * @path src/features/hr/components/FiltriStatoHr.tsx
 * @created 2024-05-10
 * @revision 2026-10-28 20:20 - rev 2 - Conversione a Button con stile verde unificato
 * @description Pulsanti per filtrare gli attestati per stato nel Cruscotto HR.
 */
import { Button } from "@/components/ui/button";
import { FILTRI, type FiltroHr } from "../types";

export function FiltriStatoHr({
  filtro,
  onCambia,
}: {
  filtro: FiltroHr;
  onCambia: (f: FiltroHr) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTRI.map((f) => {
        const attivo = filtro === f;
        const eRespinto = f === "Respinto";
        return (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={eRespinto ? "destructive" : "default"}
            onClick={() => onCambia(f)}
            className={
              attivo
                ? eRespinto
                  ? "bg-red-600 text-white border-red-700 shadow-md"
                  : "bg-emerald-600 text-white border-emerald-700 shadow-md"
                : ""
            }
          >
            {f}
          </Button>
        );
      })}
    </div>
  );
}

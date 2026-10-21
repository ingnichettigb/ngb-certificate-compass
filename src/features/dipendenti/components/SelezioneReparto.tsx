/*
 * File:      SelezioneReparto.tsx
 * Percorso:  src/features/dipendenti/components/SelezioneReparto.tsx
 * Selezione del reparto del dipendente.
 */
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { repartoLeggibile, type Dipendente } from "@/lib/api";
import { NESSUNO } from "../types";

export function SelezioneReparto({
  corrente,
  repartiAttivi,
  onCambia,
}: {
  corrente: Dipendente;
  repartiAttivi: string[];
  onCambia: (valore: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
      <Label className="text-sm">Reparto</Label>
      <Select
        value={repartoLeggibile(corrente.reparto) ? corrente.reparto.trim() : NESSUNO}
        onValueChange={(v) => onCambia(v)}
      >
        <SelectTrigger className="w-[220px] bg-surface">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NESSUNO}>Nessun reparto</SelectItem>
          {(repartoLeggibile(corrente.reparto) &&
          !repartiAttivi.includes(corrente.reparto.trim())
            ? [corrente.reparto.trim(), ...repartiAttivi]
            : repartiAttivi
          ).map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

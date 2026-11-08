/*
 * File:      RiquadroFigureSicurezza.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroFigureSicurezza.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: figure della sicurezza D.Lgs. 81/08. Nessun cambio di comportamento.
 */
import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DittaRecord } from "@/lib/api/ditta";
import type { AggiornaCampo } from "./tipi-ditta-tab";

interface Props {
  form: DittaRecord;
  updateCampo: AggiornaCampo;
}

export function RiquadroFigureSicurezza({ form, updateCampo }: Props) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <ShieldAlert className="size-4 text-primary" /> Figure della Sicurezza (D.Lgs. 81/08)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="datore_di_lavoro">Datore di Lavoro</Label>
          <Input
            id="datore_di_lavoro"
            placeholder="Nome e cognome"
            value={form.datore_di_lavoro || ""}
            onChange={(e) => updateCampo("datore_di_lavoro", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rspp">RSPP</Label>
          <Input
            id="rspp"
            placeholder="Nome e cognome"
            value={form.rspp || ""}
            onChange={(e) => updateCampo("rspp", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="medico_competente">Medico Competente</Label>
          <Input
            id="medico_competente"
            placeholder="Dott. / Dott.ssa"
            value={form.medico_competente || ""}
            onChange={(e) => updateCampo("medico_competente", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

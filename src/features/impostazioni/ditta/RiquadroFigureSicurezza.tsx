/*
 * File:      RiquadroFigureSicurezza.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroFigureSicurezza.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: figure della sicurezza D.Lgs. 81/08. Nessun cambio di comportamento.
 *   rev 2 — 09/11/2026 12:05 — Aggiunto campo ASPP (base per crediti ASR «TOTALE*» medesima azienda).
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

const CAMPI: { id: "datore_di_lavoro" | "rspp" | "aspp" | "medico_competente"; label: string; ph: string }[] = [
  { id: "datore_di_lavoro", label: "Datore di Lavoro", ph: "Nome e cognome" },
  { id: "rspp", label: "RSPP", ph: "Nome e cognome" },
  { id: "aspp", label: "ASPP", ph: "Nome e cognome (più nomi separati da virgola)" },
  { id: "medico_competente", label: "Medico Competente", ph: "Dott. / Dott.ssa" },
];

export function RiquadroFigureSicurezza({ form, updateCampo }: Props) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <ShieldAlert className="size-4 text-primary" /> Figure della Sicurezza (D.Lgs. 81/08)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {CAMPI.map((c) => (
          <div key={c.id} className="space-y-1">
            <Label htmlFor={c.id}>{c.label}</Label>
            <Input
              id={c.id}
              placeholder={c.ph}
              value={form[c.id] || ""}
              onChange={(e) => updateCampo(c.id, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

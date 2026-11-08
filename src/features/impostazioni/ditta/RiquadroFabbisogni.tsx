/*
 * File:      RiquadroFabbisogni.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroFabbisogni.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: sintesi dei fabbisogni normativi dedotti. Nessun cambio di comportamento.
 */
import { Info, AlertTriangle } from "lucide-react";
import type { DittaRecord } from "@/lib/api/ditta";
import type { AggiornaCampo } from "./tipi-ditta-tab";
import type { EsitoSoglia } from "./tipi-ditta-tab";

interface Props {
  form: DittaRecord;
  updateCampo: AggiornaCampo;
  esitoRls: EsitoSoglia;
  esitoPs: EsitoSoglia;
  esitoAntincendio: EsitoSoglia;
  esitoIdoneita: EsitoSoglia;
  antincendioDifferisce: boolean;
}

export function RiquadroFabbisogni({
  form,
  updateCampo,
  esitoRls,
  esitoPs,
  esitoAntincendio,
  esitoIdoneita,
  antincendioDifferisce,
}: Props) {
  return (
    <div className="rounded-lg border bg-muted/15 p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <Info className="size-4 text-primary" /> Fabbisogni Normativi Dedotti (D.Lgs. 81/08)
      </h3>
      <p className="text-xs text-muted-foreground">
        Questi valori sono calcolati automaticamente in base alle soglie di legge registrate nel DB:
      </p>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between p-2 rounded bg-card border">
          <span>Numero RLS previsti:</span>
          <strong className="text-primary font-semibold">
            {esitoRls ? esitoRls.esito : "Non determinato"}
          </strong>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-card border">
          <span>Gruppo Primo Soccorso:</span>
          <strong className="text-primary font-semibold">
            {esitoPs ? esitoPs.esito : "Non determinato"}
          </strong>
        </div>

        {/* Riquadro Antincendio: diventa GIALLO con avviso ROSSO se differisce */}
        <div
          className={`p-2 rounded border transition-colors ${
            antincendioDifferisce
              ? "border-2 border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:border-amber-600 dark:text-amber-200"
              : "bg-card border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Antincendio per presenze:</span>
            <strong
              className={
                antincendioDifferisce
                  ? "text-amber-900 dark:text-amber-300 font-bold"
                  : "text-primary font-semibold"
              }
            >
              {esitoAntincendio ? esitoAntincendio.esito : "Non determinato"}
            </strong>
          </div>
          {antincendioDifferisce && (
            <div className="pt-1 mt-1 border-t border-amber-300 dark:border-amber-700/50 flex items-center gap-1 text-[11px] font-semibold text-destructive">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>Differisce dal Livello {form.livello_antincendio} attribuito!</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-card border">
          <span>Idoneità Tecnica VV.F. (Esame):</span>
          <strong className="text-primary font-semibold">
            {esitoIdoneita ? esitoIdoneita.esito : "Non determinata"}
          </strong>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground pt-2">
        Nota: I dati guidano il piano di formazione e possono essere rettificati in qualsiasi
        momento.
      </p>
    </div>
  );
}

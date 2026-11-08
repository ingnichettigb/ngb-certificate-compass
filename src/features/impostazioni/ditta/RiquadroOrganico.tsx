/*
 * File:      RiquadroOrganico.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroOrganico.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: organico, presenze e livello antincendio attribuito. Nessun cambio di comportamento.
 */
import { Users, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DittaRecord } from "@/lib/api/ditta";
import type { AggiornaCampo } from "./tipi-ditta-tab";
import type { EsitoSoglia } from "./tipi-ditta-tab";

interface Props {
  form: DittaRecord;
  updateCampo: AggiornaCampo;
  lavoratoriInForza: number | undefined;
  esitoRls: EsitoSoglia;
  esitoPs: EsitoSoglia;
  esitoAntincendio: EsitoSoglia;
  livelloPropostoNum: number | null;
  antincendioDifferisce: boolean;
}

export function RiquadroOrganico({
  form,
  updateCampo,
  lavoratoriInForza,
  esitoRls,
  esitoPs,
  esitoAntincendio,
  livelloPropostoNum,
  antincendioDifferisce,
}: Props) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <Users className="size-4 text-primary" /> Organico e Presenze
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="n_lavoratori_dichiarato">N. Lavoratori dichiarato</Label>
          <Input
            id="n_lavoratori_dichiarato"
            type="number"
            min={0}
            placeholder="Es. 127"
            value={form.n_lavoratori_dichiarato ?? ""}
            onChange={(e) =>
              updateCampo(
                "n_lavoratori_dichiarato",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
          <p className="text-[11px] text-muted-foreground">
            In forza nel programma: <strong>{lavoratoriInForza ?? "—"}</strong>
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="n_lavoratori_data">Data agg. lavoratori</Label>
          <Input
            id="n_lavoratori_data"
            type="date"
            value={form.n_lavoratori_data_aggiornamento || ""}
            onChange={(e) => updateCampo("n_lavoratori_data_aggiornamento", e.target.value || null)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-1">
          <Label htmlFor="presenze_max">Presenze contemporanee max</Label>
          <Input
            id="presenze_max"
            type="number"
            min={0}
            placeholder="Es. 950"
            value={form.presenze_contemporanee_max ?? ""}
            onChange={(e) =>
              updateCampo(
                "presenze_contemporanee_max",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="presenze_data">Data agg. presenze</Label>
          <Input
            id="presenze_data"
            type="date"
            value={form.presenze_data_aggiornamento || ""}
            onChange={(e) => updateCampo("presenze_data_aggiornamento", e.target.value || null)}
          />
        </div>
      </div>

      {/* Campo Livello Antincendio attribuito con verifica e allerta gialla/rossa */}
      <div className="space-y-1.5 pt-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="livello_antincendio">Livello Antincendio attribuito</Label>
          {antincendioDifferisce && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Valore personalizzato
            </span>
          )}
        </div>
        <select
          id="livello_antincendio"
          className={`w-full h-9 rounded-md text-sm shadow-sm transition-colors ${
            antincendioDifferisce
              ? "border-2 border-amber-400 bg-amber-50 text-amber-950 font-medium focus:ring-amber-400 dark:bg-amber-950/30 dark:border-amber-600 dark:text-amber-200"
              : "border border-input bg-background text-foreground"
          } px-3 py-1`}
          value={form.livello_antincendio || 2}
          onChange={(e) => updateCampo("livello_antincendio", Number(e.target.value) as 1 | 2 | 3)}
        >
          <option value={1}>Livello 1 (Rischio basso / Fino a 100 presenti)</option>
          <option value={2}>Livello 2 (Rischio medio / Da 101 a 1.000 presenti / Scuole)</option>
          <option value={3}>Livello 3 (Rischio elevato / Oltre 1.000 presenti)</option>
        </select>

        {/* Informativa in ROSSO se differisce da quanto proposto dal D.Lgs. 81/08 */}
        {antincendioDifferisce && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="size-4 shrink-0 text-destructive" />
              <span>Differisce dal D.Lgs. 81/08: sei sicuro?</span>
            </div>
            <p className="text-[11px] text-destructive/90 leading-relaxed">
              In base alle presenze massime dichiarate (
              <strong>{form.presenze_contemporanee_max}</strong>), la normativa propone{" "}
              <strong>{esitoAntincendio?.esito}</strong>, mentre è stato attribuito{" "}
              <strong>Livello {form.livello_antincendio}</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

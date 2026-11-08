/*
 * File:      RiquadroAtecoRischio.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroAtecoRischio.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: attività, codici ATECO e livello di rischio. Nessun cambio di comportamento.
 */
import type { Dispatch, SetStateAction } from "react";
import { ShieldAlert, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DittaRecord } from "@/lib/api/ditta";
import type { AggiornaCampo } from "./tipi-ditta-tab";

type NuovoAteco = { codice: string; descrizione: string };

interface Props {
  form: DittaRecord;
  updateCampo: AggiornaCampo;
  nuovoAteco: NuovoAteco;
  setNuovoAteco: Dispatch<SetStateAction<NuovoAteco>>;
  aggiungiAteco: () => void;
  rimuoviAteco: (index: number) => void;
}

export function RiquadroAtecoRischio({
  form,
  updateCampo,
  nuovoAteco,
  setNuovoAteco,
  aggiungiAteco,
  rimuoviAteco,
}: Props) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <ShieldAlert className="size-4 text-primary" /> Attività, Codici ATECO e Rischio Aziendale
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="space-y-1">
          <Label htmlFor="rischio_ditta">Grado di Rischio Aziendale</Label>
          <select
            id="rischio_ditta"
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={form.rischio_ditta || "medio"}
            onChange={(e) =>
              updateCampo("rischio_ditta", e.target.value as "basso" | "medio" | "alto")
            }
          >
            <option value="basso">Basso (es. uffici, commercio)</option>
            <option value="medio">Medio (es. scuola, trasporti, agricoltura)</option>
            <option value="alto">Alto (es. industria, edilizia, sanità)</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Switch
            id="e_scuola"
            checked={form.e_scuola}
            onCheckedChange={(val) => updateCampo("e_scuola", val)}
          />
          <Label htmlFor="e_scuola" className="text-xs cursor-pointer">
            È un Istituto scolastico / Scuola (Regole scuola D.P.R. 151/2011)
          </Label>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Switch
            id="reparti_rischio_differenziato"
            checked={form.reparti_rischio_differenziato}
            onCheckedChange={(val) => updateCampo("reparti_rischio_differenziato", val)}
          />
          <Label htmlFor="reparti_rischio_differenziato" className="text-xs cursor-pointer">
            Reparti con rischio differenziato
          </Label>
        </div>
      </div>

      {/* Gestione Codici ATECO */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-semibold">Codici ATECO Associati</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Codice ATECO (es. 85.31.00)"
            className="w-48 font-mono text-xs"
            value={nuovoAteco.codice}
            onChange={(e) => setNuovoAteco({ ...nuovoAteco, codice: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aggiungiAteco();
              }
            }}
          />
          <Input
            placeholder="Descrizione attività (es. Istruzione secondaria di secondo grado)"
            className="flex-1 text-xs"
            value={nuovoAteco.descrizione}
            onChange={(e) => setNuovoAteco({ ...nuovoAteco, descrizione: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aggiungiAteco();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={aggiungiAteco}
            className="border-primary text-primary"
          >
            <Plus className="size-4 mr-1" /> Aggiungi
          </Button>
        </div>

        {form.codici_ateco.length > 0 ? (
          <ul className="divide-y rounded-md border text-xs bg-muted/20">
            {form.codici_ateco.map((ateco, idx) => (
              <li key={idx} className="flex items-center justify-between p-2">
                <span>
                  <strong className="font-mono text-primary mr-2">{ateco.codice}</strong>
                  {ateco.descrizione}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => rimuoviAteco(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            Nessun codice ATECO registrato. Aggiungi il codice primario dell'attività.
          </p>
        )}
      </div>
    </div>
  );
}

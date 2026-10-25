/*
 * File:          PannelloDatiVerifica.tsx
 * Percorso:      src/features/dipendenti/verifica-attestato/PannelloDatiVerifica.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 21:35): Pannello dati lavoratore/corso con campi rettificabili.
 */
import { User, BookOpen, Calendar, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { type Attestato, type Dipendente } from "@/lib/api";

export type DatiVerifica = {
  dataCorso: string;
  dataScadenza: string;
  senzaScadenza: boolean;
  ore: number | "";
};

export function PannelloDatiVerifica({
  attestato,
  dipendente,
  nomeFile,
  percorsoRelativo,
  dati,
  onCambia,
}: {
  attestato: Attestato;
  dipendente: Dipendente;
  nomeFile: string;
  percorsoRelativo: string;
  dati: DatiVerifica;
  onCambia: (d: DatiVerifica) => void;
}) {
  const set = (p: Partial<DatiVerifica>) => onCambia({ ...dati, ...p });

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-5 text-sm">
      <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <User className="size-3.5 text-primary" /> Lavoratore
        </div>
        <div className="text-base font-semibold">{dipendente.cognome} {dipendente.nome}</div>
        <div className="font-mono text-xs text-muted-foreground">CF: {dipendente.codice_fiscale}</div>
      </div>

      <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <BookOpen className="size-3.5 text-primary" /> Corso
        </div>
        <div className="font-semibold">
          {attestato.tipi_corso?.nome_corso ?? "Corso"}{" "}
          {attestato.tipi_corso?.codice && (
            <span className="font-mono text-xs text-muted-foreground">({attestato.tipi_corso.codice})</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold"><Calendar className="size-3.5 text-primary" /> Data svolgimento corso</label>
        <Input type="date" value={dati.dataCorso} onChange={(e) => set({ dataCorso: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-semibold"><Calendar className="size-3.5 text-primary" /> Data scadenza</label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={dati.senzaScadenza} onChange={(e) => set({ senzaScadenza: e.target.checked, dataScadenza: e.target.checked ? "" : dati.dataScadenza })} />
            Non scade
          </label>
        </div>
        <Input type="date" value={dati.dataScadenza} disabled={dati.senzaScadenza} onChange={(e) => set({ dataScadenza: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold"><Clock className="size-3.5 text-primary" /> Ore di formazione</label>
        <Input type="number" min={0} step={0.5} value={dati.ore} placeholder="Ore..." onChange={(e) => set({ ore: e.target.value === "" ? "" : Number(e.target.value) })} />
      </div>

      <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-xs">
        <div className="font-medium text-muted-foreground">Documento selezionato:</div>
        <div className="break-all font-mono font-medium text-primary">{nomeFile}</div>
        <div className="break-all font-mono text-[11px] text-muted-foreground">{percorsoRelativo}</div>
      </div>

      <p className="mt-auto rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-muted-foreground">
        Controlla che date e ore del documento corrispondano a questi campi prima di confermare.
      </p>
    </div>
  );
}

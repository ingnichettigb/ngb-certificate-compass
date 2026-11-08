/*
 * File:      BarreAggiornamento.tsx
 * Percorso:  src/features/dipendenti/import-elenco/BarreAggiornamento.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DialogImportaElenco.tsx: barra «tipo personale / mansione ATA» e «selezione rapida» della modalità aggiornamento. Nessun cambio di comportamento.
 */
import { CheckSquare, GraduationCap, Square, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROFILI_ATA, type Proposta, type ProfiloAta } from "./analisi-elenco";

export function BarraTipoPersonale({
  tipoPredefinito,
  profiloAtaGlobale,
  onTipo,
  onProfilo,
}: {
  tipoPredefinito: "ata" | "docente";
  profiloAtaGlobale: ProfiloAta;
  onTipo: (t: "ata" | "docente") => void;
  onProfilo: (p: ProfiloAta) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Tipo personale per questo elenco:</span>
        <div className="inline-flex rounded-md border border-border bg-background p-0.5">
          <Button
            type="button"
            size="sm"
            variant={tipoPredefinito === "ata" ? "default" : "ghost"}
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={() => onTipo("ata")}
          >
            <Users className="size-3.5" /> ATA
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tipoPredefinito === "docente" ? "default" : "ghost"}
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={() => onTipo("docente")}
          >
            <GraduationCap className="size-3.5" /> Docenti
          </Button>
        </div>
      </div>

      {tipoPredefinito === "ata" && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">Mansione ATA predefinita:</span>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
            value={profiloAtaGlobale}
            onChange={(e) => onProfilo(e.target.value as ProfiloAta)}
          >
            {PROFILI_ATA.map((p) => (
              <option key={p.codice} value={p.nome}>
                {p.nome} ({p.codice})
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onProfilo(profiloAtaGlobale)}
          >
            Applica a tutti gli ATA
          </Button>
        </div>
      )}
    </div>
  );
}

export function BarraSelezioneRapida({
  proposte,
  onTutti,
  onSoloNuovi,
  onSoloArchivio,
  onNessuno,
}: {
  proposte: Proposta[];
  onTutti: () => void;
  onSoloNuovi: () => void;
  onSoloArchivio: () => void;
  onNessuno: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-muted-foreground">Selezione rapida:</span>
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onTutti}>
        <CheckSquare className="size-3 mr-1" /> Tutti ({proposte.length})
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={onSoloNuovi}
      >
        Solo nuovi ({proposte.filter((p) => !p.dipendenteId).length})
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={onSoloArchivio}
      >
        Solo già in archivio ({proposte.filter((p) => !!p.dipendenteId).length})
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-muted-foreground"
        onClick={onNessuno}
      >
        <Square className="size-3 mr-1" /> Nessuno
      </Button>
    </div>
  );
}

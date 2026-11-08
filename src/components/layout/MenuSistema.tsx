/*
 * File:      MenuSistema.tsx
 * Percorso:  src/components/layout/MenuSistema.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Menu «Sistema» unico per tutte le pagine: impostazioni, backup, esportazione dati,
 *            stato della cartella locale e avviso dati ditta (prima ripetuti nelle singole testate).
 *
 * Il pannello resta sempre montato e viene solo nascosto: le finestre aperte dai suoi bottoni
 * (impostazioni, ripristino, esportazione) mantengono così il loro stato anche dopo la chiusura del menu.
 */
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { BackupBar } from "@/components/BackupBar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IndicatoreCartella } from "@/features/cartelle/IndicatoreCartella";
import { AvvisoDatiDitta } from "@/features/ditta/AvvisoDatiDitta";
import { DialogEsportaAttestati } from "@/features/esporta-attestati/DialogEsportaAttestati";

const STILE_TASTO =
  "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-2 border-verde-vivo bg-verde-vivo/15 px-2.5 py-0.5 text-sm font-semibold leading-tight text-primary transition-all hover:bg-verde-vivo/30";

export function MenuSistema() {
  const [aperto, setAperto] = useState(false);
  const radice = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: MouseEvent) => {
      if (radice.current && !radice.current.contains(e.target as Node)) setAperto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    document.addEventListener("mousedown", fuori);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuori);
      document.removeEventListener("keydown", esc);
    };
  }, [aperto]);

  return (
    <div ref={radice} className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Sistema"
            aria-expanded={aperto}
            onClick={() => setAperto((v) => !v)}
            className={`${STILE_TASTO} ${aperto ? "!bg-primary !text-primary-foreground ring-2 ring-verde-vivo/40" : ""}`}
          >
            <Settings className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64">
          Impostazioni, salvataggio e ripristino del database, esportazione dati, stato della cartella locale.
        </TooltipContent>
      </Tooltip>

      <div
        hidden={!aperto}
        className="absolute right-0 top-full z-50 mt-2 w-72 space-y-3 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
      >
        <BackupBar className="flex-col items-stretch" onImported={() => qc.invalidateQueries()} />
        <DialogEsportaAttestati className="w-full" />
        <div className="space-y-1 border-t border-border pt-3">
          <IndicatoreCartella />
          <AvvisoDatiDitta />
        </div>
      </div>
    </div>
  );
}

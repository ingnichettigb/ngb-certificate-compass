/*
 * File:      RigaScadenza.tsx
 * Percorso:  src/features/scadenze/components/RigaScadenza.tsx
 * Data creazione: 2026-10-15
 * Revisioni:
 * - Rev 1 (2026-10-15 10:00): Riga base tabella scadenze.
 * - Rev 2 (2026-11-04 08:40): Colonna N° progressiva e layout fisso.
 * - Rev 3 (2026-11-06 12:00): Riga per lavoratore + corso con ciclo già calcolato; badge di conformità e ore parziali.
 * - Rev 4 (2026-11-06 14:00): Pulsante per espandere/comprimere la linea temporale del ciclo (LineaCicloFormativo).
 * - Rev 5 (2026-11-06 16:00): Nota «termine transitorio» quando la scadenza è portata alla data di taglio (Preposti).
 */
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatData } from "@/lib/api";
import type { RigaScadenzaDati, StatoConformita } from "../types";
import { LineaCicloFormativo } from "./LineaCicloFormativo";

export function RigaScadenza({ riga, numero }: { riga: RigaScadenzaDati; numero?: number }) {
  const [aperto, setAperto] = useState(false);
  const { attestato: a, ciclo } = riga;
  const scaduta = ciclo.stato === "scaduto_sanabile" || ciclo.stato === "decaduto";
  const haLinea = ciclo.cicli.length > 0;

  return (
    <>
      <tr
        onClick={haLinea ? () => setAperto((v) => !v) : undefined}
        className={`transition-colors hover:bg-muted/40 ${haLinea ? "cursor-pointer" : ""}`}
      >
        <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-1">
            {haLinea && (
              <button
                type="button"
                aria-expanded={aperto}
                aria-label={aperto ? "Nascondi linea temporale" : "Mostra linea temporale"}
                onClick={(e) => {
                  e.stopPropagation();
                  setAperto((v) => !v);
                }}
                className="rounded p-0.5 text-muted-foreground/80 hover:bg-muted hover:text-foreground"
              >
                {aperto ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <span>{numero}</span>
          </div>
        </td>
        <td className="px-3 py-2 font-medium">
          {a.dipendenti?.cognome} {a.dipendenti?.nome}
        </td>
        <td className="px-3 py-2 text-muted-foreground">{a.codice_fiscale}</td>
        <td className="px-3 py-2 text-muted-foreground">{a.dipendenti?.reparto ?? "—"}</td>
        <td className="px-3 py-2">
          <div>{a.tipi_corso?.nome_corso ?? "—"}</div>
          {ciclo.dataAncora && (
            <div className="text-xs text-muted-foreground">
              Ancora Base: {formatData(ciclo.dataAncora)}
            </div>
          )}
        </td>
        <td className="px-3 py-2">{formatData(a.data_corso)}</td>
        <td className={`px-3 py-2 font-mono ${scaduta ? "text-destructive" : ""}`}>
          {ciclo.scadenzaEffettiva ? formatData(ciclo.scadenzaEffettiva) : "Non scade"}
          {ciclo.motivoScadenza && (
            <div
              title={ciclo.motivoScadenza}
              className="font-sans text-xs font-normal text-muted-foreground"
            >
              Scadenza anticipata per Accordo Stato-Regioni 2025
            </div>
          )}
        </td>
        <td className="px-3 py-2">
          <BadgeStatoConformita
            stato={ciclo.stato}
            oreAccumulate={ciclo.oreAccumulate}
            oreRichieste={ciclo.oreRichieste}
          />
          {ciclo.stato === "scaduto_sanabile" && ciclo.oreAccumulate > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              Ore già svolte: {ciclo.oreAccumulate}/{ciclo.oreRichieste}
            </div>
          )}
          {ciclo.oreDaVerificare && (
            <div className="mt-1 text-xs text-muted-foreground">Ore da verificare</div>
          )}
        </td>
      </tr>
      {aperto && haLinea && (
        <tr className="bg-muted/10">
          <td colSpan={8} className="px-4 py-3">
            <LineaCicloFormativo riga={riga} />
          </td>
        </tr>
      )}
    </>
  );
}

function BadgeStatoConformita({
  stato,
  oreAccumulate,
  oreRichieste,
}: {
  stato: StatoConformita;
  oreAccumulate: number;
  oreRichieste: number;
}) {
  switch (stato) {
    case "valido":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          In regola
        </span>
      );
    case "in_scadenza":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          In scadenza
        </span>
      );
    case "scaduto_sanabile":
      return (
        <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          Scaduto (sanabile con agg.)
        </span>
      );
    case "decaduto":
      return (
        <span className="inline-flex items-center rounded-full border border-rose-900/40 bg-rose-900/20 px-2 py-0.5 text-xs font-semibold text-rose-900 dark:text-rose-300">
          Decaduto (rifare corso base)
        </span>
      );
    case "incompleto_ore":
      return (
        <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-400">
          Parziale ({oreAccumulate}/{oreRichieste} ore)
        </span>
      );
    case "senza_scadenza":
      return <span className="text-xs text-muted-foreground">Permanente</span>;
  }
}

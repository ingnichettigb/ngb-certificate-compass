/*
 * File:      TabellaScadenze.tsx
 * Percorso:  src/features/scadenze/components/TabellaScadenze.tsx
 * Tabella delle scadenze con intestazioni ordinabili.
 */
import { type ColonnaSort, type DirezioneSort } from "../types";
import { RigaScadenza } from "./RigaScadenza";
import { IntestazioneOrdinabile } from "@/components/IntestazioneOrdinabile";
import { type Attestato } from "@/lib/api";

export function TabellaScadenze({
  righe,
  sortCol,
  sortDir,
  onOrdina,
}: {
  righe: Attestato[];
  sortCol: ColonnaSort;
  sortDir: DirezioneSort;
  onOrdina: (colonna: ColonnaSort) => void;
}) {
  return (
    <div className="mt-4 max-h-[calc(100vh-220px)] min-h-[320px] overflow-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[850px] text-sm">
        <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur text-left text-xs text-muted-foreground shadow-xs">
          <tr>
            <IntestazioneOrdinabile colonna="dipendente" titolo="Dipendente" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="codice_fiscale" titolo="Codice fiscale" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="reparto" titolo="Reparto" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="corso" titolo="Corso" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="data_corso" titolo="Data corso" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="scadenza" titolo="Scadenza" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {righe.map((a) => (
            <RigaScadenza key={a.id} a={a} />
          ))}
          {!righe.length && (
            <tr>
              <td
                colSpan={6}
                className="px-3 py-12 text-center text-muted-foreground"
              >
                Nessun attestato in questa vista
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

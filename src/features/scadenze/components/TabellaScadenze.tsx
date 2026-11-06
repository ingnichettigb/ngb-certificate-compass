/*
 * File:      TabellaScadenze.tsx
 * Percorso:  src/features/scadenze/components/TabellaScadenze.tsx
 * Tabella delle scadenze con intestazioni ordinabili.
 * - Rev (2026-11-04 08:40): Colonna N° progressiva, intestazione fissa e scorrimento orizzontale.
 * - Rev (2026-11-06 16:00): Righe raggruppate (riga={r}, key=r.chiave), colonna ordinabile «Stato», colSpan 8.
 *   Corregge il crash «Cannot destructure property 'attestato' of 'riga' as it is undefined».
 */
import { type ColonnaSort, type DirezioneSort, type RigaScadenzaDati } from "../types";
import { RigaScadenza } from "./RigaScadenza";
import { IntestazioneOrdinabile } from "@/components/IntestazioneOrdinabile";

export function TabellaScadenze({
  righe,
  sortCol,
  sortDir,
  onOrdina,
}: {
  righe: RigaScadenzaDati[];
  sortCol: ColonnaSort;
  sortDir: DirezioneSort;
  onOrdina: (colonna: ColonnaSort) => void;
}) {
  return (
    <div className="mt-4 max-h-[calc(100vh-220px)] min-h-[320px] overflow-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur text-left text-xs text-muted-foreground shadow-xs">
          <tr>
            <th className="w-12 px-3 py-2 text-center">N°</th>
            <IntestazioneOrdinabile colonna="dipendente" titolo="Dipendente" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="codice_fiscale" titolo="Codice fiscale" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="reparto" titolo="Reparto" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="corso" titolo="Corso" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="data_corso" titolo="Data corso" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="scadenza" titolo="Scadenza" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
            <IntestazioneOrdinabile colonna="stato" titolo="Stato" colonnaAttiva={sortCol} direzione={sortDir} onOrdina={onOrdina} />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {righe.map((r, i) => (
            <RigaScadenza key={r.chiave} riga={r} numero={i + 1} />
          ))}
          {!righe.length && (
            <tr>
              <td
                colSpan={8}
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

/*
 * File:      TabellaScadenze.tsx
 * Percorso:  src/features/scadenze/components/TabellaScadenze.tsx
 * Revisione: 4 — 28/11/2026 10:01
 * Tabella delle scadenze con intestazioni ordinabili.
 * Revisioni:
 * - Rev (2026-11-04 08:40): Colonna N° progressiva, intestazione fissa e scorrimento orizzontale.
 * - Rev (2026-11-06 16:00): Righe raggruppate (riga={r}, key=r.chiave), colonna ordinabile «Stato», colSpan 8.
 *   Corregge il crash «Cannot destructure property 'attestato' of 'riga' as it is undefined».
 * - Rev 3 (28/11/2026 09:11): Stampa: tabella a tutta altezza e senza scorrimento (classi print:).
 * - Rev 4 (28/11/2026 10:01): Messaggio di elenco vuoto personalizzabile (parametro facoltativo «messaggioVuoto»).
 */
import { type ColonnaSort, type DirezioneSort, type RigaScadenzaDati } from "../types";
import { RigaScadenza } from "./RigaScadenza";
import { IntestazioneOrdinabile } from "@/components/IntestazioneOrdinabile";

export function TabellaScadenze({
  righe,
  sortCol,
  sortDir,
  onOrdina,
  messaggioVuoto = "Nessun attestato in questa vista",
}: {
  righe: RigaScadenzaDati[];
  sortCol: ColonnaSort;
  sortDir: DirezioneSort;
  onOrdina: (colonna: ColonnaSort) => void;
  messaggioVuoto?: string;
}) {
  return (
    <div className="mt-4 max-h-[calc(100vh-220px)] min-h-[320px] overflow-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] print:mt-2 print:max-h-none print:min-h-0 print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <table className="w-full min-w-[980px] text-sm print:min-w-0 print:text-xs">
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
                {messaggioVuoto}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

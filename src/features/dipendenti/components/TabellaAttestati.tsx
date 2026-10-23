/*
 * File:      TabellaAttestati.tsx
 * Percorso:  src/features/dipendenti/components/TabellaAttestati.tsx
 * Tabella «Tutti gli attestati» con ordinamento per colonna.
 */
import { formatData, scaduto, statoBadgeClass } from "@/lib/api";
import { type ColonnaSortAttestati, type DirezioneSort, type RigaAttestato } from "../types";
import { IntestazioneOrdinabile } from "@/components/IntestazioneOrdinabile";

export function TabellaAttestati({
  righe,
  colonna,
  direzione,
  onOrdina,
}: {
  righe: RigaAttestato[];
  colonna: ColonnaSortAttestati;
  direzione: DirezioneSort;
  onOrdina: (colonna: ColonnaSortAttestati) => void;
}) {
  return (
    <>
          <h3 className="text-sm font-semibold">Tutti gli attestati</h3>

          {/* Contenitore con altezza fissa e scrollbar orizzontale sempre sul fondo dell'area visibile */}
          <div className="max-h-[380px] overflow-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[550px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur text-left text-xs text-muted-foreground shadow-xs">
                <tr>
                  <IntestazioneOrdinabile colonna="corso" titolo="Corso" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
                  <IntestazioneOrdinabile colonna="data" titolo="Data" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
                  <IntestazioneOrdinabile colonna="scadenza" titolo="Scadenza" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
                  <IntestazioneOrdinabile colonna="stato" titolo="Stato" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {righe.map((r) => {
                  if (r.isAttestato && r.attestato) {
                    const a = r.attestato;
                    return (
                      <tr key={a.id} className="hover:bg-muted/40">
                        <td className="px-3 py-2 font-medium">{a.tipi_corso?.nome_corso ?? "—"}</td>
                        <td className="px-3 py-2">{formatData(a.data_corso)}</td>
                        <td
                          className={`px-3 py-2 ${
                            scaduto(a.data_scadenza_calcolata) ? "font-medium text-destructive" : ""
                          }`}
                        >
                          {a.data_scadenza_calcolata
                            ? formatData(a.data_scadenza_calcolata)
                            : "senza scadenza"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${statoBadgeClass(
                              a.stato_validazione,
                            )}`}
                          >
                            {a.stato_validazione}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  if (!r.isAttestato && r.integrazione) {
                    const i = r.integrazione;
                    return (
                      <tr key={r.id} className="hover:bg-muted/40">
                        <td className="px-3 py-2 font-medium">Integrazione DVR — {i.descrizione}</td>
                        <td className="px-3 py-2">{formatData(i.data_richiesta)}</td>
                        <td className="px-3 py-2 text-muted-foreground">—</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              i.stato === "Completata"
                                ? "border-success/40 bg-success/12 text-success"
                                : "border-warning/50 bg-warning/15 text-warning-foreground"
                            }`}
                          >
                            {i.stato}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  return null;
                })}
                {!righe.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      Nessun attestato registrato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
    </>
  );
}

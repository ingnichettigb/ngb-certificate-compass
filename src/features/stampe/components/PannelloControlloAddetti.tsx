/*
 * File:      PannelloControlloAddetti.tsx
 * Percorso:  src/features/stampe/components/PannelloControlloAddetti.tsx
 * Data creaz: 22/11/2026
 * Revisioni:
 *   rev 1 — 22/11/2026 — Pannello «Controllo addetti» (solo a schermo): per ogni addetto le righe lette dagli attestati e il motivo per cui richiede formazione.
 */
import { diagnosiAddetti } from "../stampa-addetti";
import type { RigaStampa } from "../stampa-tipi";

const ROSSO = new Set(["manca", "scaduto"]);

export function PannelloControlloAddetti({ righe }: { righe: RigaStampa[] }) {
  const elenco = diagnosiAddetti(righe);
  const n = elenco.filter((d) => d.richiede).length;
  return (
    <details className="mb-2 rounded-md border border-emerald-700/40 bg-background px-3 py-1.5 text-xs print:hidden">
      <summary className="cursor-pointer font-semibold">Controllo addetti — {elenco.length} nominati, {n} richiedono formazione</summary>
      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-2">Addetto</th><th className="pr-2">Righe lette dagli attestati</th><th className="pr-2">Richiede?</th><th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {elenco.map((d) => (
            <tr key={d.dipendenteId} className="border-t border-border align-top">
              <td className="py-1 pr-2 font-medium">{d.lavoratore}</td>
              <td className="pr-2">
                {d.righe.map((r, i) => (
                  <div key={i} className={ROSSO.has(r.stato) ? "font-semibold text-red-700" : ""}>
                    {r.corso} · {r.stato} · corso {r.dataCorso} · scade {r.scadenza}
                  </div>
                ))}
              </td>
              <td className={`pr-2 font-semibold ${d.richiede ? "text-red-700" : "text-emerald-700"}`}>{d.richiede ? "SÌ" : "no"}</td>
              <td>{d.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/*
 * File:      esporta-excel.ts
 * Percorso:  src/features/tipi-corso/esporta-excel.ts
 * Esporta la tabella tipi di corso in un CSV apribile direttamente con Excel.
 */
import { getTipiCorso, type TipoCorso } from "@/lib/api";

const cella = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function csvTipiCorso(corsi: TipoCorso[]): string {
  const intest = [
    "Codice", "Nome corso", "Macro categoria", "Livello", "Ore corso",
    "Validità (anni)", "Aggiorn. (anni)", "Aggiorn. (ore)", "Codice aggiorn.", "Visibile al lavoratore",
  ];
  const righe = corsi.map((c) => [
    c.codice, c.nome_corso, c.macro_categoria, c.livello_specifico, c.ore_minime_legge,
    c.durata_validita_anni, c.anni_aggiornamento, c.ore_aggiornamento,
    c.codice_corso_aggiornamento, c.visibile_lavoratore ? "Sì" : "No",
  ]);
  return "\uFEFF" + [intest, ...righe].map((r) => r.map(cella).join(";")).join("\r\n");
}

export async function esportaTipiCorsoExcel() {
  const corsi = await getTipiCorso();
  const blob = new Blob([csvTipiCorso(corsi)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tipi-corso_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

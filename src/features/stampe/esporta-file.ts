/*
 * File:      esporta-file.ts
 * Percorso:  src/features/stampe/esporta-file.ts
 * Data creaz: 03/11/2026
 * Revisioni:
 *   rev 1 — 03/11/2026 20:50 — Esportazione Excel (foglio unico) e CSV con le sole colonne visibili in anteprima.
 */
import { cella, INTESTAZIONI, type Colonna, type RigaStampa } from "./dati-stampa";

/** Timestamp standard AAMMGGhhmm per i nomi file. */
export function timestampArchivio(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear()).slice(-2)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}

export function nomeFileEsportazione(nomeBase: string, estensione: "xlsx" | "csv", d = new Date()): string {
  return `030ArchAttestati_${timestampArchivio(d)}_${nomeBase}.${estensione}`;
}

/** Matrice intestazioni + righe con i soli valori delle colonne indicate. */
export function matriceDati(righe: RigaStampa[], colonne: Colonna[]): string[][] {
  return [colonne.map((c) => INTESTAZIONI[c]), ...righe.map((r) => colonne.map((c) => cella(r, c)))];
}

/** Testo CSV con separatore «;» (Excel italiano) e campi tra virgolette. */
export function testoCsv(righe: RigaStampa[], colonne: Colonna[]): string {
  return matriceDati(righe, colonne)
    .map((riga) => riga.map((v) => `"${v.replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
}

function scarica(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function scaricaCsv(nomeBase: string, righe: RigaStampa[], colonne: Colonna[]) {
  const blob = new Blob(["\uFEFF" + testoCsv(righe, colonne)], { type: "text/csv;charset=utf-8" });
  scarica(blob, nomeFileEsportazione(nomeBase, "csv"));
}

export async function scaricaExcel(nomeBase: string, righe: RigaStampa[], colonne: Colonna[]) {
  const XLSX = await import("xlsx");
  const matrice = matriceDati(righe, colonne);
  const ws = XLSX.utils.aoa_to_sheet(matrice);
  ws["!cols"] = colonne.map((_, i) => ({
    wch: Math.min(Math.max(...matrice.map((r) => (r[i] ?? "").length), 8) + 2, 50),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dati");
  XLSX.writeFile(wb, nomeFileEsportazione(nomeBase, "xlsx"));
}

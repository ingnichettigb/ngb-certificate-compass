/*
 * File:      esporta-file.ts
 * Percorso:  src/features/stampe/esporta-file.ts
 * Data creaz: 03/11/2026
 * Revisioni:
 *   rev 1 — 03/11/2026 20:35 — Esportazione Excel e CSV su foglio unico con prefisso e colonne dinamiche.
 */
import * as XLSX from "xlsx";

/** Timestamp standard AAMMGGhhmm per i nomi file */
export function timestampArchivio(d = new Date()): string {
  const aa = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const gg = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${aa}${mm}${gg}${hh}${min}`;
}

export type ColonnaEsportabile<T> = {
  id: string;
  titolo: string;
  valore: (r: T) => string;
};

/** Esporta i dati in un file Excel (.xlsx) a foglio unico con le sole colonne visibili */
export function scaricaExcel<T>(
  nomeBase: string,
  righe: T[],
  colonne: ColonnaEsportabile<T>[],
) {
  const matrice = [
    colonne.map((c) => c.titolo),
    ...righe.map((r) => colonne.map((c) => c.valore(r))),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(matrice);

  // Larghezza automatica colonne
  ws["!cols"] = colonne.map((c, i) => {
    const maxLen = Math.max(
      c.titolo.length,
      ...righe.map((r) => c.valore(r).length),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });

  XLSX.utils.book_append_sheet(wb, ws, "Dati");
  const nomeFile = `030ArchAttestati_${timestampArchivio()}_${nomeBase}.xlsx`;
  XLSX.writeFile(wb, nomeFile);
}

/** Esporta i dati in un file CSV standard con le sole colonne visibili */
export function scaricaCsv<T>(
  nomeBase: string,
  righe: T[],
  colonne: ColonnaEsportabile<T>[],
) {
  const righeCsv = [
    colonne.map((c) => `"${c.titolo.replace(/"/g, '""')}"`).join(";"),
    ...righe.map((r) =>
      colonne.map((c) => `"${c.valore(r).replace(/"/g, '""')}"`).join(";"),
    ),
  ];

  const blob = new Blob(["\uFEFF" + righeCsv.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `030ArchAttestati_${timestampArchivio()}_${nomeBase}.csv`;
  a.click();
  URL.revokeObjectURL(a);
}

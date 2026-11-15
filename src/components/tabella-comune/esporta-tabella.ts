/*
 * File:      esporta-tabella.ts
 * Percorso:  src/components/tabella-comune/esporta-tabella.ts
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 10:50 — Esportazione di una tabella in Excel (.xlsx, intestazione in grassetto, riga bloccata, filtro,
 *            larghezze adatte) o CSV («;» e BOM per Excel italiano). Nome file 030ArchAttestati_AAMMGGhhmm_<nome>.<estensione>.
 */
import { nomeFileEsportazione, scarica } from "@/features/stampe/esporta-file";

export type FormatoEsportazione = "xlsx" | "csv";
export type ValoreCella = string | number | boolean | null | undefined;

export interface TabellaDaEsportare {
  /** Parte del nome file dopo la data, senza estensione (es. «raccordo-01-ruoli-di-sicurezza»). */
  nomeBase: string;
  /** Nome del foglio Excel (max 31 caratteri, senza  [ ] : * ? / \ ). */
  foglio?: string;
  intestazioni: string[];
  righe: ValoreCella[][];
}

const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Testo di una cella come lo si legge a schermo: vuoto, sì/no, numeri con la virgola decimale. */
export function testoCella(v: ValoreCella): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "sì" : "no";
  if (typeof v === "number") return Number.isFinite(v) ? String(v).replace(".", ",") : "";
  return v;
}

/** Testo CSV con separatore «;» (Excel italiano), campi tra virgolette e righe terminate da CRLF. */
export function testoCsvTabella(t: Pick<TabellaDaEsportare, "intestazioni" | "righe">): string {
  return [t.intestazioni, ...t.righe]
    .map((riga) =>
      riga.map((v) => `"${testoCella(v as ValoreCella).replace(/"/g, '""')}"`).join(";"),
    )
    .join("\r\n");
}

/** Nome valido per un foglio Excel. */
export function nomeFoglio(nome: string | undefined): string {
  const pulito = (nome ?? "")
    .replace(/[[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  return pulito || "Dati";
}

/** Nome file leggibile: minuscolo, senza accenti né simboli («Presenze → livello» → «presenze-livello»). */
export function nomeBaseDa(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Larghezza (in caratteri) di ogni colonna in base al contenuto, tra 8 e 50. */
export function larghezzeColonne(t: Pick<TabellaDaEsportare, "intestazioni" | "righe">): number[] {
  return t.intestazioni.map((h, i) => {
    const massimo = t.righe.reduce((m, r) => Math.max(m, testoCella(r[i]).length), h.length);
    return Math.min(Math.max(massimo + 2, 8), 50);
  });
}

/** Costruisce il file .xlsx (un solo foglio). */
export async function creaExcel(t: TabellaDaEsportare): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(nomeFoglio(t.foglio), { views: [{ state: "frozen", ySplit: 1 }] });

  const larghezze = larghezzeColonne(t);
  ws.columns = t.intestazioni.map((h, i) => ({ header: h, width: larghezze[i] ?? 12 }));
  for (const riga of t.righe) {
    // Booleani come «sì»/«no»; numeri e testi restano come sono (i codici con zero iniziale restano testo).
    ws.addRow(riga.map((v) => (typeof v === "boolean" ? testoCella(v) : (v ?? null))));
  }

  const intest = ws.getRow(1);
  intest.height = 24;
  intest.eachCell((cell) => {
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
  });
  for (let r = 2; r <= t.righe.length + 1; r++) {
    ws.getRow(r).eachCell((cell) => {
      cell.font = { name: "Arial" };
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }
  if (t.intestazioni.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: t.intestazioni.length } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: MIME_XLSX });
}

/** Crea il file nel formato scelto e avvia il download nel browser. */
export async function esportaTabella(
  t: TabellaDaEsportare,
  formato: FormatoEsportazione,
): Promise<void> {
  const blob =
    formato === "xlsx"
      ? await creaExcel(t)
      : new Blob(["\uFEFF" + testoCsvTabella(t)], { type: "text/csv;charset=utf-8" });
  scarica(blob, nomeFileEsportazione(t.nomeBase, formato));
}

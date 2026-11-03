/*
 * File:      leggi-file.ts
 * Percorso:  src/features/dipendenti/import-elenco/leggi-file.ts
 * Creato:    03/11/2026
 * Legge nel browser un file .docx (tabella) o .xlsx/.xls/.xlsm/.csv e restituisce
 * le righe Nominativo / Codice fiscale / Funzione. Nessun invio a server esterni.
 * Revisioni:
 *   rev 1 — 03/11/2026 14:30 — Prima stesura.
 */
import type { RigaGrezza } from "./analisi-elenco";

const CF_RE = /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i;

/** Da una tabella di celle individua le colonne e produce le righe. */
export function tabellaInRighe(tabella: string[][]): RigaGrezza[] {
  const pulita = tabella.map((r) => r.map((c) => String(c ?? "").replace(/\u00a0/g, " ").trim()));
  const intest = pulita.findIndex((r) => r.some((c) => /codice\s*fiscale|^c\.?f\.?$/i.test(c)));
  let iCf = -1, iNom = -1, iFun = -1;
  if (intest >= 0) {
    const h = pulita[intest];
    iCf = h.findIndex((c) => /codice\s*fiscale|^c\.?f\.?$/i.test(c));
    iNom = h.findIndex((c) => /nome|nominativo/i.test(c) && !/fiscale/i.test(c));
    iFun = h.findIndex((c) => /funzione|reparto|ruolo|classe/i.test(c));
  }
  const dati = intest >= 0 ? pulita.slice(intest + 1) : pulita;
  const out: RigaGrezza[] = [];
  for (const r of dati) {
    const cfIdx = iCf >= 0 ? iCf : r.findIndex((c) => CF_RE.test(c));
    if (cfIdx < 0 || !r[cfIdx]) continue;
    const nomIdx = iNom >= 0 ? iNom : cfIdx === 0 ? 1 : 0;
    const funIdx = iFun >= 0 ? iFun : cfIdx + 1;
    out.push({ nominativo: r[nomIdx] ?? "", cf: r[cfIdx], funzione: r[funIdx] ?? "" });
  }
  return out;
}

async function leggiDocx(file: File): Promise<string[][]> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const doc = new DOMParser().parseFromString(value, "text/html");
  return Array.from(doc.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td,th")).map((td) => td.textContent ?? ""),
  );
}

async function leggiFoglio(file: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const righe: string[][] = [];
  for (const nome of wb.SheetNames) {
    const r = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[nome], { header: 1, raw: false, defval: "" });
    righe.push(...r.map((x) => x.map(String)));
  }
  return righe;
}

export async function leggiElenco(file: File): Promise<RigaGrezza[]> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (ext === "docx") return tabellaInRighe(await leggiDocx(file));
  if (["xlsx", "xls", "xlsm", "csv"].includes(ext)) return tabellaInRighe(await leggiFoglio(file));
  throw new Error("Formato non supportato: usa .docx, .xlsx, .xls, .xlsm o .csv");
}

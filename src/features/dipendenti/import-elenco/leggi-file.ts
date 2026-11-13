/*
 * File:      leggi-file.ts
 * Percorso:  src/features/dipendenti/import-elenco/leggi-file.ts
 * Creato:    03/11/2026
 * Legge nel browser un file .docx (tabella) o .xlsx/.xls/.xlsm/.csv e restituisce
 * le righe Nominativo / Cognome / Nome / Codice fiscale / Luogo e data di nascita / Funzione.
 * Nessun invio a server esterni.
 * Revisioni:
 *   rev 1 — 03/11/2026 14:30 — Prima stesura.
 *   rev 2 — 04/11/2026 11:00 — Esclusione colonne luogo/comune/nascita dal campo funzione.
 *   rev 3 — 05/11/2026 21:30 — Legge cognome e nome in colonne separate (anche con refusi come «cognme»),
 *            luogo e data di nascita (colonne separate o cella unica), date Excel lette come date vere
 *            (niente più ambiguità giorno/mese), CSV letto come testo (UTF-8 o Windows-1252),
 *            intestazioni ripetute tra un foglio e l'altro ignorate.
 *   rev 4 — 11/11/2026 — Colonne con la X per Preposto, Antincendio, Primo soccorso, Defibrillatore, Addetto all'evacuazione
 *            e Privacy (modello Excel scaricabile); la colonna «Classe di concorso / Profilo ATA» resta la colonna funzione.
 *   rev 5 — 12/11/2026 — Le 3 righe di esempio del modello (ROSSI, BIANCHI, VERDI) vengono ignorate nel file caricato.
 */
import type { RigaGrezza } from "./analisi-elenco";
import { scartaRigheEsempio } from "./righe-esempio";
import { FUNZIONI, cellaSegnata, type ChiaveFunzione, type FunzioniImport } from "./funzioni-sicurezza";

export type Cella = string | number | Date | null | undefined;

const CF_RE = /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i;
const INTEST_CF_RE = /codice\s*fiscale|^c\.?\s?f\.?$/i;
const DATA_NEL_TESTO_RE = /\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{2}-\d{2}/;

function testo(c: Cella): string {
  if (c instanceof Date) return "";
  return String(c ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

const due = (n: number) => String(n).padStart(2, "0");

function isoValida(a: number, m: number, g: number): string {
  if (a < 1900 || a > 2100 || m < 1 || m > 12 || g < 1) return "";
  const giorniDelMese = new Date(Date.UTC(a, m, 0)).getUTCDate();
  if (g > giorniDelMese) return "";
  return `${a}-${due(m)}-${due(g)}`;
}

/**
 * Converte una cella in data ISO (AAAA-MM-GG), oppure «» se non è una data riconoscibile.
 * Numeri = numero di serie di Excel (giorni dal 30/12/1899); testo = GG/MM/AAAA, GG-MM-AAAA, GG.MM.AAAA o AAAA-MM-GG.
 * Il testo è sempre letto giorno-mese-anno (formato italiano).
 */
export function dataIso(c: Cella): string {
  if (c instanceof Date) {
    return Number.isNaN(c.getTime()) ? "" : isoValida(c.getFullYear(), c.getMonth() + 1, c.getDate());
  }
  if (typeof c === "number") {
    if (!(c >= 1 && c < 100000)) return "";
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(c) * 86_400_000);
    return isoValida(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const t = testo(c);
  if (!t) return "";
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return isoValida(Number(m[3]), Number(m[2]), Number(m[1]));
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return isoValida(Number(m[1]), Number(m[2]), Number(m[3]));
  if (/^\d{5}$/.test(t)) return dataIso(Number(t));
  return "";
}

/** Da una cella unica «MANTOVA (MN) 29/10/1988» ricava luogo e data. */
export function separaLuogoData(c: Cella): { luogo: string; data: string } {
  const t = testo(c);
  const m = t.match(DATA_NEL_TESTO_RE);
  if (!m) return { luogo: t, data: "" };
  const luogo = t
    .replace(m[0], " ")
    .replace(/\s+il\s*$/i, "")
    .replace(/^[\s,;\-–/]+|[\s,;\-–/]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { luogo, data: dataIso(m[0]) };
}

type Colonne = {
  intest: number;
  iCf: number;
  iCognome: number;
  iNome: number;
  iNominativo: number;
  iLuogo: number;
  iData: number;
  iLuogoData: number;
  iFun: number;
  /** Colonne delle funzioni di sicurezza (X). Chiave assente = colonna non presente nel file. */
  iFunzioni: Partial<Record<ChiaveFunzione, number>>;
  /** Ricerca vecchio stile (nome|nominativo) usata quando non ci sono cognome e nome separati. */
  iNomVecchio: number;
};

function trovaColonne(pulita: string[][]): Colonne {
  const intest = pulita.findIndex((r) => r.some((c) => INTEST_CF_RE.test(c)));
  const vuote: Colonne = {
    intest, iCf: -1, iCognome: -1, iNome: -1, iNominativo: -1, iLuogo: -1, iData: -1, iLuogoData: -1, iFun: -1, iFunzioni: {}, iNomVecchio: -1,
  };
  if (intest < 0) return vuote;
  const h = pulita[intest] ?? [];
  const cerca = (re: RegExp, escludi?: RegExp) => h.findIndex((c) => re.test(c) && !(escludi && escludi.test(c)));

  const iNominativo = cerca(/nominativo|cognome\s*(e|\/)\s*nome|nome\s*(e|\/)\s*cognome/i);
  const iFunzioni: Partial<Record<ChiaveFunzione, number>> = {};
  for (const f of FUNZIONI) {
    const i = h.findIndex((c) => f.riconosciIntestazione.test(c));
    if (i >= 0) iFunzioni[f.chiave] = i;
  }
  return {
    intest,
    iCf: cerca(INTEST_CF_RE),
    iNominativo,
    // «cogn» basta per riconoscere anche «cognme», «cogmome», ecc.
    iCognome: h.findIndex((c, i) => /^cogn/i.test(c) && i !== iNominativo),
    iNome: cerca(/^nome$/i),
    iLuogoData: cerca(/luogo.*data|data.*luogo/i),
    iLuogo: cerca(/luogo|comune\s*di\s*nascita|nato\s*a/i, /data|resid/i),
    iData: cerca(/data.*nasc|nasc.*data|nato\s*il|^data$/i, /luogo/i),
    iFun: cerca(
      /funzione|reparto|ruolo|classe|mansione|profilo|personale/i,
      /luogo|nascita|comune|residenza|provincia/i,
    ),
    iFunzioni,
    iNomVecchio: cerca(/nome|nominativo/i, /fiscale/i),
  };
}

/** Da una tabella di celle individua le colonne e produce le righe. */
export function tabellaInRighe(tabella: Cella[][]): RigaGrezza[] {
  const pulita = tabella.map((r) => r.map(testo));
  const col = trovaColonne(pulita);
  const { intest } = col;

  const primo = intest >= 0 ? intest + 1 : 0;
  const out: RigaGrezza[] = [];

  for (let k = primo; k < pulita.length; k++) {
    const r = pulita[k] ?? [];
    const raw = tabella[k] ?? [];
    const cfIdx = col.iCf >= 0 ? col.iCf : r.findIndex((c) => CF_RE.test(c));
    if (cfIdx < 0 || !r[cfIdx]) continue;
    // Intestazione ripetuta (es. secondo foglio): non è una riga di dati.
    if (INTEST_CF_RE.test(r[cfIdx] ?? "")) continue;

    const separati = col.iCognome >= 0 && col.iNome >= 0;
    const nomIdx = col.iNomVecchio >= 0 ? col.iNomVecchio : cfIdx === 0 ? 1 : 0;
    let funIdx = col.iFun >= 0 ? col.iFun : cfIdx + 1;

    // Se l'intestazione della colonna era un luogo di nascita o residenza, non usarla come funzione
    if (intest >= 0 && col.iFun < 0 && funIdx < (pulita[intest]?.length ?? 0)) {
      const intestCol = pulita[intest]?.[funIdx] ?? "";
      if (/luogo|nascita|comune|residenza|prov/i.test(intestCol)) funIdx = -1;
    }

    const cognome = separati ? (r[col.iCognome] ?? "") : undefined;
    const nome = separati ? (r[col.iNome] ?? "") : undefined;

    let luogoNascita = col.iLuogo >= 0 ? (r[col.iLuogo] ?? "") : "";
    let dataNascita = col.iData >= 0 ? dataIso(raw[col.iData]) : "";
    if (col.iLuogoData >= 0) {
      const unica = separaLuogoData(raw[col.iLuogoData]);
      if (!luogoNascita) luogoNascita = unica.luogo;
      if (!dataNascita) dataNascita = unica.data;
    }

    const riga: RigaGrezza = {
      nominativo: separati ? `${cognome} ${nome}`.trim() : (r[nomIdx] ?? ""),
      cf: r[cfIdx] ?? "",
      funzione: funIdx >= 0 ? (r[funIdx] ?? "") : "",
    };
    if (separati) {
      riga.cognome = cognome ?? "";
      riga.nome = nome ?? "";
    }
    if (intest >= 0) {
      riga.luogoNascita = luogoNascita;
      riga.dataNascita = dataNascita;
    }
    const colonneFunzioni = Object.entries(col.iFunzioni) as [ChiaveFunzione, number][];
    if (colonneFunzioni.length > 0) {
      const funzioni: FunzioniImport = {};
      for (const [chiave, idx] of colonneFunzioni) {
        if (cellaSegnata(r[idx] ?? "")) funzioni[chiave] = true;
      }
      riga.funzioni = funzioni;
    }
    out.push(riga);
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

async function leggiFoglio(file: File): Promise<Cella[][]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const righe: Cella[][] = [];
  for (const nome of wb.SheetNames) {
    const ws = wb.Sheets[nome];
    if (!ws) continue;
    // raw: true → le date restano numeri di serie (interpretati da dataIso), senza formati ambigui.
    const r = XLSX.utils.sheet_to_json<Cella[]>(ws, { header: 1, raw: true, defval: "" });
    righe.push(...r);
  }
  return righe;
}

/** Testo di un file CSV: UTF-8, altrimenti Windows-1252 (Excel italiano). */
async function testoCsv(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

/** Legge un CSV con separatore «;», «,» o tabulazione e campi tra virgolette. */
export function csvInTabella(contenuto: string): string[][] {
  const prima = contenuto.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].reduce(
    (best, s) => (prima.split(s).length > prima.split(best).length ? s : best),
    ";",
  );
  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = "";
  let tra = false;
  for (let i = 0; i < contenuto.length; i++) {
    const ch = contenuto[i] as string;
    if (tra) {
      if (ch === '"' && contenuto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') tra = false;
      else campo += ch;
    } else if (ch === '"') tra = true;
    else if (ch === sep) { riga.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && contenuto[i + 1] === "\n") i++;
      riga.push(campo); campo = "";
      if (riga.some((c) => c.trim() !== "")) righe.push(riga);
      riga = [];
    } else campo += ch;
  }
  riga.push(campo);
  if (riga.some((c) => c.trim() !== "")) righe.push(riga);
  return righe;
}

export async function leggiElenco(file: File): Promise<RigaGrezza[]> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (ext === "docx") return scartaRigheEsempio(tabellaInRighe(await leggiDocx(file)));
  if (ext === "csv") return scartaRigheEsempio(tabellaInRighe(csvInTabella(await testoCsv(file))));
  if (["xlsx", "xls", "xlsm"].includes(ext)) return scartaRigheEsempio(tabellaInRighe(await leggiFoglio(file)));
  throw new Error("Formato non supportato: usa .docx, .xlsx, .xls, .xlsm o .csv");
}

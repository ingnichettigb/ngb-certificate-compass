/*
 * File:      esporta-tabella.test.ts
 * Percorso:  src/components/tabella-comune/esporta-tabella.test.ts
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 10:50 — Test del testo delle celle, del CSV, dei nomi (foglio e file), delle larghezze e del file .xlsx generato.
 */
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  creaExcel,
  larghezzeColonne,
  nomeBaseDa,
  nomeFoglio,
  testoCella,
  testoCsvTabella,
  type TabellaDaEsportare,
} from "./esporta-tabella";

/** Rilegge il file generato con exceljs (il Blob di jsdom si legge con FileReader). */
async function rileggi(blob: Blob): Promise<ExcelJS.Workbook> {
  const buf = await new Promise<ArrayBuffer>((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as ArrayBuffer);
    r.onerror = () => ko(r.error);
    r.readAsArrayBuffer(blob);
  });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(buf) as never);
  return wb;
}

const tabella: TabellaDaEsportare = {
  nomeBase: "prova",
  foglio: "01 Ruoli: [prova]/test",
  intestazioni: ["N", "Codice", "Ruolo", "Soglia", "Attivo"],
  righe: [
    [1, "01", 'Addetto "ASPP"; modulo B', 2.5, true],
    [2, null, "Preposto", undefined, false],
  ],
};

describe("testo delle celle e CSV", () => {
  it("vuoto, sì/no e numeri con la virgola", () => {
    expect(testoCella(null)).toBe("");
    expect(testoCella(undefined)).toBe("");
    expect(testoCella(true)).toBe("sì");
    expect(testoCella(false)).toBe("no");
    expect(testoCella(2.5)).toBe("2,5");
    expect(testoCella(12)).toBe("12");
    expect(testoCella("01")).toBe("01");
  });

  it("CSV con «;», campi tra virgolette e virgolette raddoppiate", () => {
    expect(testoCsvTabella(tabella)).toBe(
      [
        '"N";"Codice";"Ruolo";"Soglia";"Attivo"',
        '"1";"01";"Addetto ""ASPP""; modulo B";"2,5";"sì"',
        '"2";"";"Preposto";"";"no"',
      ].join("\r\n"),
    );
  });
});

describe("nomi e larghezze", () => {
  it("nome del foglio Excel: senza simboli vietati, al massimo 31 caratteri, mai vuoto", () => {
    expect(nomeFoglio(tabella.foglio)).toBe("01 Ruoli prova test");
    expect(nomeFoglio("x".repeat(40))).toHaveLength(31);
    expect(nomeFoglio("[]:*?")).toBe("Dati");
    expect(nomeFoglio(undefined)).toBe("Dati");
  });

  it("nome base del file: minuscolo, senza accenti né frecce", () => {
    expect(nomeBaseDa("Presenze → idoneità tecnica VVF")).toBe("presenze-idoneita-tecnica-vvf");
    expect(nomeBaseDa("Lavoratori → numero di RLS")).toBe("lavoratori-numero-di-rls");
  });

  it("larghezze adatte al contenuto, tra 8 e 50", () => {
    const w = larghezzeColonne({
      intestazioni: ["N", "Descrizione"],
      righe: [[1, "x".repeat(80)]],
    });
    expect(w[0]).toBe(8);
    expect(w[1]).toBe(50);
  });
});

describe("file Excel", () => {
  it("contiene intestazione in grassetto, riga bloccata, filtro, codici come testo, numeri veri e sì/no", async () => {
    const blob = await creaExcel(tabella);
    const wb = await rileggi(blob);
    const ws = wb.worksheets[0]!;

    expect(ws.name).toBe("01 Ruoli prova test");
    expect(ws.rowCount).toBe(3);
    expect(ws.getRow(1).values).toEqual([undefined, "N", "Codice", "Ruolo", "Soglia", "Attivo"]);
    expect(ws.getCell("A1").font?.bold).toBe(true);
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(ws.autoFilter).toBeTruthy();

    expect(ws.getCell("B2").value).toBe("01");
    expect(ws.getCell("C2").value).toBe('Addetto "ASPP"; modulo B');
    expect(ws.getCell("D2").value).toBe(2.5);
    expect(ws.getCell("E2").value).toBe("sì");
    expect(ws.getCell("B3").value).toBeNull();
    expect(ws.getCell("E3").value).toBe("no");
  });

  it("senza righe produce comunque il foglio con le sole intestazioni", async () => {
    const blob = await creaExcel({ nomeBase: "vuota", intestazioni: ["A", "B"], righe: [] });
    const wb = await rileggi(blob);
    expect(wb.worksheets[0]!.rowCount).toBe(1);
    expect(wb.worksheets[0]!.name).toBe("Dati");
  });
});

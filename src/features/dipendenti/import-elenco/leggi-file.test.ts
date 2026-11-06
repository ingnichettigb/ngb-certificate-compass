/*
 * File:      leggi-file.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/leggi-file.test.ts
 * Creato:    06/11/2026
 * Revisioni:
 *   rev 1 — 06/11/2026 08:20 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import { csvInTabella, dataIso, separaLuogoData, tabellaInRighe, type Cella } from "./leggi-file";

/** Numero di serie Excel di una data (giorni dal 30/12/1899). */
const serie = (a: number, m: number, g: number) => Math.round((Date.UTC(a, m - 1, g) - Date.UTC(1899, 11, 30)) / 86_400_000);

describe("date lette dal file", () => {
  it("numero di serie Excel → data ISO", () => {
    expect(dataIso(serie(1988, 10, 29))).toBe("1988-10-29");
    expect(dataIso(serie(2000, 2, 29))).toBe("2000-02-29");
  });
  it("testo italiano GG/MM/AAAA, mai MM/GG", () => {
    expect(dataIso("05/11/1988")).toBe("1988-11-05");
    expect(dataIso("29-10-1988")).toBe("1988-10-29");
    expect(dataIso("29.10.1988")).toBe("1988-10-29");
    expect(dataIso("1988-10-29")).toBe("1988-10-29");
  });
  it("date impossibili o vuote → vuoto", () => {
    expect(dataIso("31/02/1988")).toBe("");
    expect(dataIso("")).toBe("");
    expect(dataIso("abc")).toBe("");
  });
  it("luogo e data in una cella sola", () => {
    expect(separaLuogoData("MANTOVA (MN) 29/10/1988")).toEqual({ luogo: "MANTOVA (MN)", data: "1988-10-29" });
    expect(separaLuogoData("Roma, il 05/11/1988")).toEqual({ luogo: "Roma", data: "1988-11-05" });
    expect(separaLuogoData("Cremona")).toEqual({ luogo: "Cremona", data: "" });
  });
});

describe("tabella dell'elenco nuovi docenti", () => {
  const tabella: Cella[][] = [
    ["cognme", "nome", "codice fiscale", "luogo di nascita", "data di nascita", "reparto"],
    ["DOVA  ", "Gianluca", "DVOGLC80A01F205X", "MILANO", serie(1980, 1, 1), "docenti"],
    ["GRILLO", "SUSANNA VIRGINIA", "GRLSNN90A41F205U", "Cremona", "05/11/1990", "docenti"],
    ["cognome", "nome", "codice fiscale", "luogo di nascita", "data di nascita", "reparto"], // intestazione ripetuta (secondo foglio)
  ];
  const righe = tabellaInRighe(tabella);

  it("riconosce cognome (anche con il refuso «cognme») e nome come colonne separate", () => {
    expect(righe).toHaveLength(2);
    expect(righe[0]).toMatchObject({ cognome: "DOVA", nome: "Gianluca", cf: "DVOGLC80A01F205X" });
    expect(righe[1]).toMatchObject({ cognome: "GRILLO", nome: "SUSANNA VIRGINIA" });
  });
  it("legge luogo, data di nascita e reparto", () => {
    expect(righe[0]).toMatchObject({ luogoNascita: "MILANO", dataNascita: "1980-01-01", funzione: "docenti" });
    expect(righe[1]).toMatchObject({ luogoNascita: "Cremona", dataNascita: "1990-11-05" });
  });
  it("il nominativo mostra cognome e nome, non il solo nome", () => {
    expect(righe[0]?.nominativo).toBe("DOVA Gianluca");
  });
  it("accetta luogo e data in un'unica colonna", () => {
    const r = tabellaInRighe([
      ["Cognome", "Nome", "Codice fiscale", "Luogo e data di nascita"],
      ["ROSSI", "Mario", "RSSMRA80A01H501U", "ROMA (RM) 01/01/1980"],
    ]);
    expect(r[0]).toMatchObject({ luogoNascita: "ROMA (RM)", dataNascita: "1980-01-01" });
  });
  it("una colonna unica «Cognome e nome» resta un nominativo", () => {
    const r = tabellaInRighe([
      ["Cognome e nome", "Codice fiscale"],
      ["AUGELLO Fabio", "GLLFBA78T16I533R"],
    ]);
    expect(r[0]?.nominativo).toBe("AUGELLO Fabio");
    expect(r[0]?.cognome).toBeUndefined();
  });
});

describe("CSV", () => {
  it("separatore «;», virgolette e righe vuote", () => {
    const t = csvInTabella('Cognome;Nome;Codice fiscale\r\n"ROSSI";"MARIO ""JR""";RSSMRA80A01H501U\r\n\r\n');
    expect(t).toEqual([["Cognome", "Nome", "Codice fiscale"], ["ROSSI", 'MARIO "JR"', "RSSMRA80A01H501U"]]);
  });
});

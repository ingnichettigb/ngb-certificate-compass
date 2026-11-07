/*
 * File:      larghezze-colonne.test.ts
 * Percorso:  src/features/stampe/larghezze-colonne.test.ts
 * Data creaz: 07/11/2026
 * Verifica l'adattamento della colonna al contenuto più lungo, i limiti e la ripartizione in percentuale per la stampa.
 */
import { describe, expect, it } from "vitest";
import {
  dimensioniTabella, haLarghezzePersonalizzate, larghezzaAdattata, limitaLarghezza,
  LARGHEZZA_COLONNA_MAX, LARGHEZZA_COLONNA_MIN, LARGHEZZA_NUMERO, MARGINI_CELLA, SPAZIO_COMANDI_INTESTAZIONE,
} from "./larghezze-colonne";

/** Misura finta: 6 px a lettera, 7 in neretto. */
const misura = (t: string, grassetto: boolean) => t.length * (grassetto ? 7 : 6);
const celle = (...testi: string[]) => testi.map((testo) => ({ testo, grassetto: false }));

describe("larghezzaAdattata (doppio clic sul bordo)", () => {
  it("si adatta alla cella più lunga della colonna", () => {
    // «GNLGCR61L16C288A» = 16 lettere = 96 px; «Reparto» + comandi sta sotto.
    expect(larghezzaAdattata("Reparto", celle("A017", "GNLGCR61L16C288A", "ADSS"), misura)).toBe(96 + MARGINI_CELLA);
  });

  it("l'intestazione può andare a capo: conta solo la sua parola più lunga, più lo spazio dei comandi", () => {
    // «Mansione / Classe di concorso»: parola più lunga «Mansione»/«concorso» = 8 lettere in neretto = 56 px.
    expect(larghezzaAdattata("Mansione / Classe di concorso", celle("A017"), misura)).toBe(56 + SPAZIO_COMANDI_INTESTAZIONE + MARGINI_CELLA);
  });

  it("misura le celle in neretto con il neretto", () => {
    expect(larghezzaAdattata("Ore", [{ testo: "MANCA MANCA MANCA", grassetto: true }], misura)).toBe(17 * 7 + MARGINI_CELLA);
  });

  it("rispetta i limiti minimo e massimo", () => {
    // Anche con testi cortissimi restano liberi i comandi dell'intestazione (ordina e ✕).
    expect(larghezzaAdattata("X", celle("1"), () => 1)).toBe(1 + SPAZIO_COMANDI_INTESTAZIONE + MARGINI_CELLA);
    expect(larghezzaAdattata("X", celle("testo lunghissimo"), () => 5000)).toBe(LARGHEZZA_COLONNA_MAX);
    expect(limitaLarghezza(10)).toBe(LARGHEZZA_COLONNA_MIN);
    expect(limitaLarghezza(123.4)).toBe(123);
  });

  it("senza celle usa la parola più lunga dell'intestazione", () => {
    expect(larghezzaAdattata("Stato", [], misura)).toBe(5 * 7 + SPAZIO_COMANDI_INTESTAZIONE + MARGINI_CELLA);
  });
});

describe("dimensioniTabella", () => {
  it("usa le larghezze scelte e calcola le altre; in percentuale la somma fa 100", () => {
    const d = dimensioniTabella(["lavoratore", "cf", "reparto"], { lavoratore: 200 }, () => 100);
    expect(d.px).toEqual([200, 100, 100]);
    expect(d.totale).toBe(LARGHEZZA_NUMERO + 400);
    const somma = d.percentuali.numero + d.percentuali.colonne.reduce((a, b) => a + b, 0);
    expect(somma).toBeGreaterThan(99.9);
    expect(somma).toBeLessThan(100.1);
  });

  it("calcola la larghezza di riserva solo per le colonne senza larghezza propria", () => {
    const chiamate: string[] = [];
    dimensioniTabella(["lavoratore", "cf"], { lavoratore: 150 }, (c) => (chiamate.push(c), 90));
    expect(chiamate).toEqual(["cf"]);
  });
});

describe("haLarghezzePersonalizzate", () => {
  it("è vero solo se una colonna visibile ha una larghezza scelta", () => {
    expect(haLarghezzePersonalizzate(["cf", "reparto"], undefined)).toBe(false);
    expect(haLarghezzePersonalizzate(["cf", "reparto"], {})).toBe(false);
    expect(haLarghezzePersonalizzate(["cf", "reparto"], { nascita: 120 })).toBe(false);
    expect(haLarghezzePersonalizzate(["cf", "reparto"], { cf: 120 })).toBe(true);
  });
});

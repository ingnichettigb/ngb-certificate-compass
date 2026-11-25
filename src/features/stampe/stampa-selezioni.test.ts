/*
 * File:          stampa-selezioni.test.ts
 * Percorso:      src/features/stampe/stampa-selezioni.test.ts
 * Data creazione: 2026-11-21
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura: voceDelRuolo riconosce il ruolo per codice, per nome solo come ripiego.
 */
import { describe, expect, it } from "vitest";
import { voceDelRuolo } from "./stampa-selezioni";

describe("voceDelRuolo", () => {
  it("per codice, anche se il nome è stato cambiato", () => {
    expect(voceDelRuolo({ nome: "Squadra emergenza", macro_categoria: null, codice: "ADD-ANTINCENDIO" })).toBe("antincendio");
    expect(voceDelRuolo({ nome: "Cuore", macro_categoria: null, codice: "ADD-DAE" })).toBe("defibrillatore");
    expect(voceDelRuolo({ nome: "Soccorritori", macro_categoria: null, codice: "add-primo-soccorso" })).toBe("primoSoccorso");
    expect(voceDelRuolo({ nome: "Capo", macro_categoria: null, codice: "PREPOSTO" })).toBe("preposto");
  });

  it("senza codice resta il riconoscimento per nome", () => {
    expect(voceDelRuolo({ nome: "Addetto Antincendio", macro_categoria: null })).toBe("antincendio");
    expect(voceDelRuolo({ nome: "Preposto", macro_categoria: null })).toBe("preposto");
  });

  it("un ruolo di attrezzatura non corrisponde a nessuna voce", () => {
    expect(voceDelRuolo({ nome: "OPERATORE PLE", macro_categoria: "Attrezzature", codice: "OPER-PLE-II-831" })).toBeNull();
  });
});

/*
 * File:      regole-corso.test.ts
 * Percorso:  src/features/scadenze/regole-corso.test.ts
 * Creato:    12/11/2026
 * Verifica la tolleranza sul ritardo per tipo di corso e la sua applicazione nel raggruppamento degli attestati.
 * Revisioni:
 *   rev 1 — 12/11/2026 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { Attestato } from "@/lib/api";
import { eCorsoPrimoSoccorso, tolleranzaRitardoMesi } from "./regole-corso";
import { applicaScadenzaCicli, attestatiCorrenti } from "./preposti";

describe("tolleranzaRitardoMesi", () => {
  it("Primo Soccorso: 4 mesi (regola predefinita se la colonna non esiste ancora)", () => {
    expect(tolleranzaRitardoMesi({ macro_categoria: "Primo Soccorso" })).toBe(4);
    expect(eCorsoPrimoSoccorso({ macro_categoria: "Primo Soccorso" })).toBe(true);
  });
  it("il defibrillatore (BLSD) non è Primo Soccorso", () => {
    expect(eCorsoPrimoSoccorso({ macro_categoria: "Defibrillatore", nome_corso: "BLSD" })).toBe(false);
    expect(tolleranzaRitardoMesi({ macro_categoria: "Defibrillatore" })).toBeNull();
  });
  it("altri corsi: nessun limite", () => {
    expect(tolleranzaRitardoMesi({ macro_categoria: "Antincendio" })).toBeNull();
    expect(tolleranzaRitardoMesi(null)).toBeNull();
  });
  it("se la colonna del catalogo esiste vale il suo dato (NULL = nessun limite, numero = mesi)", () => {
    expect(tolleranzaRitardoMesi({ macro_categoria: "Primo Soccorso", tolleranza_ritardo_mesi: null } as never)).toBeNull();
    expect(tolleranzaRitardoMesi({ macro_categoria: "Antincendio", tolleranza_ritardo_mesi: 2 } as never)).toBe(2);
  });
});

describe("applicaScadenzaCicli / attestatiCorrenti", () => {
  const a = (id: string, livello: string, data: string, ore: number): Attestato =>
    ({
      id, dipendente_id: "d1", data_corso: data, ore_dichiarate: ore, stato_validazione: "Approvato", data_scadenza_calcolata: null,
      tipi_corso: { macro_categoria: "Antincendio", livello_specifico: livello, durata_validita_anni: 5, ore_minime_legge: ore },
    }) as unknown as Attestato;

  it("un Base rinnovato da un aggiornamento è «superato» e non compare tra gli attestati correnti", () => {
    const tutti = [a("b", "Base", "2018-01-10", 8), a("u", "Aggiornamento", "2022-06-01", 5)];
    const valutati = applicaScadenzaCicli(tutti, new Date(2024, 0, 1));
    expect(valutati.find((x) => x.id === "b")?.superato).toBe(true);
    expect(valutati.find((x) => x.id === "u")?.superato).toBeUndefined();
    expect(attestatiCorrenti(tutti, new Date(2024, 0, 1)).map((x) => x.id)).toEqual(["u"]);
    // stessa scadenza del ciclo per tutto il gruppo: 2028, non quella (2023) del solo Base
    expect(valutati.every((x) => x.data_scadenza_calcolata === "2028-01-10")).toBe(true);
  });
});

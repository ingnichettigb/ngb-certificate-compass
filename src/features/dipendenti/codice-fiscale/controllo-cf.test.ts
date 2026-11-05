/*
 * File:      controllo-cf.test.ts
 * Percorso:  src/features/dipendenti/codice-fiscale/controllo-cf.test.ts
 * Data creazione: 05/11/2026
 * Revisioni:
 *   - Rev 1 — 05/11/2026 17:50 — Casi presi dal foglio di verifica Filocamo.
 */
import { describe, expect, it } from "vitest";
import { analizzaCodiceFiscale } from "./controllo-cf";

describe("analizzaCodiceFiscale", () => {
  it("accetta codici corretti", () => {
    expect(analizzaCodiceFiscale("RSSMRA80A01H501U").valido).toBe(true);
    expect(analizzaCodiceFiscale("BNCSFN62L47D837Q").valido).toBe(true);
  });
  it("segnala carattere di controllo errato", () => {
    const e = analizzaCodiceFiscale("BNCSFN62L47D837F");
    expect(e.valido).toBe(false);
    expect(e.problemi.join()).toContain('atteso "Q"');
  });
  it("segnala giorno non valido", () => {
    expect(analizzaCodiceFiscale("RSSMTT63T92B607B").problemi.join()).toContain("Giorno");
  });
  it("segnala lunghezza errata", () => {
    expect(analizzaCodiceFiscale("RSSMRA80").valido).toBe(false);
  });
  it("campo vuoto non genera avvisi", () => {
    expect(analizzaCodiceFiscale("").valido).toBe(true);
  });
});

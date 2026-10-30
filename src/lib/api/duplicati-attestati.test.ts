/*
 * File:           duplicati-attestati.test.ts
 * Percorso:       src/lib/api/duplicati-attestati.test.ts
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 10:30): Regole numero univoco e doppioni.
 */
import { describe, expect, it } from "vitest";
import { generaNumeroAttestato, trovaDuplicati } from "./duplicati-attestati";

describe("numero attestato", () => {
  it("formato AAMMGG-CODICE", () => {
    expect(generaNumeroAttestato("2024-09-30", "SIC-GEN-04")).toBe("240930-SIC-GEN-04");
  });
});

describe("doppioni", () => {
  const base = { dipendente_id: "d1", data_corso: "2024-09-30", stato_validazione: "Approvato" };
  it("stesso lavoratore, corso e data è doppione", () => {
    const m = trovaDuplicati([{ ...base, id: "a", tipo_corso_id: "gen" }, { ...base, id: "b", tipo_corso_id: "gen" }]);
    expect(m.get("a")).toBe(2);
  });
  it("corsi sdoppiati (corsi diversi stessa data) non sono doppioni", () => {
    const m = trovaDuplicati([{ ...base, id: "a", tipo_corso_id: "gen" }, { ...base, id: "b", tipo_corso_id: "spe" }]);
    expect(m.size).toBe(0);
  });
});

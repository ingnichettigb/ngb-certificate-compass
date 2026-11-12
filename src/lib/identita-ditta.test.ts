/*
 * File: identita-ditta.test.ts
 * Percorso: src/lib/identita-ditta.test.ts
 * Data creazione: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 06:53 — Dati condivisi e cancellazione logo senza ripristino del marchio precedente.
 */
import { describe, expect, it } from "vitest";
import { byteLogoDitta, logoDitta, nomeDitta } from "./identita-ditta";

describe("identità dall'anagrafica", () => {
  it("usa la ragione sociale salvata invece del marchio fisso", () => {
    expect(nomeDitta({ ragione_sociale: "Istituto prova" })).toBe("Istituto prova");
  });
  it("il logo cancellato resta assente", () => {
    expect(logoDitta({ logo_data_url: null })).toBeNull();
    expect(byteLogoDitta({ logo_data_url: null })).toBeNull();
  });
  it("riusa il logo PNG incorporato nei PDF", () => {
    const logo = "data:image/png;base64,iVBORw==";
    expect(logoDitta({ logo_data_url: logo })).toBe(logo);
    expect([...byteLogoDitta({ logo_data_url: logo }) ?? []]).toEqual([137, 80, 78, 71]);
  });
});
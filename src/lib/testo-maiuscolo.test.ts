/*
 * File:      testo-maiuscolo.test.ts
 * Percorso:  src/lib/testo-maiuscolo.test.ts
 * Creato:    05/11/2026
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import { inMaiuscolo, maiuscolo } from "./testo-maiuscolo";

describe("testo in maiuscolo", () => {
  it("pulisce e mette in maiuscolo per il salvataggio", () => {
    expect(maiuscolo("  Giuseppina   Donatella ")).toBe("GIUSEPPINA DONATELLA");
    expect(maiuscolo("DOVA  ")).toBe("DOVA");
    expect(maiuscolo("Sant'Omero (TE)")).toBe("SANT'OMERO (TE)");
    expect(maiuscolo(null)).toBe("");
  });
  it("rispetta gli accenti italiani", () => {
    expect(maiuscolo("Niccolò d'Èste")).toBe("NICCOLÒ D'ÈSTE");
  });
  it("in digitazione non toglie lo spazio finale", () => {
    expect(inMaiuscolo("di ")).toBe("DI ");
  });
});

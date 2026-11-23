/*
 * File:           codici-ruoli.test.ts
 * Percorso:       src/lib/api/codici-ruoli.test.ts
 * Data creazione: 2026-11-23
 * Revisioni:
 *   - Rev 1 (2026-11-23 10:40): Regola DL-RSPP: fino a 15 lavoratori sì, dal 16° no.
 */
import { describe, expect, it } from "vitest";
import { dlRsppConsentito } from "./codici-ruoli";

describe("DL-RSPP e soglia dei 15 lavoratori", () => {
  it("15 lavoratori: consentito", () => expect(dlRsppConsentito(15)).toBe(true));
  it("16 lavoratori: non consentito", () => expect(dlRsppConsentito(16)).toBe(false));
});

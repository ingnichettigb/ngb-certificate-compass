/*
 * File: stato-lavoratori.test.ts
 * Percorso: src/features/stampe/stato-lavoratori.test.ts
 * Data creazione: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 06:53 — Filtro cessati e compatibilità preset.
 */
import { expect, it } from "vitest";
import { FILTRI_INIZIALI, includeLavoratorePerStato } from "./stampa-tipi";

it("solo cessati esclude chi è in forza anche con un vecchio flag acceso", () => {
  const f = { ...FILTRI_INIZIALI, statoLavoratori: "solo_cessati" as const, includiCessati: true };
  expect(includeLavoratorePerStato("cessato", f)).toBe(true);
  expect(includeLavoratorePerStato("in_forza", f)).toBe(false);
});
it("i vecchi preset includi cessati continuano a includerli", () => {
  expect(includeLavoratorePerStato("cessato", { ...FILTRI_INIZIALI, includiCessati: true })).toBe(true);
});
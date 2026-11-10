/*
 * File:      numerazione-carte.test.ts
 * Percorso:  src/features/stampe/numerazione-carte.test.ts
 * Data creaz: 10/11/2026
 * Revisioni:
 *   rev 1 — 10/11/2026 18:00 — Verifica la sequenza 01–05 di «Anagrafica e organico» e la numerazione continua senza buchi.
 */
import { describe, expect, it } from "vitest";
import { STAMPE_PREDEFINITE } from "./stampe-predefinite";
import { ID_TAVOLA_A3, numeriCarte, tutteLeCarte } from "./numerazione-carte";

describe("numerazione delle carte", () => {
  const num = numeriCarte();

  it("Anagrafica e organico: 01 tavola A3, 02 squadre, 03 registro, 04 per settore, 05 per funzioni", () => {
    expect(num[ID_TAVOLA_A3]).toBe("01");
    expect(num["organigramma-squadre"]).toBe("02");
    expect(num["anagrafica-tutti"]).toBe("03");
    expect(num["anagrafica-settori"]).toBe("04");
    expect(num["anagrafica-gruppi"]).toBe("05");
  });

  it("Scadenze parte dalla 06 e Completati segue", () => {
    expect(num["scadenze-tutte"]).toBe("06");
    expect(num["scadenze-privacy"]).toBe("12");
    expect(num["completati-corso-base"]).toBe("13");
  });

  it("numeri continui e univoci: nessun buco, tutte le stampe predefinite comprese", () => {
    const carte = tutteLeCarte();
    expect(carte).toHaveLength(STAMPE_PREDEFINITE.length + 1);
    expect(carte.map((c) => num[c.id])).toEqual(carte.map((_, i) => String(i + 1).padStart(2, "0")));
  });
});

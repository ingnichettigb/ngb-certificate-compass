/*
 * File:      numerazione-carte.test.ts
 * Percorso:  src/features/stampe/numerazione-carte.test.ts
 * Data creaz: 10/11/2026
 * Revisioni:
 *   rev 1 — 10/11/2026 18:00 — Verifica la sequenza 01–05 di «Anagrafica e organico» e la numerazione continua senza buchi.
 *   rev 2 — 11/11/2026 17:30 — Sequenza 01–06 con la nuova carta 04 «Registro lavoratori cessati»; Scadenze dalla 07, Completati dalla 14.
 */
import { describe, expect, it } from "vitest";
import { STAMPE_PREDEFINITE } from "./stampe-predefinite";
import { ID_TAVOLA_A3, numeriCarte, tutteLeCarte } from "./numerazione-carte";

describe("numerazione delle carte", () => {
  const num = numeriCarte();

  it("Anagrafica e organico: 01 tavola A3, 02 squadre, 03 registro, 04 cessati, 05 per settore, 06 per funzioni", () => {
    expect(num[ID_TAVOLA_A3]).toBe("01");
    expect(num["organigramma-squadre"]).toBe("02");
    expect(num["anagrafica-tutti"]).toBe("03");
    expect(num["anagrafica-cessati"]).toBe("04");
    expect(num["anagrafica-settori"]).toBe("05");
    expect(num["anagrafica-gruppi"]).toBe("06");
  });

  it("Scadenze parte dalla 07 e Completati segue", () => {
    expect(num["scadenze-tutte"]).toBe("07");
    expect(num["scadenze-privacy"]).toBe("13");
    expect(num["completati-corso-base"]).toBe("14");
  });

  it("numeri continui e univoci: nessun buco, tutte le stampe predefinite comprese", () => {
    const carte = tutteLeCarte();
    expect(carte).toHaveLength(STAMPE_PREDEFINITE.length + 1);
    expect(carte.map((c) => num[c.id])).toEqual(carte.map((_, i) => String(i + 1).padStart(2, "0")));
  });
});

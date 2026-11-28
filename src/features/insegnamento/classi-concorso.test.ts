/*
 * File:      classi-concorso.test.ts
 * Percorso:  src/features/insegnamento/classi-concorso.test.ts
 * Data creaz: 28/11/2026
 * Revisioni:
 *   rev 1 — 28/11/2026 10:30 — Il codice della classe è sempre accompagnato dalla denominazione.
 */
import { describe, expect, it } from "vitest";
import { etichettaClasse, impostaCatalogoClassi } from "./classi-concorso";

describe("etichettaClasse", () => {
  it("codice + denominazione, solo codice se sconosciuto, vuoto se manca", () => {
    impostaCatalogoClassi([{ codice: "A027", denominazione: "Matematica e fisica" }]);
    expect(etichettaClasse("a027")).toBe("a027 — Matematica e fisica");
    expect(etichettaClasse("A027")).toBe("A027 — Matematica e fisica");
    expect(etichettaClasse("Z99")).toBe("Z99");
    expect(etichettaClasse(null)).toBe("");
  });
});

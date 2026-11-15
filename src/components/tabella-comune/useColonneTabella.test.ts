/*
 * File:      useColonneTabella.test.ts
 * Percorso:  src/components/tabella-comune/useColonneTabella.test.ts
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 21:50 — Ordinamento a 3 clic e allineamento ordine colonne.
 */
import { describe, expect, it } from "vitest";
import { allineaOrdine, ordinaRighe, prossimoOrdinamento } from "./useColonneTabella";

describe("tabella comune", () => {
  it("1° clic A→Z, 2° Z→A, 3° ordine originale", () => {
    const a = prossimoOrdinamento(null, "nome");
    expect(a).toEqual({ chiave: "nome", verso: "asc" });
    const b = prossimoOrdinamento(a, "nome");
    expect(b).toEqual({ chiave: "nome", verso: "desc" });
    expect(prossimoOrdinamento(b, "nome")).toBeNull();
  });
  it("ordina in modo naturale e inverte", () => {
    const r = [{ c: "B10" }, { c: "b2" }, { c: "A1" }];
    expect(ordinaRighe(r, { chiave: "c", verso: "asc" }).map((x) => x.c)).toEqual(["A1", "b2", "B10"]);
    expect(ordinaRighe(r, { chiave: "c", verso: "desc" }).map((x) => x.c)).toEqual(["B10", "b2", "A1"]);
    expect(ordinaRighe(r, null)).toBe(r);
  });
  it("ordine salvato: nuove colonne in coda, sparite rimosse", () => {
    expect(allineaOrdine(["c", "x", "a"], ["a", "b", "c"])).toEqual(["c", "a", "b"]);
  });
});

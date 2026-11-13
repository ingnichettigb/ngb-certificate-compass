/*
 * File: aiuto-testi.test.ts
 * Percorso: src/components/ui/aiuto-testi.test.ts
 * Data creazione: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 09:55 — Fumetto sempre dentro lo schermo.
 */
import { describe, expect, it } from "vitest";
import { posizionaFumetto } from "./aiuto-testi";

describe("posizionaFumetto", () => {
  it("bottone sul bordo destro: il fumetto non esce a destra", () => {
    const p = posizionaFumetto({ left: 600, top: 10, bottom: 40, width: 30 }, 200, 40, 638, 590);
    expect(p.left + 200).toBeLessThanOrEqual(638 - 12);
  });
  it("bottone in fondo: il fumetto va sopra e resta visibile", () => {
    const p = posizionaFumetto({ left: 100, top: 560, bottom: 585, width: 30 }, 200, 40, 638, 590);
    expect(p.top + 40).toBeLessThanOrEqual(590 - 12);
    expect(p.top).toBeLessThan(560);
  });
  it("bottone sul bordo sinistro: almeno 12 px dal bordo", () => {
    expect(posizionaFumetto({ left: 0, top: 10, bottom: 40, width: 20 }, 200, 40, 638, 590).left).toBe(12);
  });
});

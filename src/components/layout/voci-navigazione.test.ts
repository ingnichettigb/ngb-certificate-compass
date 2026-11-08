/*
 * File:      voci-navigazione.test.ts
 * Percorso:  src/components/layout/voci-navigazione.test.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Controlli sulla barra di navigazione: voci uniche, rotte esistenti, modulo pubblico senza barra.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GRUPPI_NAV, mostraBarra } from "./voci-navigazione";

const voci = GRUPPI_NAV.flat();

describe("voci della barra di navigazione", () => {
  it("non ripete nessuna pagina", () => {
    const rotte = voci.map((v) => v.to);
    expect(new Set(rotte).size).toBe(rotte.length);
  });

  it("ogni voce ha etichetta e suggerimento", () => {
    for (const v of voci) {
      expect(v.label.trim()).not.toBe("");
      expect(v.descrizione.trim().length).toBeGreaterThan(15);
    }
  });

  it("punta solo a rotte registrate nell'applicazione", () => {
    const albero = readFileSync("src/routeTree.gen.ts", "utf8");
    for (const v of voci) {
      expect(albero, `rotta ${v.to}`).toContain(`'${v.to}'`);
    }
  });

  it("contiene tutte le pagine del gestionale", () => {
    const rotte = voci.map((v) => v.to);
    for (const r of ["/", "/carica", "/operatore", "/massivo", "/hr", "/dipendenti", "/scadenze", "/stampe"]) {
      expect(rotte).toContain(r);
    }
  });

  it("apre in una nuova scheda solo il modulo pubblico", () => {
    expect(voci.filter((v) => v.nuovaScheda).map((v) => v.to)).toEqual(["/carica"]);
  });
});

describe("mostraBarra", () => {
  it("è nascosta nel modulo pubblico dei lavoratori", () => {
    expect(mostraBarra("/carica")).toBe(false);
    expect(mostraBarra("/carica/")).toBe(false);
  });

  it("è visibile in tutte le altre pagine", () => {
    for (const p of ["/", "/hr", "/massivo", "/dipendenti", "/scadenze", "/stampe", "/operatore"]) {
      expect(mostraBarra(p), p).toBe(true);
    }
  });
});

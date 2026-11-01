/*
 * File:          antincendio-vvff.test.ts
 * Percorso:      src/features/tipi-corso/antincendio-vvff.test.ts
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 11:00): I sei corsi antincendio VVF (FOR1/2/3 e aggiornamenti) sono standard protetti e finiscono
 *     nel gruppo Antincendio; i vecchi codici ANT-L… non compaiono più.
 */
import { describe, expect, it } from "vitest";
import { CODICI_STANDARD_PROTETTI, assegnaGruppoArgomento, isCorsoProtetto } from "./tipi-raggruppamento";

const NUOVI = ["VFF-FOR1-4", "VFF-FOR1A2", "VFF-FOR2-8", "VFF-FOR2A5", "VFF-FOR316", "VFF-FOR3A8"];
const VECCHI = ["ANT-L1B-04", "ANT-L1A-02", "ANT-L2B-08", "ANT-L2A-05"];

describe("antincendio: codici VVF", () => {
  it("i sei codici VVF sono corsi standard protetti", () => {
    for (const c of NUOVI) expect(isCorsoProtetto({ codice: c })).toBe(true);
  });

  it("i vecchi codici ANT-L… non sono più nell'elenco dei protetti", () => {
    for (const c of VECCHI) expect(CODICI_STANDARD_PROTETTI.has(c)).toBe(false);
  });

  it("i corsi VVF stanno nel gruppo Antincendio", () => {
    for (const c of NUOVI) {
      const g = assegnaGruppoArgomento({ codice: c, nome_corso: "x", macro_categoria: "Antincendio VVFF" });
      expect(g.chiave).toMatch(/antincendio/i);
    }
  });
});

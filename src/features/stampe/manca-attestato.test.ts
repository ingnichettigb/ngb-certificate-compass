/*
 * File: manca-attestato.test.ts — Percorso: src/features/stampe/manca-attestato.test.ts
 * Data creazione: 23/11/2026 — rev 1 (23/11/2026 12:05): Stato con «Manca attestato» se manca il file.
 */
import { describe, expect, it } from "vitest";
import { cella, type RigaStampa } from "./dati-stampa";

const riga = (extra: Partial<RigaStampa>) => ({ stato: "valido", mancanti: [], scadenza: null, ...extra }) as unknown as RigaStampa;

describe("Manca attestato", () => {
  it("corso registrato senza file: Stato riporta «Manca attestato»", () => {
    expect(cella(riga({ senzaFile: true }), "stato")).toBe("Valido – Manca attestato");
  });
  it("con file collegato: nessun avviso", () => {
    expect(cella(riga({}), "stato")).toBe("Valido");
  });
});

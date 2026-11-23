/*
 * File: manca-attestato.test.ts — Percorso: src/features/stampe/manca-attestato.test.ts
 * Data creazione: 23/11/2026 — rev 1 (23/11/2026 12:05): Stato con «Manca attestato» se manca il file.
 * rev 2 (23/11/2026 13:35): senza file lo Stato è «File Attestato mancante», mai «Valido»; stato del database coerente col file.
 */
import { describe, expect, it } from "vitest";
import { cella, type RigaStampa } from "./dati-stampa";
import { statoPerFile, statoRegistrato } from "@/lib/api/attestati";

const riga = (extra: Partial<RigaStampa>) => ({ stato: "valido", mancanti: [], scadenza: null, ...extra }) as unknown as RigaStampa;

describe("File Attestato mancante", () => {
  it("corso registrato senza file: Stato «File Attestato mancante», non «Valido»", () => {
    expect(cella(riga({ senzaFile: true }), "stato")).toBe("File Attestato mancante");
  });
  it("con file collegato: Valido", () => {
    expect(cella(riga({}), "stato")).toBe("Valido");
  });
  it("database: Approvato senza file diventa «File Attestato mancante», col file torna Approvato", () => {
    expect(statoPerFile("Approvato", null)).toBe("File Attestato mancante");
    expect(statoPerFile("File Attestato mancante", "a.pdf")).toBe("Approvato");
    expect(statoPerFile("Respinto", null)).toBe("Respinto");
  });
  it("il corso senza file resta registrato per scadenze e ruoli", () => {
    expect(statoRegistrato("File Attestato mancante")).toBe(true);
    expect(statoRegistrato("In attesa")).toBe(false);
  });
});

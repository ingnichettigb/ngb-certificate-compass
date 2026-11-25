/*
 * File:          condizioni-regole.test.ts
 * Percorso:      src/features/dipendenti/matrice/condizioni-regole.test.ts
 * Data creazione: 2026-11-21
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import type { RuoloSicurezza, TipoCorso } from "@/lib/api";
import { corsoApplicabile, regolaApplicabile } from "./condizioni-regole";
import { isCorsoObbligatorioPerDipendente } from "./mappatura-ruoli-corsi";

let n = 0;
const reg = (ruolo_codice: string, parametro: string, valore: string, corso_base: string | null, corso_aggiornamento: string | null): RegolaRuoloCorso => ({
  id: `g${++n}`, ruolo_codice, parametro, valore, corso_base, corso_aggiornamento, ordine: n,
});
// Le righe reali del Lavoratore nella Tabella 02
const regole = [
  reg("LAVORATORE", "nessuno", "—", "SIC-GEN-04", null),
  reg("LAVORATORE", "rischio ATECO", "basso", "SIC-SPE-04", "SIC-AGG-06"),
  reg("LAVORATORE", "rischio ATECO", "medio", "SIC-SPE-08", "SIC-AGG-06"),
  reg("LAVORATORE", "rischio ATECO", "alto", "SIC-SPE-12", "SIC-AGG-06"),
  reg("ADD-DAE", "nessuno", "—", "BLS-BAS-05", "BLS-AGG-05"),
];

describe("regolaApplicabile", () => {
  it("«nessuno» vale sempre", () => {
    expect(regolaApplicabile(regole[0]!, { rischioDitta: "alto" })).toBe(true);
  });
  it("«rischio ATECO» vale solo se il valore è il rischio della ditta", () => {
    expect(regolaApplicabile(regole[2]!, { rischioDitta: "medio" })).toBe(true);
    expect(regolaApplicabile(regole[2]!, { rischioDitta: "alto" })).toBe(false);
  });
  it("rischio non impostato: non si sceglie, valgono tutte (come prima)", () => {
    expect(regolaApplicabile(regole[1]!, {})).toBe(true);
    expect(regolaApplicabile(regole[3]!, { rischioDitta: null })).toBe(true);
  });
  it("il confronto non bada a maiuscole e spazi", () => {
    expect(regolaApplicabile({ ...regole[2]!, parametro: " Rischio ateco ", valore: "MEDIO " }, { rischioDitta: "medio" })).toBe(true);
  });
});

describe("corsoApplicabile", () => {
  it("la formazione specifica è dovuta solo per il rischio della ditta", () => {
    const c = { rischioDitta: "medio" as const };
    expect(corsoApplicabile(regole, "SIC-SPE-08", c)).toBe(true);
    expect(corsoApplicabile(regole, "SIC-SPE-04", c)).toBe(false);
    expect(corsoApplicabile(regole, "SIC-SPE-12", c)).toBe(false);
  });
  it("l'aggiornamento citato da tutte le righe del rischio è sempre dovuto", () => {
    for (const r of ["basso", "medio", "alto"] as const) expect(corsoApplicabile(regole, "SIC-AGG-06", { rischioDitta: r })).toBe(true);
  });
  it("corsi senza condizione e corsi che nessuna regola cita non sono toccati", () => {
    expect(corsoApplicabile(regole, "SIC-GEN-04", { rischioDitta: "basso" })).toBe(true);
    expect(corsoApplicabile(regole, "BLS-BAS-05", { rischioDitta: "basso" })).toBe(true);
    expect(corsoApplicabile(regole, "COVID19-02", { rischioDitta: "basso" })).toBe(true);
  });
});

describe("isCorsoObbligatorioPerDipendente con il rischio della ditta", () => {
  const lavoratore = { id: "r-lav", nome: "Lavoratore", codice: "LAVORATORE", attivo: true, obbligatorio_tutti: true, ordine: 1 } as unknown as RuoloSicurezza;
  const corso = (codice: string) => ({ id: codice, codice, nome_corso: codice, macro_categoria: "Sicurezza Lavoratori" }) as unknown as TipoCorso;
  const dovuto = (codice: string, rischio: "basso" | "medio" | "alto" | null) =>
    isCorsoObbligatorioPerDipendente("d1", corso(codice), [lavoratore], new Set(), null, regole, { rischioDitta: rischio });

  it("ditta a rischio medio: base, specifica da 8 ore e aggiornamento sì; 4 e 12 ore no", () => {
    expect(dovuto("SIC-GEN-04", "medio")).toBe(true);
    expect(dovuto("SIC-SPE-08", "medio")).toBe(true);
    expect(dovuto("SIC-AGG-06", "medio")).toBe(true);
    expect(dovuto("SIC-SPE-04", "medio")).toBe(false);
    expect(dovuto("SIC-SPE-12", "medio")).toBe(false);
  });
  it("cambiando il rischio cambia il corso dovuto", () => {
    expect(dovuto("SIC-SPE-12", "alto")).toBe(true);
    expect(dovuto("SIC-SPE-08", "alto")).toBe(false);
  });
  it("rischio non impostato: restano tutti dovuti, come prima", () => {
    for (const c of ["SIC-SPE-04", "SIC-SPE-08", "SIC-SPE-12"]) expect(dovuto(c, null), c).toBe(true);
  });
});

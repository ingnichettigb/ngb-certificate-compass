/*
 * File:          formazione-lavoratore.test.ts
 * Percorso:      src/features/dipendenti/formazione-lavoratore.test.ts
 * Data creazione: 2026-11-21
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { Attestato } from "@/lib/api/attestati";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { corsiSvoltiDa, valutaFormazioneLavoratore } from "./formazione-lavoratore";

let n = 0;
const reg = (ruolo_codice: string, parametro: string, valore: string, corso_base: string | null, corso_aggiornamento: string | null): RegolaRuoloCorso => ({
  id: `g${++n}`, ruolo_codice, parametro, valore, corso_base, corso_aggiornamento, ordine: n,
});
const regole = [
  reg("LAVORATORE", "nessuno", "—", "SIC-GEN-04", null),
  reg("LAVORATORE", "rischio ATECO", "basso", "SIC-SPE-04", "SIC-AGG-06"),
  reg("LAVORATORE", "rischio ATECO", "medio", "SIC-SPE-08", "SIC-AGG-06"),
  reg("LAVORATORE", "rischio ATECO", "alto", "SIC-SPE-12", "SIC-AGG-06"),
  reg("ADD_DAE", "nessuno", "—", "BLS-BAS-05", "BLS-AGG-05"),
];
const valuta = (rischio: "basso" | "medio" | "alto" | null, ...svolti: string[]) =>
  valutaFormazioneLavoratore({ regole, contesto: { rischioDitta: rischio }, corsiSvolti: new Set(svolti) });

describe("valutaFormazioneLavoratore", () => {
  it("completa: corso base e specifica del rischio della ditta", () => {
    const e = valuta("medio", "SIC-GEN-04", "SIC-SPE-08");
    expect(e.completa).toBe(true);
    expect(e.specifica).toEqual({ attesa: "SIC-SPE-08", stato: "presente", trovata: "SIC-SPE-08" });
    expect(e.motivo).toBe("Formazione lavoratore completa");
  });

  it("il corso base viene dalla Tabella 02, senza codici scritti nel programma", () => {
    expect(valuta("medio").base.attesi).toEqual(["SIC-GEN-04"]);
  });

  it("manca il corso base", () => {
    const e = valuta("medio", "SIC-SPE-08");
    expect(e.completa).toBe(false);
    expect(e.base.mancanti).toEqual(["SIC-GEN-04"]);
    expect(e.motivo).toContain("manca il corso base");
  });

  it("manca la formazione specifica", () => {
    const e = valuta("alto", "SIC-GEN-04");
    expect(e.completa).toBe(false);
    expect(e.specifica.stato).toBe("mancante");
    expect(e.specifica.attesa).toBe("SIC-SPE-12");
  });

  it("specifica di un altro grado: non si accetta da sola, decide l'operatore", () => {
    const e = valuta("medio", "SIC-GEN-04", "SIC-SPE-12");
    expect(e.completa).toBe(false);
    expect(e.specifica).toEqual({ attesa: "SIC-SPE-08", stato: "diversa", trovata: "SIC-SPE-12" });
    expect(e.motivo).toContain("decide l'operatore");
  });

  it("anche con una specifica più bassa è «diversa»", () => {
    expect(valuta("alto", "SIC-GEN-04", "SIC-SPE-04").specifica.stato).toBe("diversa");
  });

  it("se c'è quella giusta, un altro corso specifico in più non cambia l'esito", () => {
    expect(valuta("medio", "SIC-GEN-04", "SIC-SPE-08", "SIC-SPE-12").specifica.stato).toBe("presente");
  });

  it("rischio non impostato: la specifica non è valutabile e il prerequisito non è soddisfatto", () => {
    const e = valuta(null, "SIC-GEN-04", "SIC-SPE-08");
    expect(e.specifica.stato).toBe("non-valutabile");
    expect(e.completa).toBe(false);
    expect(e.motivo).toContain("non impostato");
  });

  it("senza regole del Lavoratore nella tabella non si può dire completa", () => {
    const e = valutaFormazioneLavoratore({ regole: [], contesto: { rischioDitta: "medio" }, corsiSvolti: new Set(["SIC-GEN-04"]) });
    expect(e.completa).toBe(false);
  });
});

describe("corsiSvoltiDa", () => {
  const att = (dipendente_id: string, codice: string | null, stato: string) =>
    ({ id: `${dipendente_id}${codice}${stato}`, dipendente_id, stato_validazione: stato, tipi_corso: codice ? { codice } : null }) as unknown as Attestato;
  it("solo attestati approvati del lavoratore, con codice in maiuscolo", () => {
    const s = corsiSvoltiDa(
      [att("d1", "sic-gen-04", "Approvato"), att("d1", "SIC-SPE-08", "Respinto"), att("d1", "BLS-BAS-05", "In attesa"), att("d2", "SIC-AGG-06", "Approvato"), att("d1", null, "Approvato")],
      "d1",
    );
    expect([...s]).toEqual(["SIC-GEN-04"]);
  });
});

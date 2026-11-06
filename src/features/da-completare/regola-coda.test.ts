/*
 * File:      regola-coda.test.ts
 * Percorso:  src/features/da-completare/regola-coda.test.ts
 * Creato:    05/11/2026
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import { eNuovoDellAnno, eTornato, inCodaDaCompletare, inizioAnnoScolastico } from "./regola-coda";

const completo = {
  id: "x", codice_fiscale: "AAABBB80A01H501X", cognome: "ROSSI", nome: "MARIO", email: null, reparto: "Docente",
  sottoreparto: null, classe_concorso: "A019", materia: "STORIA", luogo_nascita: "ROMA", data_nascita: "1980-01-01",
  tipo_contratto: "indeterminato", data_assunzione: "2026-09-01", data_fine_contratto: null, stato_lavoratore: "in_forza", data_cessazione: null,
} as Dipendente;

const oggi = new Date(2026, 10, 5); // 05/11/2026

describe("anno scolastico", () => {
  it("da settembre in poi conta l'anno corrente, prima l'anno precedente", () => {
    expect(inizioAnnoScolastico(new Date(2026, 10, 5))).toBe("2026-09-01");
    expect(inizioAnnoScolastico(new Date(2026, 8, 1))).toBe("2026-09-01");
    expect(inizioAnnoScolastico(new Date(2027, 1, 10))).toBe("2026-09-01");
    expect(inizioAnnoScolastico(new Date(2026, 7, 31))).toBe("2025-09-01");
  });
  it("nuovo dell'anno: assunto dal 1 settembre in poi", () => {
    expect(eNuovoDellAnno({ data_assunzione: "2026-09-01" }, oggi)).toBe(true);
    expect(eNuovoDellAnno({ data_assunzione: "2026-08-31" }, oggi)).toBe(false);
    expect(eNuovoDellAnno({ data_assunzione: null }, oggi)).toBe(false);
  });
});

describe("coda «Da completare»", () => {
  it("un nuovo con dati mancanti è in coda", () => {
    expect(inCodaDaCompletare({ ...completo, tipo_contratto: "determinato", data_fine_contratto: null }, oggi)).toBe(true);
    expect(inCodaDaCompletare({ ...completo, materia: null }, oggi)).toBe(true);
  });
  it("un nuovo con l'anagrafica completa non è in coda", () => {
    expect(inCodaDaCompletare(completo, oggi)).toBe(false);
  });
  it("un lavoratore vecchio incompleto NON è in coda (lo trovi in «Anagrafica incompleta» delle Stampe)", () => {
    expect(inCodaDaCompletare({ ...completo, data_assunzione: "2019-09-01", materia: null }, oggi)).toBe(false);
  });
  it("un riabilitato (in forza con data di cessazione) è in coda anche se completo", () => {
    const tornato = { ...completo, data_assunzione: "2026-09-01", data_cessazione: "2026-08-31" };
    expect(eTornato(tornato)).toBe(true);
    expect(inCodaDaCompletare(tornato, oggi)).toBe(true);
  });
  it("dopo il salvataggio (cessazione azzerata) il riabilitato completo esce dalla coda", () => {
    expect(inCodaDaCompletare({ ...completo, data_cessazione: null }, oggi)).toBe(false);
  });
  it("un cessato non è mai in coda", () => {
    expect(inCodaDaCompletare({ ...completo, stato_lavoratore: "cessato", data_cessazione: "2026-08-31", materia: null }, oggi)).toBe(false);
  });
});

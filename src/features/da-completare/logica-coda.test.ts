/*
 * File:      logica-coda.test.ts
 * Percorso:  src/features/da-completare/logica-coda.test.ts
 * Creato:    06/11/2026
 * Revisioni:
 *   rev 1 — 06/11/2026 08:20 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { DatiForm } from "./logica-coda";
import { erroreBlocco, ordinaCoda, precompilaFineContratto } from "./logica-coda";

const base = { cognome: "ROSSI", nome: "MARIO", codice_fiscale: "RSSMRA80A01H501U", tipo_contratto: "determinato", data_fine_contratto: null } as unknown as DatiForm;

describe("finestra «Da completare»", () => {
  it("blocca il salvataggio solo se mancano cognome, nome o codice fiscale", () => {
    expect(erroreBlocco(base)).toBeNull();
    expect(erroreBlocco({ ...base, cognome: " " })).not.toBeNull();
    expect(erroreBlocco({ ...base, nome: "" })).not.toBeNull();
    expect(erroreBlocco({ ...base, codice_fiscale: "" })).not.toBeNull();
  });
  it("riusa la fine contratto solo se richiesto, a tempo determinato e senza scadenza", () => {
    expect(precompilaFineContratto(base, true, "2027-06-30").data_fine_contratto).toBe("2027-06-30");
    expect(precompilaFineContratto(base, false, "2027-06-30").data_fine_contratto).toBeNull();
    expect(precompilaFineContratto({ ...base, tipo_contratto: "indeterminato" }, true, "2027-06-30").data_fine_contratto).toBeNull();
  });
  it("non sovrascrive una scadenza già inserita", () => {
    expect(precompilaFineContratto({ ...base, data_fine_contratto: "2027-01-31" }, true, "2027-06-30").data_fine_contratto).toBe("2027-01-31");
  });
  it("ordina per cognome e poi nome", () => {
    const l = ordinaCoda([{ cognome: "ZITO", nome: "A" }, { cognome: "ALBI", nome: "B" }, { cognome: "ALBI", nome: "A" }]);
    expect(l.map((d) => `${d.cognome} ${d.nome}`)).toEqual(["ALBI A", "ALBI B", "ZITO A"]);
  });
});

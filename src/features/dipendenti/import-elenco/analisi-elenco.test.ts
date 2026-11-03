/*
 * File:      analisi-elenco.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/analisi-elenco.test.ts
 * Creato:    03/11/2026
 * Revisioni:
 *   rev 1 — 03/11/2026 14:30 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import { analizzaRighe, dataFineServizioDefault, separaNominativo, trovaClasse } from "./analisi-elenco";

const CODICI = ["A027", "A050", "A11", "A19", "ADSS", "IRC", "A50"];

describe("analisi elenco", () => {
  it("fine servizio 31/08 dell'anno corrente", () => {
    expect(dataFineServizioDefault(new Date(2027, 2, 1))).toBe("2027-08-31");
  });
  it("riconosce le classi esistenti senza crearne", () => {
    expect(trovaClasse("A-19 STORIAFILOSOFIA", CODICI)?.classe).toBe("A19");
    expect(trovaClasse("A050 SCIENZE", CODICI)?.classe).toBe("A050");
    expect(trovaClasse("I.R.C.", CODICI)?.classe).toBe("IRC");
    expect(trovaClasse("ADSS -SOSTEGNO", CODICI)?.classe).toBe("ADSS");
    expect(trovaClasse("AS2B INGLESE", CODICI)).toBeNull();
  });
  it("separa cognome maiuscolo e nome", () => {
    expect(separaNominativo("AUGELLO Fabio")).toEqual({ cognome: "AUGELLO", nome: "Fabio" });
  });
  it("cessazione, ATA e nuovo ingresso per codice fiscale", () => {
    const r = analizzaRighe(
      [
        { nominativo: "AUGELLO Fabio", cf: "GLLFBA78T16I533R ", funzione: "\u00a0Non più in servizio" },
        { nominativo: "ROSSI Anna", cf: "RSSNNA80A41D150X", funzione: "COLL. SCOLASTICO" },
      ],
      [{ id: "1", codice_fiscale: "GLLFBA78T16I533R" }],
      CODICI,
    );
    expect(r[0]).toMatchObject({ tipo: "cessazione", dipendenteId: "1" });
    expect(r[1]).toMatchObject({ tipo: "ata", sottorepartoAta: "Collaboratore scolastico", dipendenteId: null });
  });
});

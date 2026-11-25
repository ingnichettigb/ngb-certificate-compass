/*
 * File:          riferimenti.test.ts
 * Percorso:      src/features/tabelle-raccordo/riferimenti.test.ts
 * Data creazione: 2026-11-21
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 *   - Rev 2 (2026-11-23): Convenzione unica dei codici col trattino (ADD-DAE): spazi e trattini bassi diventano trattini.
 */
import { describe, expect, it } from "vitest";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import type { TipoCorso } from "@/lib/api/tipi-corso";
import { codiceValido, messaggioErrore } from "./messaggi-raccordo";
import { etichettaRiferimento, opzioniCorsi, opzioniRuoli } from "./riferimenti";

const ruolo = (codice: string | null, nome: string, attivo = true) =>
  ({ id: nome, nome, codice, attivo, ordine: 1, obbligatorio_tutti: false }) as unknown as RuoloSicurezza;
const corso = (codice: string | null, nome_corso: string) => ({ id: nome_corso, codice, nome_corso }) as unknown as TipoCorso;

describe("opzioni dei ruoli", () => {
  it("solo ruoli con codice, in ordine alfabetico, con nome e codice", () => {
    const o = opzioniRuoli([ruolo("RLS", "RLS"), ruolo(null, "Senza codice"), ruolo("ADD-DAE", "Addetto DAE")]);
    expect(o).toEqual([
      { valore: "ADD-DAE", etichetta: "Addetto DAE (ADD-DAE)" },
      { valore: "RLS", etichetta: "RLS (RLS)" },
    ]);
  });

  it("un ruolo disattivato resta in elenco ma segnalato", () => {
    expect(opzioniRuoli([ruolo("ASPP", "ASPP", false)])[0]!.etichetta).toBe("ASPP (ASPP) · disattivato");
  });
});

describe("opzioni dei corsi", () => {
  it("solo corsi con codice, ordinati per codice, «CODICE – nome»", () => {
    const o = opzioniCorsi([corso("SIC-GEN-04", "Formazione generale"), corso(null, "Senza"), corso("BLS-BAS-05", "BLSD")]);
    expect(o.map((x) => x.etichetta)).toEqual(["BLS-BAS-05 – BLSD", "SIC-GEN-04 – Formazione generale"]);
    expect(o.map((x) => x.valore)).toEqual(["BLS-BAS-05", "SIC-GEN-04"]);
  });
});

describe("etichettaRiferimento", () => {
  const o = opzioniRuoli([ruolo("ADD-DAE", "Addetto DAE")]);
  it("mostra il nome del ruolo, anche con maiuscole diverse", () => {
    expect(etichettaRiferimento(o, "add-dae")).toBe("Addetto DAE (ADD-DAE)");
  });
  it("un codice che l'elenco non conosce si mostra com'è, mai vuoto", () => {
    expect(etichettaRiferimento(o, "VECCHIO_RUOLO")).toBe("VECCHIO_RUOLO");
  });
  it("valori vuoti danno testo vuoto", () => {
    expect(etichettaRiferimento(o, null)).toBe("");
    expect(etichettaRiferimento(o, "")).toBe("");
  });
});

describe("codiceValido", () => {
  it("porta in maiuscolo; spazi e trattini bassi diventano trattini", () => {
    expect(codiceValido(" oper-ple-831 ")).toBe("OPER-PLE-831");
    expect(codiceValido("add dae")).toBe("ADD-DAE");
    expect(codiceValido("oper_ple_831")).toBe("OPER-PLE-831");
  });
  it("un solo trattino tra le parti e nessuno ai bordi", () => {
    expect(codiceValido("ADD--DAE")).toBe("ADD-DAE");
    expect(codiceValido("  -add _ dae- ")).toBe("ADD-DAE");
  });
  it("rifiuta accenti, simboli, e il vuoto", () => {
    for (const t of ["àdd", "add/dae", "add.dae", "ADD+DAE", "", "---", "   "]) expect(codiceValido(t), t).toBeNull();
  });
});

describe("messaggioErrore", () => {
  it("traduce i vincoli del database", () => {
    expect(messaggioErrore({ code: "23505", message: "duplicate key" })).toContain("Esiste già");
    expect(messaggioErrore({ code: "23503", message: "violates foreign key" })).toContain("non esiste");
  });
  it("negli altri casi dà il messaggio originale", () => {
    expect(messaggioErrore({ message: "rete assente" })).toBe("rete assente");
    expect(messaggioErrore(null)).toBe("errore sconosciuto");
  });
});

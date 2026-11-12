/*
 * File:      stato-lavoratore.test.ts
 * Percorso:  src/features/stampe/stato-lavoratore.test.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 17:30 — Test del filtro «Stato lavoratore» (In forza / Solo cessati / Tutti): helper, retrocompatibilità di
 *            «includiCessati», calcolo per lavoratore e per attestato, organigramma e colonna «Data cessazione».
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import { calcolaRigheLavoratori, colonnePerVista, FILTRI_INIZIALI, includeLavoratorePerStato, statoEffettivo } from "./dati-stampa";

const oggi = new Date("2026-11-11T10:00:00");
function dip(id: string, cognome: string, stato: string): Dipendente {
  return {
    id, cognome, nome: "N", codice_fiscale: `CF${id}`, email: null, reparto: "ATA", sottoreparto: "Collaboratore scolastico",
    classe_concorso: null, materia: null, luogo_nascita: null, data_nascita: null, stato_lavoratore: stato,
  } as Dipendente;
}
const LAVORATORI = [dip("1", "ROSSI", "in_forza"), dip("2", "BIANCHI", "cessato"), dip("3", "VERDI", "in_forza"), dip("4", "NERI", "cessato")];
const cognomi = (f: Parameters<typeof calcolaRigheLavoratori>[1]) => calcolaRigheLavoratori(LAVORATORI, f, [], [], [], null, oggi).map((r) => r.cognome).sort();

describe("filtro Stato lavoratore", () => {
  it("predefinito: solo in forza", () => {
    expect(FILTRI_INIZIALI.statoLavoratori).toBe("in_forza");
    expect(cognomi(FILTRI_INIZIALI)).toEqual(["ROSSI", "VERDI"]);
  });

  it("solo cessati: esclude chi è in forza", () => {
    expect(cognomi({ ...FILTRI_INIZIALI, statoLavoratori: "solo_cessati", includiCessati: true })).toEqual(["BIANCHI", "NERI"]);
  });

  it("tutti: in forza e cessati", () => {
    expect(cognomi({ ...FILTRI_INIZIALI, statoLavoratori: "tutti", includiCessati: true })).toHaveLength(4);
  });

  it("retrocompatibilità: includiCessati da solo vale «Tutti»", () => {
    expect(statoEffettivo({ ...FILTRI_INIZIALI, includiCessati: true })).toBe("tutti");
    expect(cognomi({ ...FILTRI_INIZIALI, includiCessati: true })).toHaveLength(4);
  });

  it("«Solo cessati» ha la precedenza su includiCessati", () => {
    expect(statoEffettivo({ statoLavoratori: "solo_cessati", includiCessati: true })).toBe("solo_cessati");
    expect(statoEffettivo({ statoLavoratori: "solo_cessati", includiCessati: false })).toBe("solo_cessati");
  });

  it("helper: stato mancante o nullo conta come in forza", () => {
    expect(includeLavoratorePerStato(null, FILTRI_INIZIALI)).toBe(true);
    expect(includeLavoratorePerStato(undefined, { statoLavoratori: "solo_cessati", includiCessati: true })).toBe(false);
    expect(includeLavoratorePerStato("cessato", FILTRI_INIZIALI)).toBe(false);
  });

  it("colonna «Data cessazione» aggiunta da sola solo con «Solo cessati»", () => {
    expect(colonnePerVista({ ...FILTRI_INIZIALI, modello: "lavoratori" })).not.toContain("cessazione");
    expect(colonnePerVista({ ...FILTRI_INIZIALI, modello: "lavoratori", statoLavoratori: "solo_cessati" })).toContain("cessazione");
    expect(colonnePerVista({ ...FILTRI_INIZIALI, modello: "scadenze", statoLavoratori: "solo_cessati" })).not.toContain("cessazione");
  });
});

/*
 * File:          codici-ruoli.test.ts
 * Percorso:      src/lib/api/codici-ruoli.test.ts
 * Data creazione: 2026-11-21
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { describe, expect, it } from "vitest";
import { codiceRuoloAttrezzatura, normalizzaCodice, trovaRuoloPerCodice } from "./codici-ruoli";
import type { RuoloSicurezza } from "./ruoli";

const r = (codice: string | null, attivo = true): RuoloSicurezza => ({
  id: codice ?? "x", nome: "N", codice, descrizione: null, macro_categoria: null, obbligatorio_tutti: false, attivo, ordine: 1,
});

describe("codici dei ruoli", () => {
  it("normalizza maiuscolo e spazi", () => {
    expect(normalizzaCodice("  add_dae ")).toBe("ADD_DAE");
    expect(normalizzaCodice(null)).toBe("");
  });

  it("trova il ruolo per codice, ignorando maiuscole e i disattivati", () => {
    expect(trovaRuoloPerCodice([r("ADD_DAE")], "add_dae")?.id).toBe("ADD_DAE");
    expect(trovaRuoloPerCodice([r("ADD_DAE", false)], "ADD_DAE")).toBeUndefined();
    expect(trovaRuoloPerCodice([r("ADD_DAE", false)], "ADD_DAE", false)?.id).toBe("ADD_DAE");
    expect(trovaRuoloPerCodice([r(null)], "")).toBeUndefined();
  });

  it("deriva il codice del ruolo attrezzatura dal corso, base o aggiornamento", () => {
    expect(codiceRuoloAttrezzatura("LAV-PLES-II-831")).toBe("OPER_PLES_II_831");
    expect(codiceRuoloAttrezzatura("LAV-PLES-II-831-AGG")).toBe("OPER_PLES_II_831");
    expect(codiceRuoloAttrezzatura("LAV-AmbConf-II-7")).toBe("OPER_AMBCONF_II_7");
    expect(codiceRuoloAttrezzatura("SIC-GEN-04")).toBeNull();
    expect(codiceRuoloAttrezzatura(undefined)).toBeNull();
  });
});

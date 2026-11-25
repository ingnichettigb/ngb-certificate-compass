/*
 * File:          regole-ruolo-corso.test.ts
 * Percorso:      src/features/dipendenti/matrice/regole-ruolo-corso.test.ts
 * Data creazione: 2026-11-21
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { corsiDelRuolo, indiceRegole, ruoloCodicePerCorso } from "./regole-ruolo-corso";

let n = 0;
const reg = (ruolo_codice: string, corso_base: string | null, corso_aggiornamento: string | null, ordine = ++n): RegolaRuoloCorso => ({
  id: `g${ordine}`, ruolo_codice, parametro: "nessuno", valore: "—", corso_base, corso_aggiornamento, ordine,
});

const regole = [
  reg("LAVORATORE", "SIC-GEN-04", "SIC-AGG-06"),
  reg("LAVORATORE", "SIC-SPE-04", "SIC-AGG-06"),
  reg("ADD-DAE", "BLS-BAS-05", "BLS-AGG-05"),
  reg("OPER-CAR-CP-II-8311", "LAV-CAR-CP-II-8311", "LAV-CAR-CP-II-8311-AGG"),
];

describe("regole ruolo -> corso (Tabella 02)", () => {
  it("dal corso risale al ruolo, base o aggiornamento, senza badare alle maiuscole", () => {
    expect(ruoloCodicePerCorso(regole, "BLS-BAS-05")).toBe("ADD-DAE");
    expect(ruoloCodicePerCorso(regole, "bls-agg-05")).toBe("ADD-DAE");
    expect(ruoloCodicePerCorso(regole, "LAV-CAR-CP-II-8311-AGG")).toBe("OPER-CAR-CP-II-8311");
  });

  it("un corso che nessuna regola cita non ha ruolo", () => {
    expect(ruoloCodicePerCorso(regole, "COVID19-02")).toBeNull();
    expect(ruoloCodicePerCorso(regole, null)).toBeNull();
    expect(ruoloCodicePerCorso(regole, "")).toBeNull();
  });

  it("dal ruolo elenca i corsi base e di aggiornamento, senza ripetizioni", () => {
    expect(corsiDelRuolo(regole, "LAVORATORE")).toEqual({
      base: ["SIC-GEN-04", "SIC-SPE-04"],
      aggiornamento: ["SIC-AGG-06"],
    });
    expect(corsiDelRuolo(regole, "RUOLO_SENZA_REGOLE")).toEqual({ base: [], aggiornamento: [] });
  });

  it("se due ruoli citano lo stesso corso vince il primo nell'ordine della tabella", () => {
    const due = [reg("B", "X-1", null, 2), reg("A", "X-1", null, 1)];
    expect(ruoloCodicePerCorso(due, "X-1")).toBe("A");
    expect(indiceRegole(due).perCorso.get("X-1")).toEqual(["A", "B"]);
  });

  it("l'indice si costruisce una volta sola per elenco", () => {
    expect(indiceRegole(regole)).toBe(indiceRegole(regole));
  });
});

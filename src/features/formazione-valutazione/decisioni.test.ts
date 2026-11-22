/*
 * File:          decisioni.test.ts
 * Percorso:      src/features/formazione-valutazione/decisioni.test.ts
 * Data creazione: 2026-11-21
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { Attestato } from "@/lib/api/attestati";
import { annullaDecisione, costruisciDecisione, decisioneDi, decisioneValida, erroreDecisione } from "./decisioni";

const att = (extra: Partial<Attestato> = {}) => ({ id: "a1", dipendente_id: "d1", ...extra }) as unknown as Attestato;
const registrata = att({
  equivalenza_esito: "accettata", equivalenza_corso_svolto: "SIC-SPE-12", equivalenza_corso_atteso: "SIC-SPE-08",
  equivalenza_rischio: "medio", equivalenza_nota: " Stesso settore ", equivalenza_data: "2026-11-21T10:00:00.000Z",
});

describe("decisioneDi", () => {
  it("legge la decisione completa dall'attestato", () => {
    expect(decisioneDi(registrata)).toEqual({
      attestatoId: "a1", esito: "accettata", corsoSvolto: "SIC-SPE-12", corsoAtteso: "SIC-SPE-08", rischio: "medio",
      nota: "Stesso settore", data: "2026-11-21T10:00:00.000Z",
    });
  });
  it("senza decisione, o incompleta, è null", () => {
    expect(decisioneDi(att())).toBeNull();
    expect(decisioneDi(att({ equivalenza_esito: "accettata" }))).toBeNull();
  });
});

describe("decisioneValida: decade se la situazione cambia", () => {
  const d = decisioneDi(registrata)!;
  const oggi = { corsoSvolto: "SIC-SPE-12", corsoAtteso: "SIC-SPE-08", rischioDitta: "medio" as const };
  it("vale se corso svolto, corso atteso e rischio sono gli stessi", () => expect(decisioneValida(d, oggi)).toBe(true));
  it("decade se la ditta cambia grado di rischio", () => expect(decisioneValida(d, { ...oggi, rischioDitta: "alto" })).toBe(false));
  it("decade se l'attestato cambia corso", () => expect(decisioneValida(d, { ...oggi, corsoSvolto: "SIC-SPE-04" })).toBe(false));
  it("decade se cambia il corso atteso o il rischio non è impostato", () => {
    expect(decisioneValida(d, { ...oggi, corsoAtteso: "SIC-SPE-12" })).toBe(false);
    expect(decisioneValida(d, { ...oggi, rischioDitta: null })).toBe(false);
  });
});

describe("erroreDecisione", () => {
  it("serve una scelta e una nota", () => {
    expect(erroreDecisione(null, "x")).toBe("Scegli una decisione");
    expect(erroreDecisione("accettata", "   ")).toBe("La nota è obbligatoria");
    expect(erroreDecisione("non_valida", "Settore diverso")).toBeNull();
  });
});

describe("dati da salvare", () => {
  it("costruisce la decisione con codici in maiuscolo, nota pulita e data", () => {
    expect(costruisciDecisione({ esito: "integrazione", corsoSvolto: "sic-spe-12", corsoAtteso: "SIC-SPE-08", rischio: "medio", nota: " serve  ", adesso: new Date("2026-11-21T10:00:00Z") })).toEqual({
      equivalenza_esito: "integrazione", equivalenza_corso_svolto: "SIC-SPE-12", equivalenza_corso_atteso: "SIC-SPE-08",
      equivalenza_rischio: "medio", equivalenza_nota: "serve", equivalenza_data: "2026-11-21T10:00:00.000Z",
    });
  });
  it("annulla azzerando tutti e sei i campi insieme", () => {
    const a = annullaDecisione();
    expect(Object.keys(a)).toHaveLength(6);
    expect(Object.values(a).every((v) => v === null)).toBe(true);
  });
});

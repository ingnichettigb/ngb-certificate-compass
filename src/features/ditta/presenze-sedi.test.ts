/*
 * File:      presenze-sedi.test.ts
 * Percorso:  src/features/ditta/presenze-sedi.test.ts
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 — Test: totale presenze delle sedi, lavoratori di riferimento (più alto), fasce, fabbisogni RLS/Primo Soccorso/Antincendio.
 */
import { describe, expect, it } from "vitest";
import { lavoratoriDiRiferimento, nellaFascia, riepilogaPresenze, type SedePresenze } from "./presenze-sedi";
import { calcolaFabbisogniDitta } from "@/features/impostazioni/ditta/calcola-fabbisogni-ditta";
import { DITTA_DEFAULT, type SogliaDitta } from "@/lib/api/ditta";
import { validaPersoneMax } from "@/lib/api/sedi";

const sede = (nome: string, principale: boolean, persone: number | null, attiva = true): SedePresenze => ({
  id: nome,
  nome,
  is_principale: principale,
  attiva,
  persone_max: persone,
});

describe("riepilogaPresenze", () => {
  it("somma Sede Centrale e plessi", () => {
    const r = riepilogaPresenze([sede("Sede Centrale", true, 800), sede("Ex Campo", false, 250)]);
    expect(r).toEqual({ sedeCentrale: 800, plessi: 250, totale: 1050, completo: true, mancanti: [] });
  });
  it("è incompleto se una sede non ha il valore, e lo dice per nome", () => {
    const r = riepilogaPresenze([sede("Sede Centrale", true, 800), sede("Ex Campo", false, null)]);
    expect(r.completo).toBe(false);
    expect(r.mancanti).toEqual(["Ex Campo"]);
    expect(r.totale).toBe(800);
  });
  it("ignora le sedi non attive e tratta 0 come non compilato", () => {
    const r = riepilogaPresenze([sede("Sede Centrale", true, 100), sede("Chiuso", false, 500, false), sede("Nuovo", false, 0)]);
    expect(r.totale).toBe(100);
    expect(r.mancanti).toEqual(["Nuovo"]);
  });
  it("senza sedi non è mai completo", () => {
    expect(riepilogaPresenze([]).completo).toBe(false);
  });
});

describe("lavoratoriDiRiferimento (principio più cautelativo)", () => {
  it("127 dichiarati contro 128 in forza → 128", () => {
    expect(lavoratoriDiRiferimento(127, 128)).toBe(128);
  });
  it("dichiarati più alti degli in forza → dichiarati", () => {
    expect(lavoratoriDiRiferimento(130, 128)).toBe(130);
  });
  it("manca uno dei due → usa l'altro; mancano entrambi → null", () => {
    expect(lavoratoriDiRiferimento(null, 128)).toBe(128);
    expect(lavoratoriDiRiferimento(127, undefined)).toBe(127);
    expect(lavoratoriDiRiferimento(null, undefined)).toBeNull();
  });
});

describe("nellaFascia", () => {
  it("rispetta gli estremi e la fascia aperta", () => {
    expect(nellaFascia(16, 16, 200)).toBe(true);
    expect(nellaFascia(200, 16, 200)).toBe(true);
    expect(nellaFascia(201, 16, 200)).toBe(false);
    expect(nellaFascia(5000, 1001, null)).toBe(true);
    expect(nellaFascia(null, 0, 10)).toBe(false);
  });
});

describe("validaPersoneMax", () => {
  it("accetta interi > 0 e rifiuta vuoto, 0, negativi, decimali", () => {
    expect(validaPersoneMax(450)).toBe(450);
    expect(validaPersoneMax("12")).toBe(12);
    for (const v of ["", null, undefined, 0, -3, 2.5, "abc"]) expect(() => validaPersoneMax(v)).toThrow();
  });
});

const soglia = (ambito: SogliaDitta["ambito"], da: number, a: number | null, esito: string, ordine: number): SogliaDitta =>
  ({ id: `${ambito}-${da}`, ambito, da, a, etichetta: esito, esito, note: null, ordine, attiva: true }) as SogliaDitta;

const SOGLIE: SogliaDitta[] = [
  soglia("rls", 0, 15, "RLS eletto dai lavoratori o territoriale", 1),
  soglia("rls", 16, 200, "1 RLS", 2),
  soglia("rls", 201, 1000, "3 RLS", 3),
  soglia("rls", 1001, null, "6 RLS", 4),
  soglia("primo_soccorso", 0, 2, "Gruppo C", 1),
  soglia("primo_soccorso", 3, null, "Gruppo B", 2),
  soglia("antincendio_presenze", 0, 100, "Livello 1", 1),
  soglia("antincendio_presenze", 101, 1000, "Livello 2", 2),
  soglia("antincendio_presenze", 1001, null, "Livello 3", 3),
];

describe("calcolaFabbisogniDitta con lavoratori in forza", () => {
  it("usa il più alto: 15 dichiarati e 16 in forza → fascia 16-200 (1 RLS)", () => {
    const f = { ...DITTA_DEFAULT, n_lavoratori_dichiarato: 15 };
    expect(calcolaFabbisogniDitta(SOGLIE, f, 15).esitoRls?.esito).toBe("RLS eletto dai lavoratori o territoriale");
    const r = calcolaFabbisogniDitta(SOGLIE, f, 16);
    expect(r.lavoratoriRiferimento).toBe(16);
    expect(r.esitoRls?.esito).toBe("1 RLS");
  });
  it("200 dichiarati e 201 in forza → 3 RLS", () => {
    const r = calcolaFabbisogniDitta(SOGLIE, { ...DITTA_DEFAULT, n_lavoratori_dichiarato: 200 }, 201);
    expect(r.esitoRls?.esito).toBe("3 RLS");
  });
  it("2 dichiarati e 3 in forza → Primo Soccorso Gruppo B", () => {
    const r = calcolaFabbisogniDitta(SOGLIE, { ...DITTA_DEFAULT, n_lavoratori_dichiarato: 2 }, 3);
    expect(r.esitoPs?.esito).toBe("Gruppo B");
  });
  it("senza in forza si comporta come prima (solo dichiarati)", () => {
    const r = calcolaFabbisogniDitta(SOGLIE, { ...DITTA_DEFAULT, n_lavoratori_dichiarato: 127 });
    expect(r.esitoRls?.esito).toBe("1 RLS");
  });
  it("antincendio dalle presenze totali: 1.050 → Livello 3", () => {
    const r = calcolaFabbisogniDitta(SOGLIE, { ...DITTA_DEFAULT, presenze_contemporanee_max: 1050 }, null);
    expect(r.esitoAntincendio?.esito).toBe("Livello 3");
  });
});

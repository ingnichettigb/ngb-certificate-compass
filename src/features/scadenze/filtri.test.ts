/*
 * Test delle funzioni pure dei filtri della pagina Scadenze.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Attestato } from "@/lib/api";
import { elencoCorsi, elencoReparti, filtraScadenze } from "./filtri";
import { TUTTI, type Vista } from "./types";

const att = (id: string, cognome: string, reparto: string | null, corso: string | null, scad: string | null, dataCorso: string | null = "2021-01-01") =>
  ({
    id,
    codice_fiscale: "CF" + id,
    data_corso: dataCorso,
    data_scadenza_calcolata: scad,
    dipendenti: { cognome, nome: "X", reparto },
    tipi_corso: corso ? { nome_corso: corso } : null,
  }) as unknown as Attestato;

const OGGI = new Date("2026-10-20T12:00:00Z");
const base = { vista: "Tutti con scadenza" as Vista, q: "", reparto: TUTTI, corsoSelezionato: TUTTI, sortCol: "scadenza" as const, sortDir: "asc" as const, oggi: OGGI };

describe("elencoReparti / elencoCorsi", () => {
  const dati = [att("1", "A", "Docente", "Primo soccorso", "2027-01-01"), att("2", "B", " docente ", "primo SOCCORSO", "2027-01-01"), att("3", "C", "45123", "Antincendio", "2027-01-01"), att("4", "D", null, null, "2027-01-01"), att("5", "E", "ATA", "  Antincendio  ", "2027-01-01")];
  it("reparti: senza doppioni (ignora maiuscole e spazi), senza valori illeggibili, ordinati", () => {
    expect(elencoReparti(dati)).toEqual(["ATA", "Docente"]);
  });
  it("corsi: senza doppioni, con spazi tolti, ordinati", () => {
    expect(elencoCorsi(dati)).toEqual(["Antincendio", "Primo soccorso"]);
  });
  it("elenco vuoto", () => {
    expect(elencoReparti([])).toEqual([]);
    expect(elencoCorsi([])).toEqual([]);
  });
});

describe("filtraScadenze: periodi", () => {
  const dati = [
    att("scaduto", "A", "ATA", "X", "2026-10-19"),
    att("oggi", "B", "ATA", "X", "2026-10-20"),
    att("90gg", "C", "ATA", "X", "2027-01-18"),
    att("oltre90", "D", "ATA", "X", "2027-01-19"),
    att("6mesi", "E", "ATA", "X", "2027-04-20"),
    att("1anno", "F", "ATA", "X", "2027-10-20"),
    att("oltre1anno", "G", "ATA", "X", "2027-10-21"),
    att("senza", "H", "ATA", "X", null),
  ];
  const ids = (vista: Vista) => filtraScadenze({ ...base, attestati: dati, vista }).map((a) => a.id);
  it("Scaduti: solo prima di oggi (chi scade oggi non è scaduto)", () => {
    expect(ids("Scaduti")).toEqual(["scaduto"]);
  });
  it("In scadenza (90 gg): da oggi a +90 giorni compresi", () => {
    expect(ids("In scadenza (90 gg)")).toEqual(["oggi", "90gg"]);
  });
  it("In scadenza (6 mesi)", () => {
    expect(ids("In scadenza (6 mesi)")).toEqual(["oggi", "90gg", "oltre90", "6mesi"]);
  });
  it("In scadenza (1 anno)", () => {
    expect(ids("In scadenza (1 anno)")).toEqual(["oggi", "90gg", "oltre90", "6mesi", "1anno"]);
  });
  it("Tutti con scadenza: esclude solo chi non ha la data", () => {
    expect(ids("Tutti con scadenza")).toHaveLength(7);
    expect(ids("Tutti con scadenza")).not.toContain("senza");
  });
});

describe("filtraScadenze: reparto, corso, ricerca e ordinamento", () => {
  const dati = [
    att("1", "ROSSI", "Docente", "Primo soccorso", "2027-03-01", "2024-03-01"),
    att("2", "BIANCHI", "docente", "Antincendio", "2027-01-01", "2022-01-01"),
    att("3", "VERDI", "ATA", "primo SOCCORSO", "2026-12-01", "2023-12-01"),
  ];
  const f = (extra: Partial<Parameters<typeof filtraScadenze>[0]>) => filtraScadenze({ ...base, attestati: dati, ...extra }).map((a) => a.id);
  it("reparto e corso ignorano maiuscole e spazi", () => {
    expect(f({ reparto: "Docente" }).sort()).toEqual(["1", "2"]);
    expect(f({ corsoSelezionato: "Primo soccorso" }).sort()).toEqual(["1", "3"]);
    expect(f({ reparto: "Docente", corsoSelezionato: "Primo soccorso" })).toEqual(["1"]);
  });
  it("ricerca su cognome, nome, codice fiscale e corso", () => {
    expect(f({ q: "bianchi" })).toEqual(["2"]);
    expect(f({ q: " CF3 " })).toEqual(["3"]);
    expect(f({ q: "primo" }).sort()).toEqual(["1", "3"]);
    expect(f({ q: "x" })).toHaveLength(3);
    expect(f({ q: "zzz" })).toEqual([]);
  });
  it("ordina per colonna, in entrambe le direzioni", () => {
    expect(f({ sortCol: "dipendente", sortDir: "asc" })).toEqual(["2", "1", "3"]);
    expect(f({ sortCol: "dipendente", sortDir: "desc" })).toEqual(["3", "1", "2"]);
    expect(f({ sortCol: "scadenza", sortDir: "asc" })).toEqual(["3", "2", "1"]);
    expect(f({ sortCol: "data_corso", sortDir: "desc" })).toEqual(["1", "3", "2"]);
    expect(f({ sortCol: "corso", sortDir: "asc" })[0]).toBe("2");
  });
  it("non modifica l'elenco originale", () => {
    const copia = [...dati];
    filtraScadenze({ ...base, attestati: dati, sortCol: "dipendente", sortDir: "desc" });
    expect(dati).toEqual(copia);
  });
});

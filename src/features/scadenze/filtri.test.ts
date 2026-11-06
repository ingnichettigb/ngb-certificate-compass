/*
 * File:      filtri.test.ts
 * Percorso:  src/features/scadenze/filtri.test.ts
 * Test delle funzioni pure dei filtri della pagina Scadenze.
 * - Rev (2026-11-06 16:00): Adeguato alle righe raggruppate (RigaScadenzaDati) e al motore dei cicli;
 *   aggiunti test su raggruppamento, decadenza e regola Preposti.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Attestato } from "@/lib/api";
import { elencoCorsi, elencoReparti, filtraScadenze } from "./filtri";
import { TUTTI, type Vista } from "./types";

/**
 * Un attestato Base di un lavoratore distinto (= una riga). La scadenza deriva dal motore:
 * data corso + durata anni (null = il corso non scade).
 */
const att = (
  id: string,
  cognome: string,
  reparto: string | null,
  corso: string | null,
  dataCorso: string | null = "2021-01-01",
  durata: number | null = 5,
  extra: Record<string, unknown> = {},
) =>
  ({
    id,
    codice_fiscale: "CF" + id,
    dipendente_id: "d" + id,
    tipo_corso_id: "t" + id,
    data_corso: dataCorso,
    ore_dichiarate: 6,
    stato_validazione: "Approvato",
    dipendenti: { cognome, nome: "X", reparto },
    tipi_corso: corso
      ? {
          nome_corso: corso,
          macro_categoria: corso,
          livello_specifico: "Base",
          durata_validita_anni: durata,
          ore_aggiornamento: 6,
          ore_minime_legge: 6,
        }
      : null,
    ...extra,
  }) as unknown as Attestato;

const OGGI = new Date("2026-10-20T12:00:00");
const base = { vista: "Tutti con scadenza" as Vista, q: "", reparto: TUTTI, corsoSelezionato: TUTTI, sortCol: "scadenza" as const, sortDir: "asc" as const, oggi: OGGI };

describe("elencoReparti / elencoCorsi", () => {
  const dati = [att("1", "A", "Docente", "Primo soccorso", "2021-01-01"), att("2", "B", " docente ", "primo SOCCORSO", "2021-01-01"), att("3", "C", "45123", "Antincendio", "2021-01-01"), att("4", "D", null, null, "2021-01-01"), att("5", "E", "ATA", "  Antincendio  ", "2021-01-01")];
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
  // Oggi = 20/10/2026. Corsi da 5 anni: la scadenza è la data del corso + 5 anni.
  const dati = [
    att("scaduto", "A", "ATA", "X", "2021-10-19"),
    att("oggi", "B", "ATA", "X", "2021-10-20"),
    att("90gg", "C", "ATA", "X", "2022-01-18"),
    att("oltre90", "D", "ATA", "X", "2022-01-19"),
    att("6mesi", "E", "ATA", "X", "2022-04-20"),
    att("1anno", "F", "ATA", "X", "2022-10-20"),
    att("oltre1anno", "G", "ATA", "X", "2022-10-21"),
    att("senza", "H", "ATA", "X", "2022-01-01", null),
  ];
  const ids = (vista: Vista) => filtraScadenze({ ...base, attestati: dati, vista }).map((r) => r.attestato.id);
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
  it("Tutti con scadenza: esclude solo i corsi che non scadono", () => {
    expect(ids("Tutti con scadenza")).toHaveLength(7);
    expect(ids("Tutti con scadenza")).not.toContain("senza");
  });
});

describe("filtraScadenze: raggruppamento, decadenza e record storici", () => {
  const f = (attestati: Attestato[], vista: Vista = "Tutti con scadenza") =>
    filtraScadenze({ ...base, attestati, vista });

  it("Base + aggiornamento dello stesso lavoratore e corso = una sola riga", () => {
    const b = att("b", "ROSSI", "ATA", "Antincendio", "2022-03-10", 5, { dipendente_id: "d1", tipo_corso_id: "t1" });
    const a = att("a", "ROSSI", "ATA", "Antincendio", "2024-05-01", 5, {
      dipendente_id: "d1",
      tipo_corso_id: "t1",
      tipi_corso: { nome_corso: "Antincendio", macro_categoria: "Antincendio", livello_specifico: "Aggiornamento", durata_validita_anni: 5, ore_aggiornamento: 6, ore_minime_legge: 6 },
    });
    const righe = f([b, a]);
    expect(righe).toHaveLength(1);
    expect(righe[0]!.attestatiGruppo).toHaveLength(2);
    expect(righe[0]!.ciclo.scadenzaEffettiva).toBe("2032-03-10");
  });

  it("un attestato respinto non conta", () => {
    expect(f([att("r", "ROSSI", "ATA", "X", "2022-01-01", 5, { stato_validazione: "Respinto" })])).toHaveLength(0);
  });

  it("decaduto: più di 10 anni dal Base senza aggiornamenti", () => {
    const righe = f([att("v", "ROSSI", "ATA", "X", "2014-01-01", 5)], "Decaduti (> 10 anni)");
    expect(righe.map((r) => r.attestato.id)).toEqual(["v"]);
  });

  it("record storico senza data_corso: non manda in crash il calcolo", () => {
    const senzaData = att("n", "ROSSI", "ATA", "X", null, 5);
    expect(() => f([senzaData])).not.toThrow();
    expect(() => f([senzaData, att("ok", "BIANCHI", "ATA", "X", "2022-01-01", 5)])).not.toThrow();
  });

  it("Preposto: ciclo biennale e scadenza portata al taglio del 19/05/2026", () => {
    const prep = att("p", "ROSSI", "ATA", "Preposto", "2022-03-10", 5, { tipi_corso: { nome_corso: "Preposto", macro_categoria: "Preposto", livello_specifico: "Specifico", durata_validita_anni: 5, ore_aggiornamento: 6, ore_minime_legge: 8 } });
    const [r] = f([prep], "Scaduti");
    expect(r?.ciclo.durataCicloAnni).toBe(2);
    expect(r?.ciclo.dataTaglio).toBe("2026-05-19");
    // fine ciclo rigida = 10/03/2024, anteriore al taglio → 19/05/2026
    expect(r?.ciclo.scadenzaEffettiva).toBe("2026-05-19");
    expect(r?.ciclo.scadenzaPortataAlTaglio).toBe(true);
  });
});

describe("filtraScadenze: reparto, corso, ricerca e ordinamento", () => {
  const dati = [
    att("1", "ROSSI", "Docente", "Primo soccorso", "2024-03-01", 3),
    att("2", "BIANCHI", "docente", "Antincendio", "2022-01-01", 5),
    att("3", "VERDI", "ATA", "primo SOCCORSO", "2023-12-01", 3),
  ];
  const f = (extra: Partial<Parameters<typeof filtraScadenze>[0]>) => filtraScadenze({ ...base, attestati: dati, ...extra }).map((r) => r.attestato.id);
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

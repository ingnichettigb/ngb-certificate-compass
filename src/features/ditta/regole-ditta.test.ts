/*
 * File:          regole-ditta.test.ts
 * Percorso:      src/features/ditta/regole-ditta.test.ts
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 12:30): Fasce di legge ai limiti, codici ATECO, anno scolastico e avvisi sui dati ditta.
 */
import { describe, expect, it } from "vitest";
import {
  calcolaAvvisi,
  inizioAnnoScolastico,
  normalizzaAteco,
  suggerisciRischioAteco,
  trovaSoglia,
  type Soglia,
} from "./regole-ditta";

const s = (ambito: string, da: number, a: number | null, esito: string): Soglia => ({
  id: `${ambito}-${da}`,
  ambito,
  da,
  a,
  etichetta: `${da}-${a ?? "oltre"}`,
  esito,
  attiva: true,
});
const SOGLIE: Soglia[] = [
  s("rls", 0, 15, "eletto"),
  s("rls", 16, 200, "1 RLS"),
  s("rls", 201, 1000, "3 RLS"),
  s("rls", 1001, null, "6 RLS"),
  s("primo_soccorso", 0, 2, "Gruppo C"),
  s("primo_soccorso", 3, null, "Gruppo B"),
  s("antincendio_presenze", 0, 100, "Livello 1"),
  s("antincendio_presenze", 101, 1000, "Livello 2"),
  s("antincendio_presenze", 1001, null, "Livello 3"),
  s("idoneita_tecnica_presenze", 0, 300, "Non richiesta"),
  s("idoneita_tecnica_presenze", 301, null, "Richiesta"),
];

describe("fasce di legge ai limiti", () => {
  it.each([
    [15, "eletto"],
    [16, "1 RLS"],
    [200, "1 RLS"],
    [201, "3 RLS"],
    [1000, "3 RLS"],
    [1001, "6 RLS"],
  ])("RLS con %i lavoratori", (n, esito) =>
    expect(trovaSoglia(SOGLIE, "rls", n)?.esito).toBe(esito),
  );
  it.each([
    [2, "Gruppo C"],
    [3, "Gruppo B"],
    [500, "Gruppo B"],
  ])("Primo Soccorso con %i lavoratori", (n, esito) =>
    expect(trovaSoglia(SOGLIE, "primo_soccorso", n)?.esito).toBe(esito),
  );
  it.each([
    [100, "Livello 1"],
    [101, "Livello 2"],
    [1000, "Livello 2"],
    [1001, "Livello 3"],
  ])("Antincendio con %i presenti", (n, esito) =>
    expect(trovaSoglia(SOGLIE, "antincendio_presenze", n)?.esito).toBe(esito),
  );
  it.each([
    [300, "Non richiesta"],
    [301, "Richiesta"],
  ])("Idoneità tecnica con %i presenti", (n, esito) =>
    expect(trovaSoglia(SOGLIE, "idoneita_tecnica_presenze", n)?.esito).toBe(esito),
  );
  it("senza numero non c'è fascia", () => {
    expect(trovaSoglia(SOGLIE, "rls", null)).toBeNull();
    expect(trovaSoglia(SOGLIE, "rls", undefined)).toBeNull();
  });
  it("una soglia disattivata viene ignorata", () => {
    const spente = SOGLIE.map((x) => (x.ambito === "rls" ? { ...x, attiva: false } : x));
    expect(trovaSoglia(spente, "rls", 50)).toBeNull();
  });
});

describe("codici ATECO", () => {
  it.each([
    ["85.31.20", "85.31.20"],
    ["853120", "85.31.20"],
    ["85.31", "85.31"],
    ["8531", "85.31"],
    ["85", "85"],
    [" 85.31.2 ", "85.31.2"],
  ])("«%s» diventa «%s»", (ingresso, atteso) => expect(normalizzaAteco(ingresso)).toBe(atteso));
  it.each([["8"], ["abc"], ["85.3a"], ["85.31.201"], [""], ["85-31"]])("«%s» non è valido", (x) =>
    expect(normalizzaAteco(x)).toBeNull(),
  );
  it("l'Istruzione (85) è suggerita a rischio medio, gli altri codici non hanno suggerimento", () => {
    expect(suggerisciRischioAteco("85.31.20")).toBe("medio");
    expect(suggerisciRischioAteco("47.11")).toBeNull();
  });
});

describe("anno scolastico", () => {
  it("da settembre a dicembre è quello dell'anno, da gennaio ad agosto quello precedente", () => {
    expect(inizioAnnoScolastico(new Date(2026, 10, 1))).toBe("2026-09-01"); // 1 novembre 2026
    expect(inizioAnnoScolastico(new Date(2026, 8, 1))).toBe("2026-09-01"); // 1 settembre 2026
    expect(inizioAnnoScolastico(new Date(2026, 7, 31))).toBe("2025-09-01"); // 31 agosto 2026
    expect(inizioAnnoScolastico(new Date(2027, 0, 15))).toBe("2026-09-01");
  });
});

describe("avvisi sui dati ditta", () => {
  const oggi = new Date(2026, 10, 1);
  it("niente dati ditta = nessun avviso", () =>
    expect(calcolaAvvisi(null, SOGLIE, 10, oggi)).toEqual([]));

  it("numero lavoratori non dichiarato", () => {
    const a = calcolaAvvisi({ n_lavoratori_dichiarato: null }, SOGLIE, 50, oggi);
    expect(a.map((x) => x.chiave)).toEqual(["lavoratori-mancanti"]);
  });

  it("nessun avviso se il numero reale resta nella stessa fascia", () => {
    expect(calcolaAvvisi({ n_lavoratori_dichiarato: 40 }, SOGLIE, 120, oggi)).toEqual([]);
  });

  it("avviso quando il reale esce dalla fascia dichiarata (16–200 → 201)", () => {
    const a = calcolaAvvisi({ n_lavoratori_dichiarato: 190 }, SOGLIE, 201, oggi);
    expect(a).toHaveLength(1);
    expect(a[0]!.chiave).toBe("lavoratori-fascia");
    expect(a[0]!.dettaglio).toMatch(/RLS/);
  });

  it("avviso anche per il Primo Soccorso (2 → 3 lavoratori)", () => {
    const a = calcolaAvvisi({ n_lavoratori_dichiarato: 2 }, SOGLIE, 3, oggi);
    expect(a[0]!.dettaglio).toMatch(/Primo Soccorso/);
  });

  it("senza conteggio reale disponibile non inventa avvisi", () => {
    expect(calcolaAvvisi({ n_lavoratori_dichiarato: 40 }, SOGLIE, null, oggi)).toEqual([]);
  });

  it("scuola: presenze mancanti, vecchie o aggiornate", () => {
    const base = { n_lavoratori_dichiarato: 40, e_scuola: true };
    expect(
      calcolaAvvisi({ ...base, presenze_contemporanee_max: null }, SOGLIE, 40, oggi).map(
        (x) => x.chiave,
      ),
    ).toEqual(["presenze-mancanti"]);
    expect(
      calcolaAvvisi(
        { ...base, presenze_contemporanee_max: 800, presenze_data_aggiornamento: "2026-06-10" },
        SOGLIE,
        40,
        oggi,
      ).map((x) => x.chiave),
    ).toEqual(["presenze-vecchie"]);
    expect(
      calcolaAvvisi(
        { ...base, presenze_contemporanee_max: 800, presenze_data_aggiornamento: "2026-09-20" },
        SOGLIE,
        40,
        oggi,
      ),
    ).toEqual([]);
  });

  it("se non è una scuola le presenze non contano", () => {
    expect(
      calcolaAvvisi(
        { n_lavoratori_dichiarato: 40, e_scuola: false, presenze_contemporanee_max: null },
        SOGLIE,
        40,
        oggi,
      ),
    ).toEqual([]);
  });
});

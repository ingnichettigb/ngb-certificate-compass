/*
 * File:           tabella.test.ts
 * Percorso:       src/features/tipi-corso/tabella.test.ts
 * Data creazione: 2026-10-26
 *
 * Test della logica della tabella tipi di corso:
 * - Lettura dei valori nelle celle numeriche
 * - Ordinamento per colonna
 * - Filtro esclusivo per argomenti (bottoni 1..11 e «Tutti»)
 *
 * Revisioni:
 * - Rev 1: 2026-10-26 17:15 - Test ordinamento e interpretazione celle numeriche.
 * - Rev 2: 2026-11-23 11:10 - Test appartieneAGruppo: verifica isolamento gruppo 1 da 10 (ASPP/RSPP/DL) e 11 (Cantieri).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { TipoCorso } from "@/lib/api";
import { interpretaValore } from "./components/CellaNumerica";
import { ordina } from "./TabellaTipiCorso";
import { appartieneAGruppo } from "./tipi-raggruppamento";

describe("interpretaValore (celle numeriche)", () => {
  it("vuoto o con soli spazi: nessun valore", () => {
    expect(interpretaValore("")).toBeNull();
    expect(interpretaValore("   ")).toBeNull();
  });
  it("parole che significano «nessun valore»", () => {
    for (const t of ["NA", "n/a", "N/A", "n.a.", "Non scade", " illimitata "])
      expect(interpretaValore(t), t).toBeNull();
  });
  it("numeri, anche con la virgola decimale e gli spazi", () => {
    expect(interpretaValore("12")).toBe(12);
    expect(interpretaValore(" 8,5 ")).toBe(8.5);
    expect(interpretaValore("6.5")).toBe(6.5);
  });
  it("testo non numerico: nessun valore", () => {
    expect(interpretaValore("abc")).toBeNull();
    expect(interpretaValore("12 ore")).toBeNull();
  });
  it("lo zero è un valore, tranne dove vale «nessun valore» (zeroComeVuoto)", () => {
    expect(interpretaValore("0")).toBe(0);
    expect(interpretaValore("0", true)).toBeNull();
    expect(interpretaValore("5", true)).toBe(5);
  });
});

describe("ordina (colonne della tabella)", () => {
  const c = (id: string, extra: Partial<TipoCorso>) =>
    ({
      id,
      codice: null,
      nome_corso: id,
      ore_minime_legge: null,
      visibile_lavoratore: true,
      ...extra,
    }) as TipoCorso;
  const dati = [
    c("b", { codice: "A10", ore_minime_legge: 8 }),
    c("a", { codice: "A2", ore_minime_legge: 4 }),
    c("v", { codice: null }),
    c("z", { codice: "B1", ore_minime_legge: 12, visibile_lavoratore: false }),
  ];
  const ids = (chiave: Parameters<typeof ordina>[1]["chiave"], dir: "asc" | "desc") =>
    ordina(dati, { chiave, dir }).map((x) => x.id);

  it("testo con numeri dentro: ordine «naturale» (A2 prima di A10)", () => {
    expect(ids("codice", "asc")).toEqual(["a", "b", "z", "v"]);
  });
  it("i valori vuoti restano sempre in fondo, anche in ordine decrescente", () => {
    expect(ids("codice", "desc")).toEqual(["z", "b", "a", "v"]);
  });
  it("colonne numeriche", () => {
    expect(ids("ore_minime_legge", "asc")).toEqual(["a", "b", "z", "v"]);
    expect(ids("ore_minime_legge", "desc")).toEqual(["z", "b", "a", "v"]);
  });
  it("colonna sì/no: i «No» vengono prima dei «Sì»", () => {
    const r = ids("visibile_lavoratore", "asc");
    expect(r[0]).toBe("z");
  });
  it("non modifica l'elenco originale", () => {
    const copia = [...dati];
    ordina(dati, { chiave: "codice", dir: "desc" });
    expect(dati).toEqual(copia);
  });
});

describe("appartieneAGruppo (filtro pulsanti argomenti)", () => {
  const corsoLav = { codice: "SIC-SPE-04", macro_categoria: "Formazione Lavoratori" };
  const corsoAspp = { codice: "SIC-ASPP-A", macro_categoria: "Formazione Sicurezza" };
  const corsoDl = { codice: "DL-BAS-16", macro_categoria: "Formazione Sicurezza" };
  const corsoCantiere = { codice: "LAV-PLE-II-831", macro_categoria: "Cantieri" };
  const corsoPreposto = { codice: "PRP-BAS-12", macro_categoria: "Preposti" };

  it("Pulsante «Tutti» (null): include qualsiasi corso", () => {
    expect(appartieneAGruppo(corsoLav, null)).toBe(true);
    expect(appartieneAGruppo(corsoAspp, null)).toBe(true);
    expect(appartieneAGruppo(corsoDl, null)).toBe(true);
    expect(appartieneAGruppo(corsoCantiere, null)).toBe(true);
  });

  it("Pulsante 1 «Sicurezza lavoratori»: esclude categoricamente 10 (ASPP/DL) e 11 (Cantieri)", () => {
    expect(appartieneAGruppo(corsoLav, 1)).toBe(true);
    expect(appartieneAGruppo(corsoAspp, 1)).toBe(false);
    expect(appartieneAGruppo(corsoDl, 1)).toBe(false);
    expect(appartieneAGruppo(corsoCantiere, 1)).toBe(false);
    expect(appartieneAGruppo(corsoPreposto, 1)).toBe(false);
  });

  it("Pulsante 10 «DL - Dir - ASPP - RSPP»: include solo corsi DL, DIR, ASPP, RSPP", () => {
    expect(appartieneAGruppo(corsoAspp, 10)).toBe(true);
    expect(appartieneAGruppo(corsoDl, 10)).toBe(true);
    expect(appartieneAGruppo(corsoLav, 10)).toBe(false);
    expect(appartieneAGruppo(corsoCantiere, 10)).toBe(false);
  });

  it("Pulsante 11 «Cantieri»: include solo corsi con codice LAV- o categoria Cantieri", () => {
    expect(appartieneAGruppo(corsoCantiere, 11)).toBe(true);
    expect(appartieneAGruppo(corsoLav, 11)).toBe(false);
    expect(appartieneAGruppo(corsoAspp, 11)).toBe(false);
  });
});

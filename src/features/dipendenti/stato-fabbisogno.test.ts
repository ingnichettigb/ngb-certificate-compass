/*
 * File:          stato-fabbisogno.test.ts
 * Percorso:      src/features/dipendenti/stato-fabbisogno.test.ts
 * Data creazione: 2026-11-22
 * Stato di un corso per un lavoratore: il corso svolto si riconosce per codice (base e aggiornamento hanno lo stesso nome), la famiglia di
 * un aggiornamento di attrezzatura è la sua attrezzatura, e un corso non ancora svolto può essere «in attesa» di un prerequisito.
 * Revisioni:
 *   - Rev 1 (2026-11-22): Prima stesura.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Attestato } from "@/lib/api/attestati";
import type { TipoCorso } from "@/lib/api/tipi-corso";
import { valutaStatoFabbisognoCorso } from "./stato-fabbisogno";

const OGGI = "2026-11-22";
const NOME = "Carriponte (CP) CABINA - Parte II – 8.3.11";
const corso = (codice: string | null, nome_corso = NOME, extra: Record<string, unknown> = {}) =>
  ({ id: `c-${codice ?? nome_corso}`, codice, nome_corso, macro_categoria: "Sicurezza Lavoratori", durata_validita_anni: 5, livello_specifico: "Base", ...extra }) as unknown as TipoCorso;
const att = (codice: string | null, data_corso: string, scadenza: string | null, nome_corso = NOME, extra: Record<string, unknown> = {}) =>
  ({
    id: `a-${codice}-${data_corso}`, dipendente_id: "d1", stato_validazione: "Approvato", data_corso, data_scadenza_calcolata: scadenza,
    tipi_corso: { id: `c-${codice}`, codice, nome_corso, macro_categoria: "Sicurezza Lavoratori", durata_validita_anni: 5, ore_aggiornamento: 4, ore_minime_legge: 4, livello_specifico: "Base", ...extra },
    ...extra,
  }) as unknown as Attestato;
const valuta = (c: TipoCorso, attestati: Attestato[], attesa: string | null = null) =>
  valutaStatoFabbisognoCorso({ corso: c, attestati, dipendenteId: "d1", oggi: OGGI, attesa });

const BASE = "LAV-CAR-CP-II-8311";
const AGG = "LAV-CAR-CP-II-8311-AGG";

describe("corsi con lo stesso nome: si distinguono per codice", () => {
  const baseSvolto = att(BASE, "2024-03-01", "2029-03-01");

  it("il corso base svolto è valido", () => {
    expect(valuta(corso(BASE), [baseSvolto]).stato).toBe("valido");
  });

  it("con solo il corso base svolto, l'aggiornamento NON risulta valido: è l'aggiornamento ancora da fare", () => {
    const e = valuta(corso(AGG), [baseSvolto]);
    expect(e.stato).not.toBe("valido");
    expect(e.stato).toBe("in_corso");
  });

  it("l'aggiornamento svolto è valido", () => {
    expect(valuta(corso(AGG), [att(AGG, "2026-01-10", "2031-01-10")]).stato).toBe("valido");
  });

  it("un'altra attrezzatura con lo stesso nome (PLE / PLES) non vale come questa", () => {
    const ple = att("LAV-PLE-II-831", "2024-03-01", "2029-03-01", "PLE con e senza stabilizzatori");
    const e = valuta(corso("LAV-PLES-II-831", "PLE con e senza stabilizzatori"), [ple]);
    expect(e.stato).toBe("mancante");
  });

  it("senza codici resta il riconoscimento per nome (catalogo vecchio)", () => {
    expect(valuta(corso(null, "Corso vecchio"), [att(null, "2024-03-01", "2029-03-01", "Corso vecchio")]).stato).toBe("valido");
  });
});

describe("famiglia dell'aggiornamento", () => {
  it("l'aggiornamento della formazione Lavoratore non guarda gli attestati delle attrezzature", () => {
    const e = valuta(corso("SIC-AGG-06", "Aggiornamento lavoratori"), [att(BASE, "2024-03-01", "2029-03-01")]);
    expect(e.stato).toBe("mancante");
  });

  it("l'aggiornamento di un'attrezzatura non guarda la formazione del Lavoratore", () => {
    const e = valuta(corso(AGG), [att("SIC-SPE-08", "2024-01-10", "2029-01-10", "Specifica rischio medio")]);
    expect(e.stato).toBe("mancante");
  });

  it("base scaduto: l'aggiornamento di quell'attrezzatura risulta da fare, scaduto", () => {
    const e = valuta(corso(AGG), [att(BASE, "2019-05-02", "2024-05-02")]);
    expect(e.stato).toBe("scaduto");
  });
});

describe("in attesa del prerequisito", () => {
  it("corso mai svolto e prerequisito mancante: «in attesa», grigio, con il motivo", () => {
    const e = valuta(corso(BASE), [], "manca il corso base (SIC-GEN-04)");
    expect(e).toMatchObject({ stato: "in_attesa", colore: "grigio", etichettaData: "in attesa" });
    expect(e.descrizione).toContain("manca il corso base (SIC-GEN-04)");
  });

  it("senza prerequisito mancante resta «da svolgere»", () => {
    expect(valuta(corso(BASE), [], null).stato).toBe("mancante");
  });

  it("se il corso risulta già svolto, il prerequisito non cambia lo stato", () => {
    expect(valuta(corso(BASE), [att(BASE, "2024-03-01", "2029-03-01")], "manca il corso base").stato).toBe("valido");
    expect(valuta(corso(BASE), [att(BASE, "2019-05-02", "2024-05-02")], "manca il corso base").stato).toBe("scaduto");
  });
});

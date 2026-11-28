/*
 * File:      ruolo-corsi.test.ts
 * Percorso:  src/features/scadenze/ruolo-corsi.test.ts
 * Revisione: 1 — 28/11/2026 09:11
 * Data creazione: 28/11/2026 09:11
 * Test del legame ruolo → corsi usato dal filtro «Ruolo» della pagina Scadenze.
 * Revisioni:
 * - Rev 1 (28/11/2026 09:11): Prima stesura.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { AssegnazioneRuolo, Attestato, RuoloSicurezza } from "@/lib/api";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import {
  elencoCorsiDelRuolo,
  haIncaricoAssegnato,
  legameCorsoRuolo,
  mappaIncarichiAssegnati,
  ruoliPerFiltro,
} from "./ruolo-corsi";

const ruolo = (id: string, nome: string, codice: string | null, extra: Partial<RuoloSicurezza> = {}): RuoloSicurezza => ({
  id,
  nome,
  descrizione: null,
  macro_categoria: nome,
  obbligatorio_tutti: false,
  attivo: true,
  ordine: 1,
  codice,
  ...extra,
});

const regola = (ruolo_codice: string, corso_base: string | null, corso_aggiornamento: string | null, ordine = 1): RegolaRuoloCorso => ({
  id: `${ruolo_codice}-${ordine}`,
  ruolo_codice,
  parametro: "corsi",
  valore: "",
  corso_base,
  corso_aggiornamento,
  ordine,
});

const corso = (codice: string | null, nome: string, livello = "Base") => ({
  nome_corso: nome,
  macro_categoria: "M",
  livello_specifico: livello,
  codice,
});

const att = (id: string, tc: ReturnType<typeof corso>) => ({ id, tipi_corso: tc }) as unknown as Attestato;

const ANT = ruolo("r-ant", "Addetto antincendio", "ADD-ANTINCENDIO", { ordine: 2 });
const PSO = ruolo("r-pso", "Addetto primo soccorso", "ADD-PRIMO-SOCCORSO", { ordine: 1 });
const VECCHIO = ruolo("r-old", "Ruolo disattivato", "OLD", { attivo: false });
const SENZA_CORSI = ruolo("r-vuoto", "Ruolo senza corsi", "VUOTO", { ordine: 3 });
const catalogo = [ANT, PSO, VECCHIO, SENZA_CORSI];
const regole = [
  regola("ADD-ANTINCENDIO", "ANT-BASE", "ANT-AGG"),
  regola("ADD-PRIMO-SOCCORSO", "PSO-BASE", "PSO-AGG"),
];

describe("legameCorsoRuolo (con Tabella 02)", () => {
  it("riconosce base e aggiornamento del ruolo dal codice del corso", () => {
    expect(legameCorsoRuolo(corso("ANT-BASE", "A"), ANT, catalogo, regole)).toBe("base");
    expect(legameCorsoRuolo(corso("ant-agg", "A agg", "Aggiornamento"), ANT, catalogo, regole)).toBe("aggiornamento");
  });
  it("un corso di un altro ruolo, senza codice o assente dalla tabella non appartiene al ruolo", () => {
    expect(legameCorsoRuolo(corso("PSO-BASE", "P"), ANT, catalogo, regole)).toBeNull();
    expect(legameCorsoRuolo(corso(null, "Senza codice"), ANT, catalogo, regole)).toBeNull();
    expect(legameCorsoRuolo(corso("ZZZ-1", "Fuori tabella"), ANT, catalogo, regole)).toBeNull();
    expect(legameCorsoRuolo(null, ANT, catalogo, regole)).toBeNull();
  });
  it("un ruolo senza codice non ha corsi", () => {
    expect(legameCorsoRuolo(corso("ANT-BASE", "A"), ruolo("r-x", "X", null), catalogo, regole)).toBeNull();
  });
});

describe("legameCorsoRuolo (senza Tabella 02: riconoscimento di prima)", () => {
  const cat = [ruolo("r-prep", "Preposto", null)];
  it("usa il nome del ruolo e distingue l'aggiornamento", () => {
    expect(legameCorsoRuolo(corso("X-1", "Preposto"), cat[0]!, cat, undefined)).toBe("base");
    expect(legameCorsoRuolo(corso("X-1-AGG", "Preposto", "Base"), cat[0]!, cat, [])).toBe("aggiornamento");
    expect(legameCorsoRuolo(corso("X-2", "Altro"), cat[0]!, cat, undefined)).toBeNull();
  });
});

describe("ruoliPerFiltro", () => {
  it("solo ruoli attivi con corsi nella Tabella 02, nell'ordine di tabella", () => {
    expect(ruoliPerFiltro(catalogo, regole).map((r) => r.id)).toEqual(["r-pso", "r-ant"]);
  });
  it("senza Tabella 02 propone tutti i ruoli attivi", () => {
    expect(ruoliPerFiltro(catalogo, undefined).map((r) => r.id)).toEqual(["r-pso", "r-ant", "r-vuoto"]);
  });
});

describe("incarico realmente assegnato", () => {
  const assegnazioni: AssegnazioneRuolo[] = [{ id: "a1", dipendente_id: "d1", ruolo_id: "r-ant" }];
  const mappa = mappaIncarichiAssegnati(assegnazioni);
  it("vale solo con la riga in dipendenti_ruoli", () => {
    expect(haIncaricoAssegnato("d1", ANT, mappa)).toBe(true);
    expect(haIncaricoAssegnato("d2", ANT, mappa)).toBe(false);
    expect(haIncaricoAssegnato(null, ANT, mappa)).toBe(false);
  });
  it("un ruolo obbligatorio per tutti vale per chiunque", () => {
    expect(haIncaricoAssegnato("d9", ruolo("r-lav", "Lavoratore", "LAVORATORE", { obbligatorio_tutti: true }), mappa)).toBe(true);
  });
});

describe("elencoCorsiDelRuolo", () => {
  it("propone solo i corsi del ruolo: prima i base, poi gli aggiornamenti, senza doppioni", () => {
    const attestati = [
      att("1", corso("ANT-AGG", "Antincendio aggiornamento", "Aggiornamento")),
      att("2", corso("ANT-BASE", "Antincendio base")),
      att("3", corso("PSO-BASE", "Primo soccorso")),
      att("4", corso("ANT-BASE", "  antincendio BASE ")),
      att("5", corso(null, "Senza codice")),
    ];
    expect(elencoCorsiDelRuolo(attestati, ANT, catalogo, regole)).toEqual(["Antincendio base", "Antincendio aggiornamento"]);
  });
});

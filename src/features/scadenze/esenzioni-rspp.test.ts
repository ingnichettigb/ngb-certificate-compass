/*
 * File:      esenzioni-rspp.test.ts
 * Percorso:  src/features/scadenze/esenzioni-rspp.test.ts
 * Data creazione: 2026-11-10
 * Regola: chi ha un RSPP valido e fa il Preposto deve il corso Preposto base, non l'aggiornamento Preposto.
 */
import { describe, expect, it } from "vitest";
import type { Attestato, RuoloSicurezza, TipoCorso } from "@/lib/api";
import { isCorsoObbligatorioPerDipendente } from "@/features/dipendenti/matrice/mappatura-ruoli-corsi";
import { valutaStatoFabbisognoCorso } from "@/features/dipendenti/stato-fabbisogno";
import {
  eAggiornamentoPreposto,
  famigliaAsppRspp,
  mappaValiditaRspp,
  validitaRspp,
} from "./esenzioni-rspp";
import { applicaScadenzaPreposti } from "./preposti";
import { chiaveGruppo, costruisciRighe } from "./raggruppa";

const OGGI = new Date("2026-11-10T10:00:00");
const OGGI_ISO = "2026-11-10";

function att(
  id: string,
  dip: string,
  codice: string,
  macro: string,
  livello: string,
  data: string,
  scadenza: string | null,
  extra: Partial<Attestato> = {},
): Attestato {
  return {
    id,
    dipendente_id: dip,
    codice_fiscale: `CF-${dip}`,
    tipo_corso_id: `t-${codice}`,
    data_corso: data,
    data_scadenza_calcolata: scadenza,
    ore_dichiarate: null,
    stato_validazione: "Approvato",
    created_at: data,
    tipi_corso: {
      id: `t-${codice}`,
      nome_corso: codice.startsWith("PRP-AGG") ? "Aggiornamento Preposti" : codice,
      codice,
      macro_categoria: macro,
      livello_specifico: livello,
      durata_validita_anni: 5,
      ore_aggiornamento: 6,
      ore_minime_legge: 6,
    },
    ...extra,
  } as unknown as Attestato;
}

const prepBase = (dip: string, data = "2020-03-10") =>
  att(`pb-${dip}`, dip, "PRP-BAS-12", "Preposto", "Base", data, "2025-03-10");
const rsppC = (dip: string, scad: string | null = "2030-06-01", extra: Partial<Attestato> = {}) =>
  att(`rc-${dip}`, dip, "SIC-RSPP-C", "Sicurezza Lavoratori", "BASE", "2025-06-01", scad, extra);
const rsppA = (dip: string) =>
  att(`ra-${dip}`, dip, "SIC-RSPP-A", "Sicurezza Lavoratori", "Base", "2019-01-01", null);

describe("riconoscimento dei corsi", () => {
  it("distingue aggiornamento e base del Preposto", () => {
    expect(eAggiornamentoPreposto({ codice: "PRP-AGG-06", nome_corso: "Aggiornamento Preposti", macro_categoria: "Preposto" })).toBe(true);
    expect(eAggiornamentoPreposto({ codice: "PRP-BAS-12", nome_corso: "Preposto base 12h", macro_categoria: "Preposto" })).toBe(false);
    expect(eAggiornamentoPreposto({ codice: "SIC-AGG-06", nome_corso: "Aggiornamento Lavoratori", macro_categoria: "Sicurezza Lavoratori" })).toBe(false);
  });
  it("riconosce la famiglia ASPP / RSPP dal codice", () => {
    expect(famigliaAsppRspp({ codice: "SIC-RSPP-B-SP3" })).toBe("RSPP");
    expect(famigliaAsppRspp({ codice: "sic-aspp-a" })).toBe("ASPP");
    expect(famigliaAsppRspp({ codice: "SIC-GEN-04" })).toBeNull();
  });
});

describe("RSPP valido", () => {
  it("vale con modulo C approvato e non scaduto, o con aggiornamento RSPP", () => {
    expect(validitaRspp("d1", [rsppC("d1")], OGGI_ISO)).toEqual({ fino: "2030-06-01" });
    const agg = att("g", "d1", "SIC-RSPP-AGG", "Sicurezza Lavoratori", "COMUNE", "2026-01-01", "2031-01-01");
    expect(validitaRspp("d1", [agg], OGGI_ISO)).toEqual({ fino: "2031-01-01" });
  });
  it("con più attestati prende la scadenza più lontana", () => {
    const agg = att("g", "d1", "SIC-RSPP-AGG", "Sicurezza Lavoratori", "COMUNE", "2026-01-01", "2031-01-01");
    expect(validitaRspp("d1", [rsppC("d1"), agg], OGGI_ISO)).toEqual({ fino: "2031-01-01" });
  });
  it("non vale se scaduto, non approvato, o con il solo modulo A/B", () => {
    expect(validitaRspp("d1", [rsppC("d1", "2026-11-09")], OGGI_ISO)).toBeNull();
    expect(validitaRspp("d1", [rsppC("d1", "2030-06-01", { stato_validazione: "In attesa" })], OGGI_ISO)).toBeNull();
    expect(validitaRspp("d1", [rsppC("d1", "2030-06-01", { stato_validazione: "Respinto" })], OGGI_ISO)).toBeNull();
    expect(validitaRspp("d1", [rsppA("d1")], OGGI_ISO)).toBeNull();
    const b = att("b", "d1", "SIC-RSPP-B", "Sicurezza Lavoratori", "COMUNE", "2025-01-01", "2030-01-01");
    expect(validitaRspp("d1", [b], OGGI_ISO)).toBeNull();
  });
  it("vale anche l'ASPP: modulo B o aggiornamento ASPP", () => {
    const aspB = att("ab", "d1", "SIC-ASPP-B", "Sicurezza Lavoratori", "COMUNE", "2025-03-01", "2030-03-01");
    expect(validitaRspp("d1", [aspB], OGGI_ISO)).toEqual({ fino: "2030-03-01" });
    const aspAgg = att("aa", "d1", "SIC-ASPP-AGG", "Sicurezza Lavoratori", "COMUNE", "2026-02-01", "2031-02-01");
    expect(validitaRspp("d1", [aspAgg], OGGI_ISO)).toEqual({ fino: "2031-02-01" });
  });
  it("l'ASPP non basta con il solo modulo A o con i moduli specialistici", () => {
    const aspA = att("a", "d1", "SIC-ASPP-A", "Sicurezza Lavoratori", "Base", "2019-01-01", null);
    const sp = att("s", "d1", "SIC-ASPP-B-SP1", "Sicurezza Lavoratori", "SPECIALISTICO", "2025-01-01", "2030-01-01");
    expect(validitaRspp("d1", [aspA, sp], OGGI_ISO)).toBeNull();
  });
  it("è per lavoratore: l'RSPP di un collega non esonera", () => {
    expect(mappaValiditaRspp([rsppC("d2")], OGGI_ISO).has("d1")).toBe(false);
  });
});

describe("cicli: ASPP e RSPP non si mescolano ai lavoratori", () => {
  it("chiave di gruppo separata per famiglia", () => {
    const lav = att("l", "d1", "SIC-GEN-04", "Sicurezza Lavoratori", "Base", "2024-01-01", null);
    expect(chiaveGruppo(rsppC("d1"))).not.toBe(chiaveGruppo(lav));
    expect(chiaveGruppo(rsppC("d1"))).toBe(chiaveGruppo(rsppA("d1")));
  });
});

describe("Scadenze: Preposto con RSPP valido", () => {
  it("senza RSPP il ciclo Preposto è scaduto; con RSPP valido no, e la scadenza è quella dell'RSPP", () => {
    const solo = costruisciRighe([prepBase("d1")], OGGI).find((r) => r.attestato.id === "pb-d1")!;
    expect(solo.ciclo.stato).toBe("scaduto_sanabile");
    expect(solo.ciclo.esenteRspp).toBeUndefined();

    const con = costruisciRighe([prepBase("d1"), rsppC("d1")], OGGI).find((r) => r.attestato.id === "pb-d1")!;
    expect(con.ciclo.stato).toBe("valido");
    expect(con.ciclo.scadenzaEffettiva).toBe("2030-06-01");
    expect(con.ciclo.esenteRspp).toBe(true);
    expect(con.ciclo.motivoScadenza).toContain("RSPP/ASPP valido fino al 01/06/2030");
  });
  it("Preposto con ASPP valido: aggiornamento non dovuto", () => {
    const aspB = att("ab", "d1", "SIC-ASPP-B", "Sicurezza Lavoratori", "COMUNE", "2025-03-01", "2030-03-01");
    const r = costruisciRighe([prepBase("d1"), aspB], OGGI).find((x) => x.attestato.id === "pb-d1")!;
    expect(r.ciclo.stato).toBe("valido");
    expect(r.ciclo.scadenzaEffettiva).toBe("2030-03-01");
    expect(r.ciclo.esenteRspp).toBe(true);
  });
  it("RSPP scaduto: il Preposto torna scaduto", () => {
    const r = costruisciRighe([prepBase("d1"), rsppC("d1", "2026-01-01")], OGGI).find((x) => x.attestato.id === "pb-d1")!;
    expect(r.ciclo.stato).toBe("scaduto_sanabile");
  });
  it("RSPP di un altro lavoratore non cambia nulla", () => {
    const r = costruisciRighe([prepBase("d1"), rsppC("d2")], OGGI).find((x) => x.attestato.id === "pb-d1")!;
    expect(r.ciclo.stato).toBe("scaduto_sanabile");
  });
  it("il Preposto base decaduto (oltre 10 anni) va comunque rifatto", () => {
    const vecchio = prepBase("d1", "2010-01-10");
    const r = costruisciRighe([vecchio, rsppC("d1")], OGGI).find((x) => x.attestato.id === "pb-d1")!;
    expect(r.ciclo.esenteRspp).toBeUndefined();
    expect(["decaduto", "scaduto_sanabile"]).toContain(r.ciclo.stato);
    expect(r.ciclo.richiedeNuovoCorsoBase || r.ciclo.stato === "decaduto").toBe(true);
  });
  it("la scheda dipendente e le stampe vedono la stessa scadenza (RSPP cercato anche se si passano solo i Preposti)", () => {
    const [p] = applicaScadenzaPreposti([prepBase("d1"), rsppC("d1")], OGGI).filter((a) => a.id === "pb-d1");
    expect(p!.data_scadenza_calcolata).toBe("2030-06-01");
  });
  it("gli attestati RSPP restano con la loro scadenza", () => {
    const r = applicaScadenzaPreposti([prepBase("d1"), rsppC("d1")], OGGI).find((a) => a.id === "rc-d1")!;
    expect(r.data_scadenza_calcolata).toBe("2030-06-01");
  });
});

describe("Fabbisogno e matrice", () => {
  const corso = (codice: string, nome: string, livello: string) =>
    ({ id: `t-${codice}`, codice, nome_corso: nome, macro_categoria: "Preposto", livello_specifico: livello }) as unknown as TipoCorso;
  const base = corso("PRP-BAS-12", "Preposto base", "Base");
  const agg = corso("PRP-AGG-06", "Aggiornamento Preposti", "Aggiornamento");
  const ruoloPreposto = { id: "r-prep", nome: "Preposto", macro_categoria: "Preposto", obbligatorio_tutti: false, attivo: true, ordine: 1 } as RuoloSicurezza;
  const assegnato = new Set(["d1_r-prep"]);

  it("fabbisogno: aggiornamento esente (grigio), base normale", () => {
    const v = { fino: "2030-06-01" };
    expect(valutaStatoFabbisognoCorso({ corso: agg, attestati: [], dipendenteId: "d1", oggi: OGGI_ISO, rspp: v })).toMatchObject({ stato: "esente", colore: "grigio" });
    expect(valutaStatoFabbisognoCorso({ corso: base, attestati: [], dipendenteId: "d1", oggi: OGGI_ISO, rspp: v }).stato).toBe("mancante");
    expect(valutaStatoFabbisognoCorso({ corso: agg, attestati: [], dipendenteId: "d1", oggi: OGGI_ISO }).stato).toBe("mancante");
  });
  it("matrice: con RSPP valido il base è obbligatorio e l'aggiornamento no", () => {
    const v = { fino: null };
    expect(isCorsoObbligatorioPerDipendente("d1", base, [ruoloPreposto], assegnato, v)).toBe(true);
    expect(isCorsoObbligatorioPerDipendente("d1", agg, [ruoloPreposto], assegnato, v)).toBe(false);
    expect(isCorsoObbligatorioPerDipendente("d1", agg, [ruoloPreposto], assegnato, null)).toBe(true);
  });
});

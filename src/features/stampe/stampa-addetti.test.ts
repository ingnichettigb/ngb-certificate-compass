/*
 * File:      stampa-addetti.test.ts
 * Percorso:  src/features/stampe/stampa-addetti.test.ts
 * Data creaz: 22/11/2026
 * Revisioni:
 *   rev 2 — 22/11/2026 — Tutte le righe dei lavoratori scelti (Bertuccioli: «Manca corso base» + aggiornamento).
 *   rev 1 — 22/11/2026 — Viste «Tutti gli addetti» / «Richiedono formazione» della carta defibrillatore: conteggi, esclusività, «Manca» in rosso, ricalcolo senza finestra.
 */
import { describe, expect, it } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import { calcolaRighe } from "./dati-stampa";
import { contaVistaAddetti, richiedeFormazione, righePerVistaAddetti } from "./stampa-addetti";
import { trovaPredefinita } from "./stampe-predefinite";

const OGGI = new Date("2026-11-22T10:00:00");

function dip(id: string): Dipendente {
  return {
    id, cognome: id, nome: "X", codice_fiscale: `CF${id}`, email: null, reparto: "ATA", sottoreparto: null, classe_concorso: null, materia: null,
    luogo_nascita: "Roma", data_nascita: "1980-01-01", data_assunzione: "2020-09-01", stato_lavoratore: "in_forza",
  } as unknown as Dipendente;
}

function att(id: string, d: Dipendente, codice: string, livello: string, data: string, scad: string | null): Attestato {
  return {
    id, dipendente_id: d.id, codice_fiscale: d.codice_fiscale, tipo_corso_id: `t-${codice}`, data_corso: data, data_scadenza_calcolata: scad,
    ore_dichiarate: 5, stato_validazione: "Approvato", created_at: data,
    dipendenti: { id: d.id, cognome: d.cognome, nome: d.nome, codice_fiscale: d.codice_fiscale, reparto: d.reparto, sottoreparto: null, classe_concorso: null, stato_lavoratore: "in_forza" },
    tipi_corso: { id: `t-${codice}`, nome_corso: codice, codice, macro_categoria: "Defibrillatore", livello_specifico: livello, durata_validita_anni: 5, ore_aggiornamento: 3, ore_minime_legge: 5 },
  } as unknown as Attestato;
}

const ruoloDae = { id: "r-dae", nome: "Addetto BLSD / Defibrillatore", descrizione: null, macro_categoria: "Defibrillatore", obbligatorio_tutti: false, attivo: true, ordine: 0, codice: "ADD-DAE" } as never;
const defib = trovaPredefinita("scadenze-defibrillatore")!;

// Valido (scade 2030), In scadenza (entro 9 mesi), Scaduto, Senza corso, Aggiornamento senza base.
const valido = dip("Valido");
const inScad = dip("InScadenza");
const scaduto = dip("Scaduto");
const senza = dip("Senza");
const soloAgg = dip("SoloAgg");
const tutti = [valido, inScad, scaduto, senza, soloAgg];
const attestati = [
  att("1", valido, "BLS-BAS-05", "Base", "2025-06-01", "2030-06-01"),
  att("2", inScad, "BLS-BAS-05", "Base", "2021-12-20", "2026-12-20"),
  att("3", scaduto, "BLS-BAS-05", "Base", "2019-01-10", "2024-01-10"),
  att("4", soloAgg, "BLS-AGG-02", "Aggiornamento", "2025-02-10", "2030-02-10"),
];
const assegnazioni = tutti.map((d) => ({ id: `x-${d.id}`, dipendente_id: d.id, ruolo_id: "r-dae" }));

function righeMotore() {
  return calcolaRighe(attestati, { ...defib.filtri, senzaFinestra: true }, OGGI, assegnazioni, null, [ruoloDae], tutti);
}

describe("carta defibrillatore: due viste esclusive", () => {
  it("la carta ha la barra delle due viste e conserva i filtri di prima", () => {
    expect(defib.vistaAddetti).toBe(true);
    expect(defib.filtri).toMatchObject({ gruppo: "defibrillatore", soloIncarichi: true, conMancanti: true, finestra: "365" });
  });

  it("senza il flag la finestra di 12 mesi esclude i corsi validi lontani; con il flag ci sono tutti", () => {
    const con12Mesi = calcolaRighe(attestati, defib.filtri, OGGI, assegnazioni, null, [ruoloDae], tutti);
    expect(con12Mesi.some((r) => r.dipendenteId === "Valido")).toBe(false);
    expect(righeMotore().some((r) => r.dipendenteId === "Valido")).toBe(true);
  });

  it("«Tutti gli addetti»: tutta la squadra; chi ha solo l'aggiornamento ha due righe, chi non ha corso «Manca»", () => {
    const r = righePerVistaAddetti(righeMotore(), "tutti");
    expect([...new Set(r.map((x) => x.dipendenteId))].sort()).toEqual(["InScadenza", "Scaduto", "Senza", "SoloAgg", "Valido"]);
    expect(r.filter((x) => x.dipendenteId === "SoloAgg").map((x) => x.stato)).toEqual(["manca", "senza_scadenza"]);
    expect(r.filter((x) => x.dipendenteId === "Senza").map((x) => x.stato)).toEqual(["manca"]);
    expect(r.find((x) => x.dipendenteId === "Scaduto")!.stato).toBe("scaduto");
    expect(r.find((x) => x.dipendenteId === "Valido")!.stato).toBe("valido");
  });

  it("«Richiedono formazione»: scaduti e chi non ha il corso; non gli «In scadenza» né i validi", () => {
    const r = righePerVistaAddetti(righeMotore(), "formazione");
    expect([...new Set(r.map((x) => x.dipendenteId))].sort()).toEqual(["Scaduto", "Senza", "SoloAgg"]);
    expect(r.filter((x) => x.dipendenteId === "SoloAgg")).toHaveLength(2);
  });

  it("le due viste si escludono: la seconda è un sottoinsieme della prima e i conteggi coincidono con le righe", () => {
    const motore = righeMotore();
    const c = contaVistaAddetti(motore);
    expect(c).toEqual({ tutti: 5, formazione: 3 });
    const distinti = (v: "tutti" | "formazione") => new Set(righePerVistaAddetti(motore, v).map((x) => x.dipendenteId)).size;
    expect(distinti("tutti")).toBe(c.tutti);
    expect(distinti("formazione")).toBe(c.formazione);
  });

  it("chi ha solo l'aggiornamento compare con «Manca corso base»", () => {
    const r = righePerVistaAddetti(righeMotore(), "formazione").find((x) => x.dipendenteId === "SoloAgg" && x.stato === "manca")!;
    expect(r.stato).toBe("manca");
    expect(r.testoManca).toBeTruthy();
  });

  it("richiedeFormazione", () => {
    expect(richiedeFormazione([{ stato: "valido" }, { stato: "in_scadenza" }])).toBe(false);
    expect(richiedeFormazione([{ stato: "valido" }, { stato: "scaduto" }])).toBe(true);
    expect(richiedeFormazione([{ stato: "manca" }])).toBe(true);
  });
});

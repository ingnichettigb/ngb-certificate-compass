/*
 * File:      dati-stampa.test.ts
 * Percorso:  src/features/stampe/dati-stampa.test.ts
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Test filtri stampe.
 *   rev 2 — 03/11/2026 20:50 — Test scadenza 9 mesi, filtro ruolo, elenco lavoratori, esportazione colonne visibili.
 */
import { describe, expect, it } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import { calcolaRighe, calcolaRigheLavoratori, FILTRI_INIZIALI } from "./dati-stampa";
import { nomeFileEsportazione, testoCsv } from "./esporta-file";

const oggi = new Date("2026-11-02T10:00:00");
function att(id: string, dip: string, cod: string, data: string, scad: string | null, extra: Partial<Attestato> = {}): Attestato {
  return {
    id, dipendente_id: dip, codice_fiscale: "", tipo_corso_id: cod, data_corso: data, data_scadenza_calcolata: scad,
    ore_dichiarate: 4, url_foto_fronte: null, url_foto_retro: null, stato_validazione: "Approvato", note_rifiuto: null,
    data_validazione: null, created_at: data,
    dipendenti: { id: dip, cognome: dip, nome: "X", codice_fiscale: "", email: null, reparto: "ATA", sottoreparto: null, classe_concorso: null, materia: null, luogo_nascita: null, data_nascita: null, stato_lavoratore: "in_forza" },
    tipi_corso: { id: cod, nome_corso: cod, codice: cod, macro_categoria: "", livello_specifico: "", ore_minime_legge: null, durata_validita_anni: null, ordine: 0, anni_aggiornamento: null, ore_aggiornamento: null } as never,
    ...extra,
  };
}
function dip(id: string, cognome: string, extra: Partial<Dipendente> = {}): Dipendente {
  return { id, cognome, nome: "N", codice_fiscale: `CF${id}`, email: null, reparto: "ATA", sottoreparto: "Collaboratore scolastico", classe_concorso: null, materia: null, luogo_nascita: null, data_nascita: null, stato_lavoratore: "in_forza", ...extra };
}

describe("calcolaRighe", () => {
  it("filtra solo antincendio", () => {
    const r = calcolaRighe([att("1", "Rossi", "VFF-FOR1-4", "2024-01-01", null), att("2", "Rossi", "PSO-GAB-16", "2024-01-01", null)], { ...FILTRI_INIZIALI, gruppo: "antincendio" }, oggi);
    expect(r.map((x) => x.id)).toEqual(["1"]);
  });
  it("tiene solo l'ultimo attestato per corso", () => {
    const r = calcolaRighe([att("1", "Rossi", "SIC-GEN-04", "2020-01-01", null), att("2", "Rossi", "SIC-GEN-04", "2024-01-01", null)], FILTRI_INIZIALI, oggi);
    expect(r.map((x) => x.id)).toEqual(["2"]);
  });
  it("scaduti: solo scadenza passata", () => {
    const r = calcolaRighe([att("1", "A", "A", "2020-01-01", "2026-10-01"), att("2", "B", "B", "2020-01-01", "2026-12-01")], { ...FILTRI_INIZIALI, finestra: "scaduti" }, oggi);
    expect(r.map((x) => x.id)).toEqual(["1"]);
  });
  it("entro 9 mesi: include scadenza a 8 mesi, esclude a 10 mesi", () => {
    const r = calcolaRighe([att("1", "A", "A", "2020-01-01", "2027-07-02"), att("2", "B", "B", "2020-01-01", "2027-09-02")], { ...FILTRI_INIZIALI, finestra: "270" }, oggi);
    expect(r.map((x) => x.id)).toEqual(["1"]);
  });
  it("filtro ruolo: solo chi ha il ruolo assegnato", () => {
    const r = calcolaRighe([att("1", "A", "A", "2024-01-01", null), att("2", "B", "B", "2024-01-01", null)], { ...FILTRI_INIZIALI, ruoloId: "R1" }, oggi, [{ id: "x", dipendente_id: "B", ruolo_id: "R1" }]);
    expect(r.map((x) => x.id)).toEqual(["2"]);
  });
  it("esclude i cessati se non richiesti", () => {
    const a = att("1", "A", "A", "2020-01-01", null);
    a.dipendenti!.stato_lavoratore = "cessato";
    expect(calcolaRighe([a], FILTRI_INIZIALI, oggi)).toHaveLength(0);
    expect(calcolaRighe([a], { ...FILTRI_INIZIALI, includiCessati: true }, oggi)).toHaveLength(1);
  });
});

describe("elenco lavoratori in servizio", () => {
  const elenco = [dip("1", "Verdi"), dip("2", "Bianchi", { stato_lavoratore: "cessato" }), dip("3", "Rossi", { reparto: "Docente", sottoreparto: null, classe_concorso: "A027", materia: "Matematica" })];
  it("esclude i cessati e ordina per cognome", () => {
    const r = calcolaRigheLavoratori(elenco, { ...FILTRI_INIZIALI, modello: "lavoratori" });
    expect(r.map((x) => x.cognome)).toEqual(["Rossi", "Verdi"]);
  });
  it("mansione: profilo ATA o classe – materia", () => {
    const r = calcolaRigheLavoratori(elenco, { ...FILTRI_INIZIALI, modello: "lavoratori" });
    expect(r.map((x) => x.mansione)).toEqual(["A027 – Matematica", "Collaboratore scolastico"]);
  });
});

describe("esportazione", () => {
  it("il CSV contiene solo le colonne visibili", () => {
    const r = calcolaRigheLavoratori([dip("1", "Verdi")], { ...FILTRI_INIZIALI, modello: "lavoratori" });
    expect(testoCsv(r, ["lavoratore", "reparto"])).toBe('"Lavoratore";"Reparto"\r\n"Verdi N";"ATA"');
  });
  it("nome file con prefisso e timestamp AAMMGGhhmm", () => {
    expect(nomeFileEsportazione("elenco", "xlsx", new Date(2026, 10, 3, 20, 5))).toBe("030ArchAttestati_2611032005_elenco.xlsx");
  });
});

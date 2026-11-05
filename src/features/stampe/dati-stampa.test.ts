/*
 * File:      dati-stampa.test.ts
 * Percorso:  src/features/stampe/dati-stampa.test.ts
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Test filtri stampe.
 *   rev 2 — 03/11/2026 20:50 — Test scadenza 9 mesi, filtro ruolo, elenco lavoratori, esportazione colonne visibili.
 *   rev 3 — 05/11/2026 18:30 — Test nuovi arrivati (periodi, filtro righe) e colonne nascita / corsi Sì-No.
 *   rev 4 — 05/11/2026 19:50 — Test anagrafica incompleta, colonne dinamiche, titolo, messaggi vuoti, passaggio automatico modello.
 */
import { describe, expect, it } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import {
  calcolaRighe, calcolaRigheLavoratori, campiMancanti, cella, colonnePerVista, conSelezione, FILTRI_INIZIALI,
  inizioPeriodoArrivi, messaggioVuoto, nuoviArrivati, titoloStampa,
} from "./dati-stampa";
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

describe("nuovi arrivati dell'anno", () => {
  const adesso = new Date("2026-11-05T10:00:00");
  const elenco = [
    dip("1", "Nuovo", { data_assunzione: "2026-09-10" }),
    dip("2", "Vecchio", { data_assunzione: "2020-09-01" }),
    dip("3", "SenzaData"),
    dip("4", "Gennaio", { data_assunzione: "2026-02-01" }),
    dip("5", "Cessato", { data_assunzione: "2026-10-01", stato_lavoratore: "cessato" }),
  ];
  it("anno scolastico: dal 1 settembre, esclusi cessati, conta chi non ha la data", () => {
    const r = nuoviArrivati(elenco, "scolastico", adesso);
    expect([...r.ids!]).toEqual(["1"]);
    expect(r.inizio).toBe("2026-09-01");
    expect(r.senzaData).toBe(1);
  });
  it("anno scolastico a gennaio parte dal settembre precedente", () => {
    expect(inizioPeriodoArrivi("scolastico", new Date("2027-01-15T10:00:00"))).toBe("2026-09-01");
  });
  it("anno solare: dal 1 gennaio", () => {
    expect([...nuoviArrivati(elenco, "solare", adesso).ids!].sort()).toEqual(["1", "4"]);
  });
  it("selezione spenta: nessun limite", () => {
    expect(nuoviArrivati(elenco, "no", adesso).ids).toBeNull();
  });
  it("limita anche le righe degli attestati", () => {
    const r = calcolaRighe([att("a", "1", "SIC-GEN-04", "2026-09-20", null), att("b", "2", "SIC-GEN-04", "2024-01-01", null)], FILTRI_INIZIALI, adesso, [], new Set(["1"]));
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });
  it("colonne dedicate solo per elenco lavoratori con selezione attiva", () => {
    const base = { ...FILTRI_INIZIALI, modello: "lavoratori" as const };
    expect(colonnePerVista({ ...base, arrivi: "scolastico" })).toContain("nascita");
    expect(colonnePerVista({ ...base, arrivi: "scolastico" })).toContain("assunzione");
    expect(colonnePerVista(base)).not.toContain("nascita");
    expect(colonnePerVista({ ...base, modello: "registro", arrivi: "scolastico" })).not.toContain("nascita");
  });
  it("nascita e corsi: Sì con data, Scaduto, No", () => {
    const d = dip("1", "Nuovo", { luogo_nascita: "Milano", data_nascita: "1990-03-12", data_assunzione: "2026-09-10" });
    const attestati = [
      att("a", "1", "SIC-GEN-04", "2026-09-20", null),
      att("b", "1", "VFF-FOR1-4", "2020-01-10", "2025-01-10"),
      att("c", "1", "PSO-GAB-16", "2026-10-02", "2029-10-02"),
    ];
    const [r] = calcolaRigheLavoratori([d], { ...FILTRI_INIZIALI, modello: "lavoratori" }, [], [], attestati, null, adesso);
    expect(cella(r!, "nascita")).toBe("Milano, 12/03/1990");
    expect(cella(r!, "corsoBase")).toBe("Sì – 20/09/2026");
    expect(cella(r!, "corsoSpecifico")).toBe("No");
    expect(cella(r!, "preposto")).toBe("No");
    expect(cella(r!, "antincendio")).toBe("Scaduto – 10/01/2020");
    expect(cella(r!, "primoSoccorso")).toBe("Sì – 02/10/2026");
  });
});

const completo = (id: string, extra: Partial<Dipendente> = {}) =>
  dip(id, `C${id}`, { nome: "Nome", luogo_nascita: "Milano", data_nascita: "1980-01-01", data_assunzione: "2020-09-01", tipo_contratto: "indeterminato", ...extra });

describe("anagrafica incompleta", () => {
  it("un ATA completo, a tempo indeterminato e senza email non manca di nulla", () => {
    expect(campiMancanti(completo("1"))).toEqual([]);
  });
  it("segnala i campi sempre dovuti", () => {
    expect(campiMancanti(completo("1", { nome: "", data_assunzione: null, data_nascita: null }))).toEqual(["nome", "data_nascita", "data_assunzione"]);
  });
  it("profilo solo per ATA; classe e materia solo per Docente", () => {
    expect(campiMancanti(completo("1", { sottoreparto: null }))).toEqual(["sottoreparto"]);
    expect(campiMancanti(completo("2", { reparto: "Docente", sottoreparto: null, classe_concorso: null, materia: null }))).toEqual(["classe_concorso", "materia"]);
  });
  it("fine contratto solo a tempo determinato, cessazione solo per i cessati", () => {
    expect(campiMancanti(completo("1", { tipo_contratto: "determinato" }))).toEqual(["data_fine_contratto"]);
    expect(campiMancanti(completo("2", { stato_lavoratore: "cessato" }))).toEqual(["data_cessazione"]);
  });
  it("l'elenco mostra solo gli incompleti, con colonna «Cosa manca» e solo le colonne dei dati mancanti", () => {
    const elenco = [completo("1"), completo("2", { data_nascita: null }), completo("3", { data_assunzione: null })];
    const f = { ...FILTRI_INIZIALI, modello: "lavoratori" as const, incompleta: true };
    const r = calcolaRigheLavoratori(elenco, f);
    expect(r.map((x) => x.cognome)).toEqual(["C2", "C3"]);
    const col = colonnePerVista(f, r);
    expect(col).toEqual(["lavoratore", "cf", "reparto", "mancano", "nascita", "assunzione"]);
    expect(cella(r[0]!, "mancano")).toBe("Data di nascita");
    expect(cella(r[0]!, "nascita")).toBe("Milano, MANCA data");
    expect(cella(r[1]!, "assunzione")).toBe("MANCA");
  });
  it("il filtro vale anche per i modelli basati sugli attestati", () => {
    const a1 = att("a", "1", "SIC-GEN-04", "2026-01-01", null);
    const a2 = att("b", "2", "SIC-GEN-04", "2026-01-01", null);
    a1.dipendenti = { ...(a1.dipendenti as Dipendente), ...completo("1") };
    const r = calcolaRighe([a1, a2], { ...FILTRI_INIZIALI, incompleta: true }, oggi);
    expect(r.map((x) => x.id)).toEqual(["b"]);
  });
});

describe("selezioni: modello, titolo, messaggi", () => {
  it("accendendo la prima selezione passa all'elenco lavoratori e spegnendo l'ultima torna al modello di prima", () => {
    const acceso = conSelezione({ ...FILTRI_INIZIALI, modello: "registro" }, { arrivi: "scolastico" });
    expect(acceso.modello).toBe("lavoratori");
    const due = conSelezione(acceso, { incompleta: true });
    expect(due.modello).toBe("lavoratori");
    const uno = conSelezione(due, { arrivi: "no" });
    expect(uno.modello).toBe("lavoratori");
    expect(conSelezione(uno, { incompleta: false }).modello).toBe("registro");
  });
  it("se hai cambiato modello a mano, spegnere non lo cambia", () => {
    const acceso = conSelezione(FILTRI_INIZIALI, { incompleta: true });
    expect(conSelezione({ ...acceso, modello: "scadenze" }, { incompleta: false }).modello).toBe("scadenze");
  });
  it("titoli dinamici", () => {
    const l = { ...FILTRI_INIZIALI, modello: "lavoratori" as const };
    const adesso = new Date("2026-11-05T10:00:00");
    expect(titoloStampa({ ...l, arrivi: "scolastico" }, adesso)).toBe("Elenco nuovi arrivati – anno scolastico 2026/27");
    expect(titoloStampa({ ...l, arrivi: "solare" }, adesso)).toBe("Elenco nuovi arrivati – anno 2026");
    expect(titoloStampa({ ...l, incompleta: true }, adesso)).toBe("Lavoratori con anagrafica incompleta");
    expect(titoloStampa({ ...FILTRI_INIZIALI, arrivi: "scolastico" }, adesso)).toBe("Registro integrale della formazione – nuovi arrivati");
  });
  it("messaggi di elenco vuoto", () => {
    expect(messaggioVuoto({ arrivi: "scolastico", incompleta: false }, "2026-09-01", 14)).toContain("14 lavoratori non hanno la data di assunzione");
    expect(messaggioVuoto({ arrivi: "no", incompleta: true }, null, 0)).toBe("Tutte le anagrafiche sono complete con i filtri scelti.");
    expect(messaggioVuoto({ arrivi: "no", incompleta: false }, null, 0)).toBeUndefined();
  });
});

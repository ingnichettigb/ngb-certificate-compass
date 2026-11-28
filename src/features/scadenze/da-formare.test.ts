/*
 * File:      da-formare.test.ts
 * Percorso:  src/features/scadenze/da-formare.test.ts
 * Revisione: 1 — 28/11/2026 10:01
 * Data creazione: 28/11/2026 10:01
 * Test delle righe «Da formare / Mancanti» (da-formare.ts) e della vista corrispondente in filtraScadenze.
 * Revisioni:
 * - Rev 1 (28/11/2026 10:01): Prima stesura.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Attestato, Dipendente, TipoCorso } from "@/lib/api";
import { calcolaRigheDaFormare, nomiCorsiDaFormare, testoDaSvolgere } from "./da-formare";
import { filtraScadenze } from "./filtri";
import { TUTTI, VISTA_DA_FORMARE } from "./types";

const OGGI = new Date("2026-11-28T12:00:00");

const dip = (id: string, cognome: string, extra: Partial<Dipendente> = {}): Dipendente => ({
  id,
  codice_fiscale: "CF" + id,
  cognome,
  nome: "NOME",
  email: null,
  reparto: "Docente",
  sottoreparto: null,
  classe_concorso: null,
  materia: null,
  luogo_nascita: null,
  data_nascita: null,
  stato_lavoratore: "in_forza",
  ...extra,
});

const corso = (id: string, nome: string, macro: string, livello: string, codice: string, ordine = 1): TipoCorso => ({
  id,
  nome_corso: nome,
  macro_categoria: macro,
  livello_specifico: livello,
  ore_minime_legge: 8,
  durata_validita_anni: 5,
  codice,
  ordine,
  anni_aggiornamento: null,
  ore_aggiornamento: null,
  codice_corso_aggiornamento: null,
  visibile_lavoratore: true,
});

const PREPOSTO_BASE = corso("c1", "Preposto", "Preposto", "base", "PRP-BAS-08", 1);
const PREPOSTO_AGG = corso("c2", "Aggiornamento Preposto", "Preposto", "aggiornamento", "PRP-AGG-06", 2);
const PRIMO_SOCC = corso("c3", "Primo soccorso", "Primo soccorso", "base", "PSO-GAA-12", 3);
const CORSI = [PREPOSTO_AGG, PRIMO_SOCC, PREPOSTO_BASE];

const attestato = (d: Dipendente, c: TipoCorso, stato: Attestato["stato_validazione"] = "Approvato"): Attestato => ({
  id: `a-${d.id}-${c.id}`,
  dipendente_id: d.id,
  codice_fiscale: d.codice_fiscale,
  tipo_corso_id: c.id,
  data_corso: "2024-01-10",
  data_scadenza_calcolata: null,
  ore_dichiarate: 8,
  url_foto_fronte: "x.pdf",
  url_foto_retro: null,
  stato_validazione: stato,
  note_rifiuto: null,
  data_validazione: null,
  created_at: "2024-01-10",
  dipendenti: d,
  tipi_corso: c,
});

/** Tutti i corsi sono dovuti a tutti, salvo la lista data (default: solo i corsi Preposto). */
const dovuti = (...ids: string[]) => (_d: string, c: TipoCorso) => ids.includes(c.id);

describe("calcolaRigheDaFormare", () => {
  it("un lavoratore con l'incarico e nessun attestato genera una riga «Da formare» con il corso di partenza", () => {
    const bianchi = dip("1", "BIANCHI", { data_assunzione: "2022-09-01" });
    const righe = calcolaRigheDaFormare({
      dipendenti: [bianchi],
      corsi: CORSI,
      attestati: [],
      haObbligoCorso: dovuti("c1", "c2"),
      oggi: OGGI,
    });
    // Base e aggiornamento dello stesso ciclo: una sola riga, con il base
    expect(righe).toHaveLength(1);
    const r = righe[0]!;
    expect(r.ciclo.stato).toBe("da_formare");
    expect(r.attestato.tipi_corso?.nome_corso).toBe("Preposto");
    expect(r.attestatiGruppo.map((a) => a.tipi_corso?.codice)).toEqual(["PRP-AGG-06", "PRP-BAS-08"]);
    expect(r.daFormare?.dataAssunzione).toBe("2022-09-01");
    expect(r.ciclo.scadenzaEffettiva).toBe("2022-09-01");
    expect(r.attestato.data_corso).toBe("");
  });

  it("se è dovuto solo l'aggiornamento e il ciclo è vuoto, la riga mostra l'aggiornamento", () => {
    const righe = calcolaRigheDaFormare({
      dipendenti: [dip("1", "BIANCHI")],
      corsi: CORSI,
      attestati: [],
      haObbligoCorso: dovuti("c2"),
      oggi: OGGI,
    });
    expect(righe).toHaveLength(1);
    expect(righe[0]!.attestato.tipi_corso?.codice).toBe("PRP-AGG-06");
  });

  it("chi ha già un attestato nel ciclo (anche solo il base) non genera la riga: c'è già quella del motore", () => {
    const rossi = dip("1", "ROSSI");
    const righe = calcolaRigheDaFormare({
      dipendenti: [rossi],
      corsi: CORSI,
      attestati: [attestato(rossi, PREPOSTO_BASE)],
      haObbligoCorso: dovuti("c1", "c2"),
      oggi: OGGI,
    });
    expect(righe).toHaveLength(0);
  });

  it("un attestato respinto non conta, uno in attesa sì", () => {
    const a = dip("1", "ALFA");
    const b = dip("2", "BETA");
    const righe = calcolaRigheDaFormare({
      dipendenti: [a, b],
      corsi: CORSI,
      attestati: [attestato(a, PREPOSTO_BASE, "Respinto"), attestato(b, PREPOSTO_BASE, "In attesa")],
      haObbligoCorso: dovuti("c1"),
      oggi: OGGI,
    });
    expect(righe.map((r) => r.attestato.dipendenti?.cognome)).toEqual(["ALFA"]);
  });

  it("i cicli diversi sono righe diverse: il Primo soccorso mancante resta anche se c'è il Preposto", () => {
    const rossi = dip("1", "ROSSI");
    const righe = calcolaRigheDaFormare({
      dipendenti: [rossi],
      corsi: CORSI,
      attestati: [attestato(rossi, PREPOSTO_BASE)],
      haObbligoCorso: dovuti("c1", "c3"),
      oggi: OGGI,
    });
    expect(righe.map((r) => r.attestato.tipi_corso?.nome_corso)).toEqual(["Primo soccorso"]);
  });

  it("esclude i cessati, gli esenti e i corsi in attesa della formazione Lavoratore", () => {
    const cessato = dip("1", "CESSATO", { stato_lavoratore: "cessato" });
    const esente = dip("2", "ESENTE");
    const attesa = dip("3", "ATTESA");
    const righe = calcolaRigheDaFormare({
      dipendenti: [cessato, esente, attesa],
      corsi: CORSI,
      attestati: [],
      haObbligoCorso: dovuti("c2"),
      motivoEsenzione: (d) => (d === "2" ? "RSPP valido" : null),
      motivoInAttesa: (d) => (d === "3" ? "manca la formazione Lavoratore" : null),
      oggi: OGGI,
    });
    expect(righe).toHaveLength(0);
  });

  it("non genera nulla per i corsi non dovuti", () => {
    const righe = calcolaRigheDaFormare({
      dipendenti: [dip("1", "ROSSI")],
      corsi: CORSI,
      attestati: [],
      haObbligoCorso: () => false,
      oggi: OGGI,
    });
    expect(righe).toHaveLength(0);
  });

  it("senza data di assunzione il testo è solo «Da svolgere»", () => {
    expect(testoDaSvolgere(null)).toBe("Da svolgere");
    expect(testoDaSvolgere("2022-09-01")).toBe("Da svolgere entro 01/09/2022");
    const righe = calcolaRigheDaFormare({
      dipendenti: [dip("1", "ROSSI", { data_assunzione: "  " })],
      corsi: CORSI,
      attestati: [],
      haObbligoCorso: dovuti("c1"),
      oggi: OGGI,
    });
    expect(righe[0]!.daFormare?.dataAssunzione).toBeNull();
    expect(righe[0]!.ciclo.scadenzaEffettiva).toBeNull();
  });
});

describe("vista «Da formare / Mancanti» in filtraScadenze", () => {
  const dipendenti = [
    dip("1", "ZETA", { reparto: "ATA", data_assunzione: "2020-01-15" }),
    dip("2", "ALFA", { reparto: "Docente", data_assunzione: "2023-03-01" }),
    dip("3", "MEDIO", { reparto: "Docente" }),
  ];
  const righeDaFormare = calcolaRigheDaFormare({
    dipendenti,
    corsi: CORSI,
    attestati: [],
    haObbligoCorso: dovuti("c1", "c3"),
    oggi: OGGI,
  });
  const base = {
    attestati: [] as Attestato[],
    q: "",
    reparto: TUTTI,
    corsoSelezionato: TUTTI,
    sortCol: "dipendente" as const,
    sortDir: "asc" as const,
    oggi: OGGI,
    soloIncarichiAssegnati: false,
    righeDaFormare,
  };

  it("mostra le righe «Da formare» (una per lavoratore e ciclo) ordinate per dipendente", () => {
    const r = filtraScadenze({ ...base, vista: VISTA_DA_FORMARE });
    expect(r.map((x) => `${x.attestato.dipendenti?.cognome}|${x.attestato.tipi_corso?.nome_corso}`)).toEqual([
      "ALFA|Preposto",
      "ALFA|Primo soccorso",
      "MEDIO|Preposto",
      "MEDIO|Primo soccorso",
      "ZETA|Preposto",
      "ZETA|Primo soccorso",
    ]);
  });

  it("filtra per reparto, corso e ricerca", () => {
    expect(filtraScadenze({ ...base, vista: VISTA_DA_FORMARE, reparto: "ATA" })).toHaveLength(2);
    expect(filtraScadenze({ ...base, vista: VISTA_DA_FORMARE, corsoSelezionato: "Primo soccorso" })).toHaveLength(3);
    expect(filtraScadenze({ ...base, vista: VISTA_DA_FORMARE, q: "zeta" })).toHaveLength(2);
  });

  it("ordina per scadenza (data di assunzione): chi non ha la data va in fondo", () => {
    const r = filtraScadenze({ ...base, vista: VISTA_DA_FORMARE, corsoSelezionato: "Preposto", sortCol: "scadenza" });
    expect(r.map((x) => x.attestato.dipendenti?.cognome)).toEqual(["ZETA", "ALFA", "MEDIO"]);
  });

  it("le altre viste ignorano le righe «Da formare»", () => {
    expect(filtraScadenze({ ...base, vista: "Scaduti" })).toHaveLength(0);
    expect(filtraScadenze({ ...base, vista: "Tutti con scadenza" })).toHaveLength(0);
  });

  it("nomiCorsiDaFormare elenca i corsi attesi", () => {
    expect(nomiCorsiDaFormare(righeDaFormare)).toEqual(["Preposto", "Primo soccorso"]);
  });
});

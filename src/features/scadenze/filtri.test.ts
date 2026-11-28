/*
 * File:      filtri.test.ts
 * Percorso:  src/features/scadenze/filtri.test.ts
 * Revisione: 3 — 28/11/2026 09:11
 * Test delle funzioni pure dei filtri della pagina Scadenze.
 * - Rev (2026-11-06 16:00): Adeguato alle righe raggruppate (RigaScadenzaDati) e al motore dei cicli;
 *   aggiunti test su raggruppamento, decadenza e regola Preposti.
 * - Rev (2026-11-06 18:30): Test del filtro «Solo incarichi attualmente assegnati».
 * - Rev 3 (28/11/2026 09:11): Test del filtro «Ruolo», delle viste «Scaduti o in scadenza» e dell'ordinamento «ruolo».
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { AssegnazioneRuolo, Attestato, RuoloSicurezza } from "@/lib/api";
import { elencoCorsi, elencoReparti, filtraScadenze } from "./filtri";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
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

describe("filtraScadenze: solo incarichi attualmente assegnati", () => {
  const ruolo = (id: string, nome: string, obbligatorio_tutti = false): RuoloSicurezza => ({
    id,
    nome,
    descrizione: null,
    macro_categoria: nome,
    obbligatorio_tutti,
    attivo: true,
    ordine: 1,
  });
  const catalogo = [ruolo("r-prep", "Preposto"), ruolo("r-lav", "Lavoratore", true)];
  // d1 = ex Preposto (nessuna assegnazione), d2 = Preposto attuale, d3 = Lavoratore (obbligatorio per tutti)
  const dati = [
    att("1", "Quanzo", "ATA", "Preposto", "2021-01-01", 2),
    att("2", "Rossi", "ATA", "Preposto", "2021-01-01", 2),
    att("3", "Bianchi", "ATA", "Lavoratore", "2021-01-01", 5),
  ];
  const assegnazioni: AssegnazioneRuolo[] = [{ id: "a1", dipendente_id: "d2", ruolo_id: "r-prep" }];
  const f = (extra: Partial<Parameters<typeof filtraScadenze>[0]>) =>
    filtraScadenze({ ...base, attestati: dati, ruoliCatalogo: catalogo, assegnazioni, ...extra }).map((r) => r.attestato.id);

  it("attiva: nasconde il Preposto non più assegnato, mantiene assegnato e obbligatori per tutti", () => {
    expect(f({ soloIncarichiAssegnati: true }).sort()).toEqual(["2", "3"]);
  });
  it("attiva di default", () => {
    expect(f({}).sort()).toEqual(["2", "3"]);
  });
  it("disattivata: mostra l'intero parco attestati storici", () => {
    expect(f({ soloIncarichiAssegnati: false }).sort()).toEqual(["1", "2", "3"]);
  });
  it("catalogo ruoli vuoto: nessun filtro (comportamento precedente)", () => {
    expect(f({ ruoliCatalogo: [] }).sort()).toEqual(["1", "2", "3"]);
  });
  it("corso senza ruolo riconosciuto: la riga resta visibile", () => {
    const altri = [att("4", "Verdi", "ATA", "Corso generico", "2021-01-01", 5)];
    const ids = filtraScadenze({ ...base, attestati: altri, ruoliCatalogo: catalogo, assegnazioni: [] }).map((r) => r.attestato.id);
    expect(ids).toEqual(["4"]);
  });
});

describe("filtraScadenze: viste «Scaduti o in scadenza»", () => {
  // Oggi = 20/10/2026. Corsi da 5 anni: la scadenza è la data del corso + 5 anni.
  const dati = [
    att("scaduto", "A", "ATA", "X", "2021-10-19"),
    att("90gg", "C", "ATA", "X", "2022-01-18"),
    att("oltre90", "D", "ATA", "X", "2022-01-19"),
    att("6mesi", "E", "ATA", "X", "2022-04-20"),
    att("oltre1anno", "G", "ATA", "X", "2022-10-21"),
  ];
  const ids = (vista: Vista) => filtraScadenze({ ...base, attestati: dati, vista, sortCol: "scadenza" }).map((r) => r.attestato.id);
  it("90 gg: scaduti e in scadenza entro 90 giorni", () => {
    expect(ids("Scaduti o in scadenza (90 gg)")).toEqual(["scaduto", "90gg"]);
  });
  it("6 mesi", () => {
    expect(ids("Scaduti o in scadenza (6 mesi)")).toEqual(["scaduto", "90gg", "oltre90", "6mesi"]);
  });
  it("1 anno: tutto tranne chi scade oltre un anno", () => {
    expect(ids("Scaduti o in scadenza (1 anno)")).toEqual(["scaduto", "90gg", "oltre90", "6mesi"]);
  });
  it("è l'unione esatta delle viste «Scaduti» e «In scadenza»", () => {
    const unione = [...ids("Scaduti"), ...ids("In scadenza (1 anno)")].sort();
    expect(ids("Scaduti o in scadenza (1 anno)").sort()).toEqual(unione);
  });
});

describe("filtraScadenze: filtro Ruolo", () => {
  const ruolo = (id: string, nome: string, codice: string): RuoloSicurezza => ({
    id,
    nome,
    descrizione: null,
    macro_categoria: nome,
    obbligatorio_tutti: false,
    attivo: true,
    ordine: 1,
    codice,
  });
  const PREP = ruolo("r-prep", "Preposto", "PREPOSTO");
  const ANT = ruolo("r-ant", "Antincendio", "ADD-ANTINCENDIO");
  const catalogo = [PREP, ANT];
  const regola = (ruolo_codice: string, corso_base: string | null, corso_aggiornamento: string | null): RegolaRuoloCorso => ({
    id: ruolo_codice,
    ruolo_codice,
    parametro: "corsi",
    valore: "",
    corso_base,
    corso_aggiornamento,
    ordine: 1,
  });
  const tc = (nome: string, macro: string, codice: string, livello = "Base") => ({
    nome_corso: nome,
    macro_categoria: macro,
    livello_specifico: livello,
    codice,
    durata_validita_anni: 5,
    ore_aggiornamento: 6,
    ore_minime_legge: 6,
  });

  // Senza Tabella 02 (riconoscimento per nome). d1 ex Preposto non assegnato, d2 Preposto assegnato, d3 Antincendio assegnato.
  const dati = [
    att("1", "Quanzo", "ATA", "Preposto", "2021-01-01", 2),
    att("2", "Rossi", "ATA", "Preposto", "2021-01-01", 2),
    att("3", "Bianchi", "ATA", "Antincendio", "2021-01-01", 5),
    // d2 ha anche un corso Antincendio, ma l'incarico Antincendio NON gli è assegnato
    att("4", "Rossi", "ATA", "Antincendio", "2021-01-01", 5, { dipendente_id: "d2", tipo_corso_id: "t4" }),
  ];
  const assegnazioni: AssegnazioneRuolo[] = [
    { id: "a1", dipendente_id: "d2", ruolo_id: "r-prep" },
    { id: "a2", dipendente_id: "d3", ruolo_id: "r-ant" },
  ];
  const f = (extra: Partial<Parameters<typeof filtraScadenze>[0]>) =>
    filtraScadenze({ ...base, attestati: dati, ruoliCatalogo: catalogo, assegnazioni, ...extra }).map((r) => r.attestato.id);

  it("mostra solo chi ha l'incarico realmente assegnato e solo i corsi di quel ruolo", () => {
    expect(f({ ruoloSelezionato: "r-prep" })).toEqual(["2"]);
    expect(f({ ruoloSelezionato: "r-ant" })).toEqual(["3"]);
  });
  it("l'incarico assegnato è richiesto anche con la spunta «Solo incarichi» disattivata", () => {
    expect(f({ ruoloSelezionato: "r-prep", soloIncarichiAssegnati: false })).toEqual(["2"]);
  });
  it("senza ruolo (TUTTI) il comportamento resta quello di prima", () => {
    expect(f({ ruoloSelezionato: TUTTI, soloIncarichiAssegnati: false }).sort()).toEqual(["1", "2", "3", "4"]);
  });
  it("ruolo non presente nel catalogo: nessun risultato (mai l'elenco completo)", () => {
    expect(f({ ruoloSelezionato: "r-inesistente" })).toEqual([]);
  });
  it("ruolo + corso: il corso va cercato tra i corsi del ruolo", () => {
    expect(f({ ruoloSelezionato: "r-prep", corsoSelezionato: "Preposto" })).toEqual(["2"]);
    expect(f({ ruoloSelezionato: "r-prep", corsoSelezionato: "Antincendio" })).toEqual([]);
  });
  it("ruolo + reparto", () => {
    expect(f({ ruoloSelezionato: "r-prep", reparto: "ATA" })).toEqual(["2"]);
    expect(f({ ruoloSelezionato: "r-prep", reparto: "Docente" })).toEqual([]);
  });

  describe("con la Tabella 02", () => {
    const regole = [regola("ADD-ANTINCENDIO", "ANT-BASE", "ANT-AGG"), regola("PREPOSTO", "PRP-BASE", "PRP-AGG")];
    // Stesso lavoratore e stessa macro-categoria: un corso del ruolo (2021) e un altro corso più recente (2024).
    const doppio = [
      att("A", "Verdi", "ATA", "x", "2021-01-01", 5, { dipendente_id: "dv", tipo_corso_id: "tA", tipi_corso: tc("Antincendio base", "M", "ANT-BASE") }),
      att("B", "Verdi", "ATA", "x", "2024-01-01", 5, { dipendente_id: "dv", tipo_corso_id: "tB", tipi_corso: tc("Altro corso", "M", "XYZ-1") }),
    ];
    const ass: AssegnazioneRuolo[] = [{ id: "a", dipendente_id: "dv", ruolo_id: "r-ant" }];
    const g = (extra: Partial<Parameters<typeof filtraScadenze>[0]>) =>
      filtraScadenze({ ...base, attestati: doppio, ruoliCatalogo: catalogo, assegnazioni: ass, regole, ...extra });

    it("la riga mostra il corso del ruolo, non un altro corso più recente dello stesso gruppo", () => {
      const righe = g({ ruoloSelezionato: "r-ant" });
      expect(righe).toHaveLength(1);
      expect(righe[0]!.attestato.id).toBe("A");
      expect(righe[0]!.attestatiGruppo).toHaveLength(2);
    });
    it("un corso fuori dalla Tabella 02 non può essere scelto nel ruolo", () => {
      expect(g({ ruoloSelezionato: "r-ant", corsoSelezionato: "Altro corso" })).toHaveLength(0);
      expect(g({ ruoloSelezionato: "r-ant", corsoSelezionato: "Antincendio base" })).toHaveLength(1);
    });
    it("un ruolo che non cita nessun corso del gruppo non mostra nulla", () => {
      expect(g({ ruoloSelezionato: "r-prep", assegnazioni: [{ id: "b", dipendente_id: "dv", ruolo_id: "r-prep" }] })).toHaveLength(0);
    });
  });

  describe("ordinamento «ruolo»: per persona, poi per data", () => {
    const regole = [regola("ADD-ANTINCENDIO", "ANT-BASE", "ANT-AGG")];
    const ordine = [
      att("r2", "Rossi", "ATA", "x", "2022-01-01", 5, { dipendente_id: "dr", tipo_corso_id: "t1", tipi_corso: tc("Antincendio base", "M1", "ANT-BASE") }),
      att("r1", "Rossi", "ATA", "x", "2021-01-01", 5, { dipendente_id: "dr", tipo_corso_id: "t2", tipi_corso: tc("Antincendio base", "M2", "ANT-BASE") }),
      att("b1", "Bianchi", "ATA", "x", "2023-01-01", 5, { dipendente_id: "db", tipo_corso_id: "t3", tipi_corso: tc("Antincendio base", "M1", "ANT-BASE") }),
    ];
    const ass: AssegnazioneRuolo[] = [
      { id: "1", dipendente_id: "dr", ruolo_id: "r-ant" },
      { id: "2", dipendente_id: "db", ruolo_id: "r-ant" },
    ];
    const ids = (sortDir: "asc" | "desc") =>
      filtraScadenze({ ...base, attestati: ordine, ruoliCatalogo: catalogo, assegnazioni: ass, regole, ruoloSelezionato: "r-ant", sortCol: "ruolo", sortDir }).map((r) => r.attestato.id);
    it("persone in ordine alfabetico; nella stessa persona prima la data più vecchia", () => {
      expect(ids("asc")).toEqual(["b1", "r1", "r2"]);
    });
    it("la direzione si inverte", () => {
      expect(ids("desc")).toEqual(["r2", "r1", "b1"]);
    });
  });
});

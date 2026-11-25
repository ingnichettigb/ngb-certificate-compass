/*
 * File:           categorie-corso.test.ts
 * Percorso:       src/features/selezione-corso/categorie-corso.test.ts
 * Data creazione: 22/11/2026
 * Test delle regole pure dell'elenco corsi con categorie (dati ricalcati sul catalogo reale del 22/11/2026).
 * Revisioni:
 *   rev 1 — 22/11/2026 — Prima versione.
 */
import { describe, expect, it } from "vitest";
import {
  categoriaCorso,
  categorieDisponibili,
  categorieValide,
  corsoAbilitato,
  costruisciLegami,
  eAggiornamento,
  elencoCorsi,
  type CorsoSelezionabile,
} from "./categorie-corso";

const c = (
  id: string,
  codice: string,
  nome_corso: string,
  macro_categoria: string,
  livello_specifico = "Base",
  ore: number | null = 4,
): CorsoSelezionabile => ({
  id,
  codice,
  nome_corso,
  macro_categoria,
  livello_specifico,
  ore_minime_legge: ore,
});

const CORSI = [
  c("1", "SIC-GEN-04", "Sicurezza Generale", "Sicurezza Lavoratori"),
  c("2", "SIC-AGG-06", "Aggiornamento Lavoratori", "Sicurezza Lavoratori", "Aggiornamento", 6),
  c(
    "3",
    "LAV-PLE-II-831",
    "Piattaforme (PLE) - Parte II – 8.3.1",
    "Sicurezza Lavoratori",
    "Specifico",
    8,
  ),
  c(
    "4",
    "LAV-PLE-II-831-AGG",
    "Piattaforme (PLE) - Parte II – 8.3.1",
    "Sicurezza Lavoratori",
    "Specifico",
    4,
  ),
  c("5", "PRP-BAS-12", "Preposto", "Preposto", "Specifico", 12),
  c("6", "COVID19-02", "COVID19 CORSO 2H", "COVID", "Base", 2),
  c("7", "PRIVACY-B04", "PRIVACY CORSO BASE 4 H", "PRIVACY"),
  c(
    "8",
    "EME-EAA-02",
    "Aggiornamento Evacuazione / Emergenze dell'Istituto",
    "Emergenze",
    "Base",
    2,
  ),
  c("9", "BLS-BAS-05", "Uso del DAE (BLSD)", "Defibrillatore", "Base", 5),
];

const RUOLI = [
  { codice: "LAVORATORE", macro_categoria: "Sicurezza Lavoratori", attivo: true },
  { codice: "PREPOSTO", macro_categoria: "Sicurezza Lavoratori", attivo: true },
  { codice: "OPER-PLE-II-831", macro_categoria: "Attrezzature", attivo: true },
  { codice: "INC-PRIVACY", macro_categoria: "Privacy", attivo: true },
  { codice: "ADD-DAE", macro_categoria: "Defibrillatore", attivo: false },
];
const REGOLE = [
  { ruolo_codice: "LAVORATORE", corso_base: "SIC-GEN-04", corso_aggiornamento: "SIC-AGG-06" },
  {
    ruolo_codice: "OPER-PLE-II-831",
    corso_base: "LAV-PLE-II-831",
    corso_aggiornamento: "LAV-PLE-II-831-AGG",
  },
  { ruolo_codice: "PREPOSTO", corso_base: "PRP-BAS-12", corso_aggiornamento: null },
  { ruolo_codice: "INC-PRIVACY", corso_base: "PRIVACY-B04", corso_aggiornamento: null },
  { ruolo_codice: "ADD-DAE", corso_base: "BLS-BAS-05", corso_aggiornamento: null },
  { ruolo_codice: "RUOLO_INESISTENTE", corso_base: "COVID19-02", corso_aggiornamento: null },
];
const LEGAMI = costruisciLegami(REGOLE, RUOLI);

describe("categoriaCorso", () => {
  it("le attrezzature LAV- stanno in «Attrezzature», non in «Sicurezza Lavoratori»", () => {
    expect(categoriaCorso(CORSI[2]!, LEGAMI)).toBe("Attrezzature");
    expect(categoriaCorso(CORSI[3]!, LEGAMI)).toBe("Attrezzature");
    expect(categoriaCorso(CORSI[0]!, LEGAMI)).toBe("Sicurezza Lavoratori");
  });
  it("Preposto resta «Preposto» anche se il suo ruolo è nella categoria Sicurezza Lavoratori", () => {
    expect(categoriaCorso(CORSI[4]!, LEGAMI)).toBe("Preposto");
  });
  it("senza legami usa la categoria del corso; categoria vuota = Altro", () => {
    expect(categoriaCorso(CORSI[2]!)).toBe("Sicurezza Lavoratori");
    expect(categoriaCorso({ ...CORSI[0]!, macro_categoria: "  " }, LEGAMI)).toBe("Altro");
  });
});

describe("corsoAbilitato", () => {
  it("abilitato se almeno un ruolo collegato è attivo; senza ruolo resta abilitato", () => {
    expect(corsoAbilitato(CORSI[0]!, LEGAMI)).toBe(true);
    expect(corsoAbilitato(CORSI[5]!, LEGAMI)).toBe(true); // COVID: nessun ruolo valido collegato
  });
  it("non abilitato se tutti i ruoli collegati sono disattivati", () => {
    expect(corsoAbilitato(CORSI[8]!, LEGAMI)).toBe(false);
  });
});

describe("eAggiornamento", () => {
  it("riconosce livello, codice e nome", () => {
    expect(eAggiornamento(CORSI[1]!)).toBe(true); // livello
    expect(eAggiornamento(CORSI[3]!)).toBe(true); // codice …-AGG
    expect(eAggiornamento(CORSI[7]!)).toBe(true); // nome «Aggiornamento …»
    expect(eAggiornamento(CORSI[0]!)).toBe(false);
    expect(eAggiornamento(CORSI[4]!)).toBe(false);
  });
});

describe("categorieDisponibili", () => {
  it("alfabetiche, con conteggio, senza i corsi non abilitati", () => {
    const cat = categorieDisponibili(CORSI, LEGAMI);
    expect(cat.map((x) => x.nome)).toEqual([
      "Attrezzature",
      "COVID",
      "Emergenze",
      "Preposto",
      "PRIVACY",
      "Sicurezza Lavoratori",
    ]);
    expect(cat.find((x) => x.nome === "Attrezzature")?.corsi).toBe(2);
    expect(cat.some((x) => x.nome === "Defibrillatore")).toBe(false);
  });
  it("unisce le varianti di maiuscole", () => {
    const cat = categorieDisponibili([
      c("a", "A-1", "Uno", "Privacy"),
      c("b", "A-2", "Due", "PRIVACY"),
    ]);
    expect(cat).toHaveLength(1);
    expect(cat[0]!.corsi).toBe(2);
  });
});

describe("elencoCorsi", () => {
  it("prima i corsi, poi tutti gli aggiornamenti, ciascun gruppo in ordine di codice", () => {
    const e = elencoCorsi(CORSI, { legami: LEGAMI });
    expect(e.ultimo).toBeNull();
    expect(e.corsi.map((x) => x.codice)).toEqual([
      "COVID19-02",
      "LAV-PLE-II-831",
      "PRIVACY-B04",
      "PRP-BAS-12",
      "SIC-GEN-04",
    ]);
    expect(e.aggiornamenti.map((x) => x.codice)).toEqual([
      "EME-EAA-02",
      "LAV-PLE-II-831-AGG",
      "SIC-AGG-06",
    ]);
  });
  it("categoria scelta: solo quei corsi; due categorie: l'unione; nessuna: tutte", () => {
    const una = elencoCorsi(CORSI, { legami: LEGAMI, categorie: ["Attrezzature"] });
    expect([...una.corsi, ...una.aggiornamenti].map((x) => x.codice)).toEqual([
      "LAV-PLE-II-831",
      "LAV-PLE-II-831-AGG",
    ]);
    const due = elencoCorsi(CORSI, {
      legami: LEGAMI,
      categorie: new Set(["attrezzature", "PREPOSTO"]),
    });
    expect([...due.corsi, ...due.aggiornamenti].map((x) => x.codice)).toEqual([
      "LAV-PLE-II-831",
      "PRP-BAS-12",
      "LAV-PLE-II-831-AGG",
    ]);
  });
  it("ricerca su codice e nome", () => {
    expect(
      elencoCorsi(CORSI, { legami: LEGAMI, ricerca: "evacuaz" }).aggiornamenti.map((x) => x.id),
    ).toEqual(["8"]);
    expect(elencoCorsi(CORSI, { legami: LEGAMI, ricerca: "prp-" }).corsi.map((x) => x.id)).toEqual([
      "5",
    ]);
  });
  it("l'ultimo scelto va per primo e non compare due volte; se è fuori filtro non compare", () => {
    const e = elencoCorsi(CORSI, { legami: LEGAMI, ultimoId: "4" });
    expect(e.ultimo?.id).toBe("4");
    expect(e.aggiornamenti.map((x) => x.id)).not.toContain("4");
    const fuori = elencoCorsi(CORSI, { legami: LEGAMI, categorie: ["Preposto"], ultimoId: "4" });
    expect(fuori.ultimo).toBeNull();
  });
});

describe("categorieValide", () => {
  it("scarta le categorie salvate che non esistono più", () => {
    const cat = categorieDisponibili(CORSI, LEGAMI);
    expect(categorieValide(["Preposto", "Vecchia", "preposto"], cat)).toEqual(["preposto"]);
  });
});

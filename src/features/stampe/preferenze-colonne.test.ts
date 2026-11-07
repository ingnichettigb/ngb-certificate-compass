/*
 * File:      preferenze-colonne.test.ts
 * Percorso:  src/features/stampe/preferenze-colonne.test.ts
 * Data creaz: 07/11/2026
 * Verifica che colonne tolte/aggiunte e larghezze si ricordino per ogni documento e che dati rovinati non rompano la pagina.
 */
import { describe, expect, it } from "vitest";
import {
  alternaColonna, applicaPreferenze, CHIAVE_PREFERENZE_COLONNE, leggiPreferenze, PREFERENZE_VUOTE, salvaPreferenze, senzaModifiche,
  type PreferenzeColonne,
} from "./preferenze-colonne";
import type { Colonna } from "./dati-stampa";

const archivioInMemoria = (iniziale?: string) => {
  const dati = new Map<string, string>();
  if (iniziale !== undefined) dati.set(CHIAVE_PREFERENZE_COLONNE, iniziale);
  return { getItem: (k: string) => dati.get(k) ?? null, setItem: (k: string, v: string) => void dati.set(k, v), dati };
};

const BASE: Colonna[] = ["lavoratore", "cf", "reparto", "corso", "scadenza"];

describe("applicaPreferenze e alternaColonna", () => {
  it("senza preferenze le colonne sono quelle predefinite", () => {
    expect(applicaPreferenze(BASE, PREFERENZE_VUOTE, "registro")).toEqual(BASE);
  });

  it("toglie le predefinite e aggiunge le altre in fondo, nell'ordine di aggiunta", () => {
    let p: PreferenzeColonne = PREFERENZE_VUOTE;
    p = alternaColonna(BASE, p, "cf");
    p = alternaColonna(BASE, p, "nascita");
    p = alternaColonna(BASE, p, "giorni");
    expect(applicaPreferenze(BASE, p, "registro")).toEqual(["lavoratore", "reparto", "corso", "scadenza", "nascita", "giorni"]);
  });

  it("rispuntare una colonna tolta la rimette al suo posto; togliere un'aggiunta la elimina", () => {
    let p = alternaColonna(BASE, PREFERENZE_VUOTE, "cf");
    p = alternaColonna(BASE, p, "cf");
    expect(applicaPreferenze(BASE, p, "registro")).toEqual(BASE);
    p = alternaColonna(BASE, alternaColonna(BASE, p, "nascita"), "nascita");
    expect(senzaModifiche(p)).toBe(true);
  });

  it("scarta le colonne aggiunte che nel documento non hanno dato", () => {
    const p: PreferenzeColonne = { tolte: [], aggiunte: ["corsoBase", "assunzione", "nascita"], larghezze: {} };
    expect(applicaPreferenze(BASE, p, "registro")).toEqual([...BASE, "nascita"]);
  });

  it("non duplica una colonna aggiunta che nel frattempo è diventata predefinita", () => {
    const p: PreferenzeColonne = { tolte: [], aggiunte: ["cf", "nascita"], larghezze: {} };
    expect(applicaPreferenze(BASE, p, "registro")).toEqual([...BASE, "nascita"]);
  });
});

describe("salvataggio", () => {
  it("ricorda le scelte per ogni documento, separatamente", () => {
    const a = archivioInMemoria();
    salvaPreferenze("registro|false|false|false", { tolte: ["cf"], aggiunte: ["nascita"], larghezze: { lavoratore: 180 } }, a);
    salvaPreferenze("lavoratori|false|false|false", { tolte: [], aggiunte: ["preposto"], larghezze: {} }, a);
    expect(leggiPreferenze("registro|false|false|false", a)).toEqual({ tolte: ["cf"], aggiunte: ["nascita"], larghezze: { lavoratore: 180 } });
    expect(leggiPreferenze("lavoratori|false|false|false", a).aggiunte).toEqual(["preposto"]);
    expect(leggiPreferenze("scadenze|false|false|false", a)).toEqual(PREFERENZE_VUOTE);
  });

  it("azzerando le scelte la voce sparisce dall'archivio e gli altri documenti restano", () => {
    const a = archivioInMemoria();
    salvaPreferenze("A", { tolte: ["cf"], aggiunte: [], larghezze: {} }, a);
    salvaPreferenze("B", { tolte: ["reparto"], aggiunte: [], larghezze: {} }, a);
    salvaPreferenze("A", PREFERENZE_VUOTE, a);
    expect(JSON.parse(a.dati.get(CHIAVE_PREFERENZE_COLONNE)!)).toEqual({ B: { tolte: ["reparto"], aggiunte: [], larghezze: {} } });
  });

  it("dati rovinati, colonne sconosciute o larghezze assurde non rompono nulla", () => {
    expect(leggiPreferenze("A", archivioInMemoria("{non json"))).toEqual(PREFERENZE_VUOTE);
    expect(leggiPreferenze("A", archivioInMemoria("[1,2]"))).toEqual(PREFERENZE_VUOTE);
    const strano = JSON.stringify({ A: { tolte: ["cf", "colonnaInventata", 7], aggiunte: "no", larghezze: { cf: 150, reparto: -3, corso: "x", ore: 99999, inventata: 100 } } });
    expect(leggiPreferenze("A", archivioInMemoria(strano))).toEqual({ tolte: ["cf"], aggiunte: [], larghezze: { cf: 150 } });
  });

  it("senza archivio o con archivio che dà errore non lancia eccezioni", () => {
    expect(leggiPreferenze("A", null)).toEqual(PREFERENZE_VUOTE);
    expect(() => salvaPreferenze("A", { tolte: ["cf"], aggiunte: [], larghezze: {} }, null)).not.toThrow();
    const guasto = { getItem: () => { throw new Error("no"); }, setItem: () => { throw new Error("pieno"); } };
    expect(leggiPreferenze("A", guasto)).toEqual(PREFERENZE_VUOTE);
    expect(() => salvaPreferenze("A", { tolte: ["cf"], aggiunte: [], larghezze: {} }, guasto)).not.toThrow();
  });
});

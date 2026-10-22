/*
 * Test delle funzioni pure del modulo di invio attestato.
 */
import { describe, expect, it } from "vitest";
import type { ClasseConcorso, Materia, TipoCorso } from "@/lib/api";
import {
  corsiDelLivello,
  erroreModulo,
  livelliDisponibili,
  macroDisponibili,
  scadenzaCalcolata,
  suggerimentiClassi,
  suggerimentiMaterie,
} from "./selezione";
import { ANAGRAFICA_VUOTA } from "./types";

const corso = (id: string, macro: string, livello: string): TipoCorso =>
  ({ id, nome_corso: id, macro_categoria: macro, livello_specifico: livello }) as TipoCorso;
const CORSI = [corso("a", "Antincendio", "Base"), corso("b", "Antincendio", "Aggiornamento"), corso("c", "Preposto", "Specifico"), corso("d", "Primo Soccorso", "Base")];

describe("categorie, livelli e corsi", () => {
  it("macroDisponibili: ordinate, senza doppioni, senza le nascoste", () => {
    expect(macroDisponibili(CORSI, [])).toEqual(["Antincendio", "Preposto", "Primo Soccorso"]);
    expect(macroDisponibili(CORSI, ["Primo Soccorso"])).toEqual(["Antincendio", "Preposto"]);
    expect(macroDisponibili([], [])).toEqual([]);
  });
  it("livelliDisponibili: nell'ordine Base, Specifico, Aggiornamento", () => {
    expect(livelliDisponibili(CORSI, "Antincendio")).toEqual(["Base", "Aggiornamento"]);
    expect(livelliDisponibili(CORSI, "Preposto")).toEqual(["Specifico"]);
    expect(livelliDisponibili(CORSI, "Altro")).toEqual([]);
  });
  it("corsiDelLivello: senza livello restituisce tutti quelli della categoria", () => {
    expect(corsiDelLivello(CORSI, "Antincendio", "").map((c) => c.id)).toEqual(["a", "b"]);
    expect(corsiDelLivello(CORSI, "Antincendio", "Base").map((c) => c.id)).toEqual(["a"]);
    expect(corsiDelLivello(CORSI, "Altro", "Base")).toEqual([]);
  });
});

describe("suggerimenti", () => {
  const classe = (codice: string, usi: number, attivo = true, denominazione: string | null = null) =>
    ({ id: codice, codice, usi, attivo, denominazione }) as ClasseConcorso;
  it("classi: solo attive, prima le più usate, a parità in ordine di codice", () => {
    const r = suggerimentiClassi([classe("B012", 0), classe("A026", 9, true, "Matematica"), classe("A022", 9), classe("Z", 5, false)]);
    expect(r.map((x) => x.valore)).toEqual(["A022", "A026", "B012"]);
    expect(r[1]).toEqual({ valore: "A026", dettaglio: "Matematica" });
  });
  it("classi: non modifica l'elenco originale", () => {
    const originale = [classe("B", 1), classe("A", 2)];
    suggerimentiClassi(originale);
    expect(originale.map((c) => c.codice)).toEqual(["B", "A"]);
  });
  const materia = (nome: string, classe: string) => ({ id: nome, nome, classe_concorso: classe }) as Materia;
  const MAT = [materia("Italiano", "A022"), materia("Matematica", "A026")];
  it("materie: senza classe, l'elenco resta com'è", () => {
    expect(suggerimentiMaterie(MAT, "").map((m) => m.valore)).toEqual(["Italiano", "Matematica"]);
  });
  it("materie: prima quelle collegate alla classe digitata (anche minuscola e con spazi)", () => {
    const r = suggerimentiMaterie(MAT, " a026 ");
    expect(r.map((m) => m.valore)).toEqual(["Matematica", "Italiano"]);
    expect(r[0]).toEqual({ valore: "Matematica", dettaglio: "A026" });
  });
});

describe("scadenzaCalcolata", () => {
  it("aggiunge gli anni di validità e formatta in italiano", () => {
    expect(scadenzaCalcolata("2026-03-15", 5)).toBe("15/03/2031");
    expect(scadenzaCalcolata("2024-12-31", 3)).toBe("31/12/2027");
  });
});

describe("erroreModulo: ordine dei controlli", () => {
  const base = {
    anagrafica: { ...ANAGRAFICA_VUOTA, codice_fiscale: "RSSMRA80A01H501U", reparto: "ATA", sottoreparto: "AA", classe_concorso: "A022", materia: "Italiano" },
    numReparti: 2,
    numSottoreparti: 2,
    chiedeInsegnamento: true,
    corsoId: "t1",
    dataCorso: "2026-03-15",
    fronte: new File(["x"], "f.jpg"),
  };
  it("tutto a posto: nessun errore", () => {
    expect(erroreModulo(base)).toBeNull();
  });
  it("codice fiscale", () => {
    expect(erroreModulo({ ...base, anagrafica: { ...base.anagrafica, codice_fiscale: " abc " } })).toEqual({
      titolo: "Codice fiscale non valido",
      descrizione: "Deve contenere 16 caratteri.",
    });
  });
  it("reparto, profilo, classe, materia, corso, foto — nell'ordine", () => {
    expect(erroreModulo({ ...base, anagrafica: { ...base.anagrafica, reparto: "" } })?.titolo).toBe("Scegli il tuo reparto");
    expect(erroreModulo({ ...base, anagrafica: { ...base.anagrafica, sottoreparto: "" } })?.titolo).toBe("Scegli il tuo profilo dentro il reparto");
    expect(erroreModulo({ ...base, anagrafica: { ...base.anagrafica, classe_concorso: "  " } })?.titolo).toBe("Indica la classe di concorso");
    expect(erroreModulo({ ...base, anagrafica: { ...base.anagrafica, materia: "" } })?.titolo).toBe("Indica la materia insegnata");
    expect(erroreModulo({ ...base, corsoId: "" })?.titolo).toBe("Completa corso e data del corso");
    expect(erroreModulo({ ...base, dataCorso: "" })?.titolo).toBe("Completa corso e data del corso");
    expect(erroreModulo({ ...base, fronte: null })?.titolo).toBe("Allega almeno la foto del fronte dell'attestato");
  });
  it("senza reparti configurati o senza obbligo di insegnamento, i controlli relativi saltano", () => {
    const senza = { ...base, numReparti: 0, numSottoreparti: 0, chiedeInsegnamento: false, anagrafica: { ...base.anagrafica, reparto: "", sottoreparto: "", classe_concorso: "", materia: "" } };
    expect(erroreModulo(senza)).toBeNull();
  });
  it("il primo errore vince", () => {
    expect(erroreModulo({ ...base, anagrafica: { ...base.anagrafica, codice_fiscale: "x", reparto: "" }, fronte: null })?.titolo).toBe("Codice fiscale non valido");
  });
});

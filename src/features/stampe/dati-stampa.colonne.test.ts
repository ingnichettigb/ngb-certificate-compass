/*
 * File:      dati-stampa.colonne.test.ts
 * Percorso:  src/features/stampe/dati-stampa.colonne.test.ts
 * Data creaz: 07/11/2026
 * Verifica l'elenco delle colonne aggiungibili (gruppi funzionali in ordine alfabetico, per documento) e le colonne nuove.
 * Rev 2 (09/11/2026 20:00): le colonne dell'Organigramma si raggiungono solo con quel documento; gli altri non le offrono.
 */
import { describe, expect, it } from "vitest";
import {
  cella, colonneDisponibili, gruppiColonne, INTESTAZIONI, ordinaRighe,
  type Colonna, type Modello, type RigaStampa,
} from "./dati-stampa";

const MODELLI: Modello[] = ["registro", "gruppo", "scadenze", "scheda", "reparto", "lavoratori"];
const ordine = new Intl.Collator("it", { sensitivity: "base" });

const riga = (extra: Partial<RigaStampa> = {}): RigaStampa => ({
  id: "1", dipendenteId: "1", cognome: "Rossi", nome: "Mario", cf: "", reparto: "Docente", sottoreparto: "", materia: "", mansione: "", ruoli: "",
  assunzione: null, luogoNascita: "", dataNascita: null, formazione: {}, mancanti: [], fineContratto: null, cessazione: null,
  corso: "Preposto", codice: "PRP", gruppo: "g", gruppoTitolo: "Preposti", ore: 8, numero: "", dataCorso: "2020-01-01",
  scadenza: "2024-01-01", stato: "valido", giorniAllaScadenza: null, ...extra,
});

describe("gruppiColonne: raggruppamento funzionale in ordine alfabetico", () => {
  it.each(MODELLI)("%s: gruppi e colonne in ordine alfabetico, senza gruppi vuoti né doppioni", (m) => {
    const gruppi = gruppiColonne(m);
    const titoli = gruppi.map((g) => g.titolo);
    expect(titoli).toEqual([...titoli].sort((a, b) => ordine.compare(a, b)));
    const tutte = gruppi.flatMap((g) => g.colonne);
    expect(new Set(tutte).size).toBe(tutte.length);
    for (const g of gruppi) {
      expect(g.colonne.length).toBeGreaterThan(0);
      const nomi = g.colonne.map((c) => INTESTAZIONI[c]);
      expect(nomi).toEqual([...nomi].sort((a, b) => ordine.compare(a, b)));
    }
  });

  it("i gruppi sono quelli funzionali: Anagrafica, Attestato, Contratto, Controllo dati, Formazione e incarichi", () => {
    expect(gruppiColonne("lavoratori").map((g) => g.titolo)).toEqual(["Anagrafica", "Contratto", "Controllo dati", "Formazione e incarichi"]);
    expect(gruppiColonne("registro").map((g) => g.titolo)).toEqual(["Anagrafica", "Attestato", "Contratto", "Controllo dati"]);
  });

  it("nei documenti per attestato non offre colonne che lì non hanno dato", () => {
    for (const m of ["registro", "gruppo", "scadenze", "scheda", "reparto"] as Modello[]) {
      const d = colonneDisponibili(m);
      for (const vuota of ["assunzione", "ruoli", "corsoBase", "corsoSpecifico", "preposto", "antincendio", "primoSoccorso", "defibrillatore"] as Colonna[]) {
        expect(d).not.toContain(vuota);
      }
      expect(d).toEqual(expect.arrayContaining(["corso", "scadenza", "giorni", "argomento", "nascita", "mansione", "categoria"]));
    }
  });

  it("nell'elenco lavoratori non offre le colonne dell'attestato", () => {
    const d = colonneDisponibili("lavoratori");
    for (const vuota of ["corso", "argomento", "numero", "ore", "data", "scadenza", "giorni", "stato"] as Colonna[]) expect(d).not.toContain(vuota);
    expect(d).toEqual(expect.arrayContaining(["assunzione", "ruoli", "corsoBase", "corsoSpecifico", "preposto", "primoSoccorso", "mancano"]));
  });

  it("ogni colonna esistente si può raggiungere da almeno un documento", () => {
    const raggiungibili = new Set(MODELLI.flatMap((m) => colonneDisponibili(m, true)));
    for (const c of Object.keys(INTESTAZIONI) as Colonna[]) expect(raggiungibili.has(c)).toBe(true);
  });

  it("le colonne dell'Organigramma non compaiono negli altri documenti", () => {
    for (const m of MODELLI) {
      expect(colonneDisponibili(m)).not.toContain("corsoBaseSquadra");
      expect(colonneDisponibili(m)).not.toContain("squadra");
    }
    expect(colonneDisponibili("lavoratori", true)).toEqual(expect.arrayContaining(["squadra", "corsoBaseSquadra", "aggiornamentoSquadra"]));
  });
});

describe("colonne nuove", () => {
  it("Categoria, Argomento corso e Giorni alla scadenza mostrano il dato o «—»", () => {
    expect(cella(riga({ sottoreparto: "Collaboratore scolastico" }), "categoria")).toBe("Collaboratore scolastico");
    expect(cella(riga(), "categoria")).toBe("—");
    expect(cella(riga(), "argomento")).toBe("Preposti");
    expect(cella(riga({ giorniAllaScadenza: 120 }), "giorni")).toBe("120");
    expect(cella(riga({ giorniAllaScadenza: -15 }), "giorni")).toBe("-15");
    expect(cella(riga(), "giorni")).toBe("—");
  });

  it("«Giorni alla scadenza» si ordina come numero (non come testo) e i vuoti restano in fondo", () => {
    const r = [riga({ id: "a", giorniAllaScadenza: 100 }), riga({ id: "b", giorniAllaScadenza: 9 }), riga({ id: "c", giorniAllaScadenza: null }), riga({ id: "d", giorniAllaScadenza: -5 })];
    expect(ordinaRighe(r, { colonna: "giorni", direzione: "asc" }).map((x) => x.id)).toEqual(["d", "b", "a", "c"]);
    expect(ordinaRighe(r, { colonna: "giorni", direzione: "desc" }).map((x) => x.id)).toEqual(["a", "b", "d", "c"]);
  });
});

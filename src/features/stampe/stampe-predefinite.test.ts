/*
 * File:      stampe-predefinite.test.ts
 * Percorso:  src/features/stampe/stampe-predefinite.test.ts
 * Data creaz: 08/11/2026
 * Verifica le 7 stampe predefinite, il raggruppamento con salto pagina e le colonne di nascita separate.
 */
import { describe, expect, it } from "vitest";
import { cella, colonneDisponibili, INTESTAZIONI, ordinaRighe, type RigaStampa } from "./dati-stampa";
import { conFunzione, gruppiLavoratori } from "./stampa-gruppi";
import { STAMPE_PREDEFINITE, trovaPredefinita } from "./stampe-predefinite";

const riga = (extra: Partial<RigaStampa> = {}): RigaStampa => ({
  id: "1", dipendenteId: "1", cognome: "Rossi", nome: "Mario", cf: "RSSMRA80A01F205X", reparto: "Docente", sottoreparto: "", materia: "", mansione: "",
  ruoli: "", assunzione: null, luogoNascita: "Milano", dataNascita: "1980-01-01", formazione: {}, mancanti: [], fineContratto: null, cessazione: null,
  corso: "", codice: "", gruppo: "", gruppoTitolo: "", ore: null, numero: "", dataCorso: "", scadenza: null, stato: "senza_scadenza",
  giorniAllaScadenza: null, ...extra,
});

describe("stampe predefinite: le 7 carte", () => {
  it("sono sette, con id unico, titolo e spiegazione", () => {
    expect(STAMPE_PREDEFINITE).toHaveLength(7);
    expect(new Set(STAMPE_PREDEFINITE.map((s) => s.id)).size).toBe(7);
    for (const s of STAMPE_PREDEFINITE) {
      expect(s.titolo.length).toBeGreaterThan(0);
      expect(s.descrizione.length).toBeGreaterThan(0);
      expect(s.filtriApplicati.length).toBeGreaterThan(0);
    }
  });

  it("le colonne di partenza hanno un'intestazione e non hanno doppioni", () => {
    for (const s of STAMPE_PREDEFINITE) {
      expect(new Set(s.colonne).size).toBe(s.colonne.length);
      for (const c of s.colonne) expect(INTESTAZIONI[c]).toBeTruthy();
    }
  });

  it("le scadenze guardano scaduti e prossimi 12 mesi; le tre per ruolo tengono solo chi ha l'incarico", () => {
    const scadenze = STAMPE_PREDEFINITE.filter((s) => s.famiglia === "Scadenze");
    expect(scadenze).toHaveLength(4);
    for (const s of scadenze) {
      expect(s.filtri.modello).toBe("scadenze");
      expect(s.filtri.finestra).toBe("365");
    }
    const perRuolo = scadenze.filter((s) => s.id !== "scadenze-tutte");
    expect(perRuolo.map((s) => s.filtri.gruppo)).toEqual(["preposti", "antincendio", "primo-soccorso"]);
    for (const s of perRuolo) expect(s.filtri.soloIncarichi).toBe(true);
    expect(trovaPredefinita("scadenze-tutte")?.filtri.soloIncarichi).toBe(false);
  });

  it("anagrafica: tutti i dati; per settori e per funzioni raggruppano", () => {
    const tutti = trovaPredefinita("anagrafica-tutti")!;
    expect(tutti.filtri.modello).toBe("lavoratori");
    expect(tutti.colonne).toEqual(expect.arrayContaining(["cf", "luogoNascita", "dataNascita"]));
    expect(tutti.raggruppaPer).toBeUndefined();
    expect(trovaPredefinita("anagrafica-reparti")?.raggruppaPer).toBe("reparto");
    expect(trovaPredefinita("per-funzioni")?.raggruppaPer).toBe("funzione");
  });

  it("id sconosciuto: nessuna stampa", () => {
    expect(trovaPredefinita("non-esiste")).toBeUndefined();
  });
});

describe("raggruppamento con salto pagina", () => {
  const righe = [
    riga({ id: "1", dipendenteId: "1", cognome: "Bianchi", reparto: "Docente", ruoliElenco: ["Preposto", "Addetto antincendio"] }),
    riga({ id: "2", dipendenteId: "2", cognome: "Rossi", reparto: "ATA", ruoliElenco: ["Addetto antincendio"] }),
    riga({ id: "3", dipendenteId: "3", cognome: "Verdi", reparto: "Docente", ruoliElenco: [] }),
  ];

  it("per reparto: un gruppo per reparto, in ordine alfabetico", () => {
    const g = gruppiLavoratori(righe, "reparto");
    expect(g.map((x) => x.titolo)).toEqual(["Reparto: ATA – 1 lavoratori", "Reparto: Docente – 2 lavoratori"]);
    expect(g[1]!.righe.map((r) => r.cognome)).toEqual(["Bianchi", "Verdi"]);
  });

  it("per funzione: chi ha più funzioni compare in ciascuna, chi non ne ha nessuna non compare", () => {
    const g = gruppiLavoratori(righe, "funzione");
    expect(g.map((x) => x.titolo)).toEqual(["Funzione: Addetto antincendio – 2 lavoratori", "Funzione: Preposto – 1 lavoratori"]);
    expect(g.flatMap((x) => x.righe).some((r) => r.cognome === "Verdi")).toBe(false);
    expect(conFunzione(righe).map((r) => r.cognome)).toEqual(["Bianchi", "Rossi"]);
  });

  it("una funzione assegnata due volte allo stesso lavoratore non lo duplica", () => {
    const g = gruppiLavoratori([riga({ ruoliElenco: ["Preposto", "Preposto"] })], "funzione");
    expect(g).toHaveLength(1);
    expect(g[0]!.righe).toHaveLength(1);
  });
});

describe("luogo e data di nascita in due colonne", () => {
  it("testo, intestazioni e ordinamento", () => {
    const r = riga();
    expect(INTESTAZIONI.luogoNascita).toBe("Luogo di nascita");
    expect(INTESTAZIONI.dataNascita).toBe("Data di nascita");
    expect(cella(r, "luogoNascita")).toBe("Milano");
    expect(cella(r, "dataNascita")).toBe("01/01/1980");
    expect(cella(riga({ luogoNascita: "", dataNascita: null }), "dataNascita")).toBe("—");
    const ordinate = ordinaRighe(
      [riga({ id: "a", cognome: "A", dataNascita: "1990-05-05" }), riga({ id: "b", cognome: "B", dataNascita: "1970-01-01" })],
      { colonna: "dataNascita", direzione: "asc" },
    );
    expect(ordinate.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("sono aggiungibili con il «+» nell'elenco lavoratori e nei documenti per attestato", () => {
    expect(colonneDisponibili("lavoratori")).toEqual(expect.arrayContaining(["luogoNascita", "dataNascita"]));
    expect(colonneDisponibili("registro")).toEqual(expect.arrayContaining(["luogoNascita", "dataNascita"]));
  });
});

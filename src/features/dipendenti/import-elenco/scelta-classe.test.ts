/*
 * File:      scelta-classe.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/scelta-classe.test.ts
 * Creato:    12/11/2026
 * Verifica la scelta guidata di classe di concorso / profilo ATA e le righe di esempio ignorate.
 * Revisioni:
 *   rev 1 — 12/11/2026 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import { analizzaSoloNuovi, type RigaGrezza } from "./analisi-elenco";
import { applicaSceltaRiga, serveDecisione, sembraCodiceClasse, suggerisciClassi, nomeClasseArchivio, sceltaDaValore, valoreDaScelta } from "./scelta-classe";
import { scartaRigheEsempio } from "./righe-esempio";

const CLASSI = [
  { codice: "A027", denominazione: "Matematica e fisica" },
  { codice: "A028", denominazione: "Matematica e scienze" },
  { codice: "A012", denominazione: "Discipline letterarie" },
  { codice: "IRC", denominazione: "Religione cattolica" },
];
const riga = (funzione: string): RigaGrezza => ({
  nominativo: "GALLI ANNA", cognome: "GALLI", nome: "ANNA", cf: "GLLNNA75A41F205X", funzione,
  luogoNascita: "MILANO", dataNascita: "1975-01-01", funzioni: {},
});

describe("scelta guidata classe / profilo", () => {
  it("propone le classi simili, non quelle lontane", () => {
    expect(suggerisciClassi("A27", CLASSI).map((c) => c.codice)[0]).toBe("A027");
    expect(suggerisciClassi("A-027", CLASSI).map((c) => c.codice)[0]).toBe("A027");
    expect(suggerisciClassi("Lettere letterarie", CLASSI).map((c) => c.codice)).toContain("A012");
    expect(suggerisciClassi("Z999", CLASSI)).toEqual([]);
  });

  it("serve una decisione solo per i nuovi senza classe (Docente) o senza profilo (ATA)", () => {
    const [docSenza] = analizzaSoloNuovi([riga("")], [], "Docente", ["A027"]);
    const [ataSenza] = analizzaSoloNuovi([riga("")], [], "ATA", ["A027"]);
    const [ok] = analizzaSoloNuovi([riga("A027")], [], "ATA", ["A027"]);
    const [cs] = analizzaSoloNuovi([riga("CS")], [], "Docente", ["A027"]);
    const [presente] = analizzaSoloNuovi([riga("")], [{ id: "1", codice_fiscale: "GLLNNA75A41F205X" }], "Docente", ["A027"]);
    expect([docSenza, ataSenza, ok, cs, presente].map((r) => serveDecisione(r!))).toEqual([true, true, false, false, false]);
  });

  it("applica la scelta e usa il nome della classe presente in archivio", () => {
    const [r] = analizzaSoloNuovi([riga("Z999 Lettere")], [], "Docente", ["A027"]);
    const scelta = applicaSceltaRiga(r!, { tipo: "classe", codice: "A027" }, CLASSI);
    expect(scelta.classe).toBe("A027");
    expect(scelta.materia).toBe("Matematica e fisica");
    expect(scelta.reparto).toBe("Docente");

    const ata = applicaSceltaRiga(r!, { tipo: "profilo", profilo: "Assistente tecnico" }, CLASSI);
    expect([ata.reparto, ata.sottorepartoAta, ata.classe]).toEqual(["ATA", "Assistente tecnico", null]);

    const vuoto = applicaSceltaRiga(r!, { tipo: "vuoto" }, CLASSI);
    expect(vuoto.classe).toBeNull();
  });

  it("classe riconosciuta da sola: come materia si usa il nome in archivio, non il testo del file", () => {
    const [r] = analizzaSoloNuovi([riga("A27 mate")], [], "Docente", ["A027"]);
    expect(r?.classe).toBe("A027");
    expect(applicaSceltaRiga(r!, undefined, CLASSI).materia).toBe("Matematica e fisica");
    expect(nomeClasseArchivio("IRC", CLASSI)).toBe("Religione cattolica");
  });

  it("riconosce un testo che sembra un codice e converte le scelte in valori della tendina", () => {
    expect(sembraCodiceClasse("A27")).toBe(true);
    expect(sembraCodiceClasse("Insegnante di lettere")).toBe(false);
    for (const s of [{ tipo: "vuoto" }, { tipo: "classe", codice: "A027" }, { tipo: "nuova", codice: "B99" }, { tipo: "profilo", profilo: "Assistente tecnico" }] as const) {
      expect(sceltaDaValore(valoreDaScelta(s))).toEqual(s);
    }
  });
});

describe("righe di esempio del modello", () => {
  it("le tre righe di fantasia vengono ignorate, le altre restano", () => {
    const esempio = (cognome: string, cf: string): RigaGrezza => ({ nominativo: `${cognome} X`, cognome, nome: "X", cf, funzione: "" });
    const righe = [
      esempio("ROSSI", "RSSMRA80A01H501U"),
      esempio("BIANCHI", "BNCLRA85M41F205C"),
      esempio("VERDI", "VRDPLA70T10L219U"),
      esempio("ROSSI", "ABCDEF80A01H501X"), // stesso cognome, altro codice fiscale: resta
      esempio("GALLI", "GLLNNA75A41F205X"),
    ];
    expect(scartaRigheEsempio(righe).map((r) => r.cognome)).toEqual(["ROSSI", "GALLI"]);
  });
});

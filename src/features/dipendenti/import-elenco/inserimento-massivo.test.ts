/*
 * File:      inserimento-massivo.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/inserimento-massivo.test.ts
 * Creato:    11/11/2026
 * Verifica il modello di inserimento massivo: colonna unica Classe/Profilo (CS, AA, AT, DSGA o classe di concorso),
 * colonne con la X per le funzioni di sicurezza e assegnazione dei ruoli.
 * Revisioni:
 *   rev 1 — 11/11/2026 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import { analizzaSoloNuovi } from "./analisi-elenco";
import { tabellaInRighe } from "./leggi-file";
import { FUNZIONI, INTESTAZIONE_CLASSE_PROFILO, cellaSegnata, chiaviSegnate, trovaRuoloFunzione } from "./funzioni-sicurezza";
import type { RuoloSicurezza } from "@/lib/api/ruoli";

const INTEST = ["Cognome", "Nome", "Codice fiscale", "Luogo di nascita", "Data di nascita", INTESTAZIONE_CLASSE_PROFILO, ...FUNZIONI.map((f) => f.intestazione)];

const tabella = [
  INTEST,
  ["ROSSI", "MARIO", "RSSMRA80A01H501U", "ROMA", "01/01/1980", "A027", "X", "", "x", "", "X", ""],
  ["BIANCHI", "LAURA", "BNCLRA85M41F205C", "MILANO", "01/08/1985", "CS", "", "X", "X", "", "X", "X"],
  ["VERDI", "PAOLO", "VRDPLA70T10L219U", "TORINO", "10/12/1970", "AA", "", "", "", "", "", ""],
  ["GALLI", "ANNA", "GLLNNA75A41F205X", "MILANO", "01/01/1975", "AA24", "", "", "", "", "", ""],
];

describe("modello inserimento massivo", () => {
  it("le intestazioni del modello sono tutte riconosciute dalla lettura del file", () => {
    const righe = tabellaInRighe(tabella);
    expect(righe).toHaveLength(4);
    expect(righe[0]?.funzioni).toEqual({ preposto: true, primoSoccorso: true, evacuazione: true });
    expect(righe[1]?.funzioni).toEqual({ antincendio: true, primoSoccorso: true, evacuazione: true, privacy: true });
    expect(righe[2]?.funzioni).toEqual({});
    expect(righe[0]?.funzione).toBe("A027");
  });

  it("la X si riconosce in più forme", () => {
    for (const v of ["X", "x", " x ", "✓", "SI", "sì", "1"]) expect(cellaSegnata(v)).toBe(true);
    for (const v of ["", "no", "0", "xx"]) expect(cellaSegnata(v)).toBe(false);
  });

  it("colonna unica: CS/AA → ATA, classe di concorso → Docente, AA24 non si confonde con AA", () => {
    const analisi = analizzaSoloNuovi(tabellaInRighe(tabella), [], "ATA", ["A027", "AA24"]);
    expect(analisi.map((r) => [r.reparto, r.sottorepartoAta, r.classe])).toEqual([
      ["Docente", null, "A027"],
      ["ATA", "Collaboratore scolastico", null],
      ["ATA", "Assistente amministrativo", null],
      ["Docente", null, "AA24"],
    ]);
  });

  it("classe non presente in archivio: resta il reparto predefinito e compare un avviso", () => {
    const righe = tabellaInRighe([INTEST, ["ROSSI", "MARIO", "RSSMRA80A01H501U", "ROMA", "01/01/1980", "Z999", "", "", "", "", "", ""]]);
    const [r] = analizzaSoloNuovi(righe, [], "Docente", ["A027"]);
    expect(r?.classe).toBeNull();
    expect(r?.avvisi.some((a) => a.includes("Z999"))).toBe(true);
  });

  it("senza colonne X le funzioni restano vuote", () => {
    const righe = tabellaInRighe([INTEST.slice(0, 6), ["ROSSI", "MARIO", "RSSMRA80A01H501U", "ROMA", "01/01/1980", "CS"]]);
    expect(righe[0]?.funzioni).toBeUndefined();
    expect(chiaviSegnate(analizzaSoloNuovi(righe, [], "ATA")[0]?.funzioni)).toEqual([]);
  });

  it("collega le funzioni ai ruoli del catalogo (Primo soccorso ≠ Defibrillatore; Privacy dalla macro-categoria)", () => {
    const r = (id: string, nome: string, macro: string | null = null): RuoloSicurezza => ({
      id, nome, descrizione: null, macro_categoria: macro, obbligatorio_tutti: false, attivo: true, ordine: 1,
    });
    const cat = [
      r("1", "Preposto"),
      r("2", "Addetto Primo Soccorso"),
      r("3", "Addetto BLSD / Defibrillatore"),
      r("4", "Addetto Antincendio"),
      r("5", "Addetto all'evacuazione"),
      r("6", "Incaricato trattamento dati", "Privacy"),
    ];
    expect(trovaRuoloFunzione(cat, "primoSoccorso")?.id).toBe("2");
    expect(trovaRuoloFunzione(cat, "defibrillatore")?.id).toBe("3");
    expect(trovaRuoloFunzione(cat, "evacuazione")?.id).toBe("5");
    expect(trovaRuoloFunzione(cat, "privacy")?.id).toBe("6");
    expect(trovaRuoloFunzione(cat.slice(0, 5), "privacy")).toBeUndefined();
  });
});

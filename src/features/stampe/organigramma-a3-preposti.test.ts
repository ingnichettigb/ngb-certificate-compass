/*
 * File:      organigramma-a3-preposti.test.ts
 * Percorso:  src/features/stampe/organigramma-a3-preposti.test.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Test del riquadro Preposti con nomi / tolto e della voce «CATEGORIE DI PREPOSTI» (sempre presente).
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { applicaModoPreposti, calcolaBlocchiA3, normalizzaVociOrganigramma, TITOLO_CATEGORIE_PREPOSTI, VOCI_PREDEFINITE } from "./organigramma-a3";

const dip = (id: string, cognome: string, reparto: string): Dipendente =>
  ({ id, cognome, nome: "N", codice_fiscale: `CF${id}`, reparto, sottoreparto: null, classe_concorso: null, materia: null, stato_lavoratore: "in_forza" }) as unknown as Dipendente;
const ruolo = (id: string, nome: string, macro: string): RuoloSicurezza =>
  ({ id, nome, macro_categoria: macro, obbligatorio_tutti: false, attivo: true, ordine: 0 }) as unknown as RuoloSicurezza;
const ass = (d: string, r: string): AssegnazioneRuolo => ({ dipendente_id: d, ruolo_id: r }) as unknown as AssegnazioneRuolo;

const DIP = [dip("1", "ROSSI", "Docente"), dip("2", "NERI", "ATA")];
const blocchi = calcolaBlocchiA3(DIP, [], [ruolo("r-pre", "Preposto", "Preposto")], DIP.map((d) => ass(d.id, "r-pre")), new Date("2026-11-12T10:00:00"));

describe("Preposti con nomi / Categorie preposti", () => {
  it("con nomi: il riquadro Preposti c'è, con i nominativi", () => {
    const v = applicaModoPreposti(blocchi, "nomi");
    expect(v).toBe(blocchi);
    const p = v.find((b) => b.chiave === "preposti")!;
    expect(p.ata.map((n) => n.testo)).toEqual(["NERI N"]);
    expect(p.docenti.map((n) => n.testo)).toEqual(["ROSSI N"]);
  });

  it("categorie: il riquadro con i nomi viene tolto, gli altri blocchi restano uguali", () => {
    const v = applicaModoPreposti(blocchi, "categorie");
    expect(v.some((b) => b.chiave === "preposti")).toBe(false);
    expect(v).toHaveLength(blocchi.length - 1);
    for (const b of v) expect(b).toBe(blocchi.find((x) => x.chiave === b.chiave));
  });
});

describe("voce «CATEGORIE DI PREPOSTI»", () => {
  const nomi = ["Professori di lab. scientifico", "Professori di lab. fisica ed ed. fisica"];

  it("il titolo è in maiuscolo e la voce predefinita lo usa", () => {
    expect(TITOLO_CATEGORIE_PREPOSTI).toBe("CATEGORIE DI PREPOSTI");
    expect(VOCI_PREDEFINITE.some((v) => v.titolo === TITOLO_CATEGORIE_PREPOSTI)).toBe(true);
  });

  it("la vecchia voce «Preposti di laboratorio» già salvata viene rinominata e tiene i suoi nominativi", () => {
    const r = normalizzaVociOrganigramma([{ titolo: "Preposti di laboratorio", nomi }, { titolo: "Addetti registro antincendio", nomi: [] }]);
    expect(r.map((v) => v.titolo)).toEqual([TITOLO_CATEGORIE_PREPOSTI, "Addetti registro antincendio"]);
    expect(r[0]!.nomi).toEqual(nomi);
  });

  it("anche «Categorie preposti» scritto a mano viene riportato al titolo giusto, senza doppioni", () => {
    const r = normalizzaVociOrganigramma([{ titolo: "Categorie preposti", nomi }]);
    expect(r).toEqual([{ titolo: TITOLO_CATEGORIE_PREPOSTI, nomi }]);
  });

  it("resta sempre: se manca viene aggiunta quella predefinita; senza voci salvate partono le predefinite", () => {
    const r = normalizzaVociOrganigramma([{ titolo: "Altro", nomi: ["x"] }]);
    expect(r.map((v) => v.titolo)).toEqual(["Altro", TITOLO_CATEGORIE_PREPOSTI]);
    expect(normalizzaVociOrganigramma([])).toEqual(VOCI_PREDEFINITE);
  });
});

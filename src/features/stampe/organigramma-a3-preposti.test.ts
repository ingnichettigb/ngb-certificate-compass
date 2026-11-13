/*
 * File:      organigramma-a3-preposti.test.ts
 * Percorso:  src/features/stampe/organigramma-a3-preposti.test.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Test del riquadro Preposti con nomi / tolto e della voce «CATEGORIE DI PREPOSTI» (sempre presente).
 *   rev 2 — 12/11/2026 — Nomi in forma breve (COGNOME + iniziali puntate), omonimie per esteso.
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { applicaModoPreposti, calcolaBlocchiA3, inizialiNome, nomeBreve, normalizzaVociOrganigramma, TITOLO_CATEGORIE_PREPOSTI, TITOLO_RESPONSABILE_DPI, TITOLO_RESPONSABILE_SDS, VOCI_PREDEFINITE } from "./organigramma-a3";

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
    expect(p.ata.map((n) => n.testo)).toEqual(["NERI N."]);
    expect(p.docenti.map((n) => n.testo)).toEqual(["ROSSI N."]);
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
    expect(r.map((v) => v.titolo)).toEqual([TITOLO_CATEGORIE_PREPOSTI, "Addetti registro antincendio", TITOLO_RESPONSABILE_DPI, TITOLO_RESPONSABILE_SDS]);
    expect(r[0]!.nomi).toEqual(nomi);
  });

  it("anche «Categorie preposti» scritto a mano viene riportato al titolo giusto, senza doppioni", () => {
    const r = normalizzaVociOrganigramma([{ titolo: "Categorie preposti", nomi }]);
    expect(r.filter((v) => v.titolo === TITOLO_CATEGORIE_PREPOSTI)).toEqual([{ titolo: TITOLO_CATEGORIE_PREPOSTI, nomi, tipo: "nota" }]);
  });

  it("resta sempre: se manca viene aggiunta quella predefinita; senza voci salvate partono le predefinite", () => {
    const r = normalizzaVociOrganigramma([{ titolo: "Altro", nomi: ["x"] }]);
    expect(r.map((v) => v.titolo)).toEqual(["Altro", TITOLO_CATEGORIE_PREPOSTI, TITOLO_RESPONSABILE_DPI, TITOLO_RESPONSABILE_SDS]);
    expect(normalizzaVociOrganigramma([])).toEqual(VOCI_PREDEFINITE);
  });
});

describe("nomi in forma breve: COGNOME + iniziali puntate", () => {
  it("un nome → una iniziale; due nomi → due iniziali; trattino e apostrofo", () => {
    expect(inizialiNome("Mario")).toBe("M.");
    expect(inizialiNome("Maria Grazia")).toBe("M. G.");
    expect(inizialiNome("Anna-Maria")).toBe("A. M.");
    expect(inizialiNome("gian battista")).toBe("G. B.");
    expect(inizialiNome("")).toBe("");
    expect(nomeBreve({ cognome: "DE LUCA SANTORO", nome: "Maria Antonietta" })).toBe("DE LUCA SANTORO M. A.");
    expect(nomeBreve({ cognome: "ROSSI", nome: "" })).toBe("ROSSI");
  });

  it("nella tavola tutti i nomi sono in forma breve, anche i docenti", () => {
    const d = [dip("1", "BIANCHI", "Docente"), dip("2", "ESPOSITO", "ATA")];
    d[0] = { ...d[0]!, nome: "Maria Teresa" } as Dipendente;
    d[1] = { ...d[1]!, nome: "Luca" } as Dipendente;
    const b = calcolaBlocchiA3(d, [], [ruolo("r", "Preposto", "Preposto")], d.map((x) => ass(x.id, "r")), new Date("2026-11-12T10:00:00")).find((x) => x.chiave === "preposti")!;
    expect(b.ata.map((n) => n.testo)).toEqual(["ESPOSITO L."]);
    expect(b.docenti.map((n) => n.testo)).toEqual(["BIANCHI M. T."]);
  });

  it("due persone con stesso cognome e stesse iniziali restano per esteso; le altre no", () => {
    const d = [
      { ...dip("1", "ROSSI", "ATA"), nome: "Mario" } as Dipendente,
      { ...dip("2", "ROSSI", "ATA"), nome: "Marco" } as Dipendente,
      { ...dip("3", "ROSSI", "ATA"), nome: "Anna" } as Dipendente,
    ];
    const b = calcolaBlocchiA3(d, [], [ruolo("r", "Preposto", "Preposto")], d.map((x) => ass(x.id, "r")), new Date("2026-11-12T10:00:00")).find((x) => x.chiave === "preposti")!;
    expect(b.ata.map((n) => n.testo).sort()).toEqual(["ROSSI A.", "ROSSI Marco", "ROSSI Mario"]);
  });

  it("la stessa persona in più blocchi resta in forma breve (non è un'omonima)", () => {
    const d = [{ ...dip("1", "ROSSI", "ATA"), nome: "Mario" } as Dipendente];
    const ruoli = [ruolo("r1", "Preposto", "Preposto"), ruolo("r2", "Addetto Antincendio", "Antincendio")];
    const bl = calcolaBlocchiA3(d, [], ruoli, [ass("1", "r1"), ass("1", "r2")], new Date("2026-11-12T10:00:00"));
    expect(bl.find((x) => x.chiave === "preposti")!.ata[0]!.testo).toBe("ROSSI M.");
    expect(bl.find((x) => x.chiave === "antincendio")!.ata[0]!.testo).toBe("ROSSI M.");
  });
});

describe("mini categorie sotto il registro antincendio", () => {
  it("le voci predefinite hanno «Responsabile distribuzione D.P.I.» e «Responsabile custodia SDS» dopo il registro antincendio", () => {
    const t = VOCI_PREDEFINITE.map((v) => v.titolo);
    expect(t.indexOf(TITOLO_RESPONSABILE_DPI)).toBe(t.findIndex((x) => /registro\s+antincendio/i.test(x)) + 1);
    expect(t.indexOf(TITOLO_RESPONSABILE_SDS)).toBe(t.indexOf(TITOLO_RESPONSABILE_DPI) + 1);
  });

  it("se sono già salvate (anche con un nominativo o scritte un po' diversamente) non si duplicano e non cambiano", () => {
    const salvate = [
      { titolo: TITOLO_CATEGORIE_PREPOSTI, nomi: ["x"] },
      { titolo: "Responsabile distribuzione DPI", nomi: ["Rossi Mario"] },
      { titolo: "Responsabile custodia S.D.S.? sds", nomi: ["Bianchi Luca"] },
    ];
    const r = normalizzaVociOrganigramma(salvate);
    expect(r.map(({ titolo, nomi }) => ({ titolo, nomi }))).toEqual(salvate); // nessun doppione, titoli e nominativi invariati
    expect(r.every((v) => v.tipo)).toBe(true); // ogni voce riceve il suo tipo (ruolo azzurro / nota marroncina)
  });

  it("se mancano vengono aggiunte vuote, senza toccare le altre voci", () => {
    const r = normalizzaVociOrganigramma([{ titolo: TITOLO_CATEGORIE_PREPOSTI, nomi: ["x"] }, { titolo: "Addetti registro antincendio", nomi: ["Bardelli Mariacristina"] }]);
    expect(r.slice(-2)).toEqual([
      { titolo: TITOLO_RESPONSABILE_DPI, nomi: [], tipo: "ruolo" },
      { titolo: TITOLO_RESPONSABILE_SDS, nomi: [], tipo: "ruolo" },
    ]);
    expect(r[1]!.nomi).toEqual(["Bardelli Mariacristina"]);
  });
});

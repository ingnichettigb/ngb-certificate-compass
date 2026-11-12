/*
 * File:      nomine.test.ts
 * Percorso:  src/features/nomine/nomine.test.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Prove su segnaposto, blocchi del documento, anno scolastico e nominativi dall'organigramma.
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { MODELLI_DEFAULT } from "./modelli-default";
import {
  annoScolastico,
  blocchiCorpo,
  costruisciDocumento,
  dataItaliana,
  sostituisciSegnaposto,
  testoDocumento,
} from "./documento";
import { candidatiManuali, nominatiDaOrganigramma } from "./nominativi";
import { ELENCO_NOMINE, voceElenco, type TipoNomina } from "./tipi";
import { uniscimodello } from "@/lib/api/modelli-nomina";

const ditta = {
  ragione_sociale: "Liceo X",
  comune: "Cremona",
  datore_di_lavoro: "Maria Rossi",
  e_scuola: true,
};
const dati = { nome: "Rossi Mario", anno: "2026-2027", protocollo: "167", data: "12/11/2026" };

describe("segnaposto e documento", () => {
  it("sostituisce i segnaposto noti e lascia quelli sconosciuti", () => {
    expect(
      sostituisciSegnaposto("{{nome}} - {{istituto}} - {{boh}}", { nome: "A", istituto: "B" }),
    ).toBe("A - B - {{boh}}");
  });

  it("ogni modello si costruisce senza segnaposto rimasti e con i dati della ditta", () => {
    for (const { tipo } of ELENCO_NOMINE) {
      const testo = testoDocumento(costruisciDocumento(MODELLI_DEFAULT[tipo], ditta, dati));
      expect(testo, tipo).not.toMatch(/\{\{/);
      expect(testo, tipo).toContain("Rossi Mario");
      expect(testo, tipo).toContain("Il Dirigente Scolastico Maria Rossi");
    }
  });

  it("cambiando ditta cambiano istituto e qualifica del firmatario", () => {
    const testo = testoDocumento(
      costruisciDocumento(
        MODELLI_DEFAULT["primo-soccorso"],
        { ragione_sociale: "Alfa Srl", datore_di_lavoro: "Luca Verdi", e_scuola: false },
        dati,
      ),
    );
    expect(testo).toContain("presso Alfa Srl");
    expect(testo).toContain("Il Datore di Lavoro Luca Verdi");
    expect(testo).not.toContain("Liceo");
  });

  it("numera da sole le voci e non conta sottotitoli, puntati e rientrati", () => {
    const b = blocchiCorpo("# Titolo\nPrima\n> dettaglio\n- punto\nSeconda");
    expect(b.filter((x) => x.t === "voce").map((x) => (x.t === "voce" ? x.numero : 0))).toEqual([
      1, 2,
    ]);
    expect(b.map((x) => x.t)).toEqual(["sottotitolo", "voce", "rientrato", "puntato", "voce"]);
  });

  it("le dichiarazioni sulla formazione compaiono solo dove il modello le prevede", () => {
    const tipi = (t: TipoNomina) =>
      costruisciDocumento(MODELLI_DEFAULT[t], ditta, dati).some((b) => b.t === "formazione");
    expect(tipi("primo-soccorso")).toBe(true);
    expect(tipi("preposto")).toBe(true);
    expect(tipi("dpi")).toBe(false);
    expect(tipi("sds")).toBe(false);
  });

  it("anno scolastico e data", () => {
    expect(annoScolastico(new Date(2026, 10, 12))).toBe("2026-2027");
    expect(annoScolastico(new Date(2027, 2, 1))).toBe("2026-2027");
    expect(annoScolastico(new Date(2026, 8, 1))).toBe("2026-2027");
    expect(dataItaliana(new Date(2026, 10, 2))).toBe("02/11/2026");
  });

  it("un campo del database sostituisce il default, un campo assente lo lascia", () => {
    const m = uniscimodello("dpi", { titolo: "Mio titolo", corpo: "Una sola voce" });
    expect(m.titolo).toBe("Mio titolo");
    expect(m.corpo).toBe("Una sola voce");
    expect(m.oggetto).toBe(MODELLI_DEFAULT.dpi.oggetto);
  });
});

const dip = (id: string, cognome: string, nome: string, extra: Partial<Dipendente> = {}) =>
  ({
    id,
    cognome,
    nome,
    codice_fiscale: id,
    email: null,
    reparto: "ATA",
    sottoreparto: null,
    classe_concorso: null,
    materia: null,
    luogo_nascita: null,
    data_nascita: null,
    ...extra,
  }) as Dipendente;
const ruolo = (
  id: string,
  nome: string,
  macro: string | null = null,
  extra: Partial<RuoloSicurezza> = {},
): RuoloSicurezza => ({
  id,
  nome,
  descrizione: null,
  macro_categoria: macro,
  obbligatorio_tutti: false,
  attivo: true,
  ordine: 0,
  ...extra,
});

describe("nominativi dall'organigramma", () => {
  const dipendenti = [
    dip("1", "Strocchia", "Carlo"),
    dip("2", "Bianchi", "Anna"),
    dip("3", "Cessato", "Gino", { stato_lavoratore: "cessato" }),
    dip("4", "Neri", "Paolo"),
  ];
  const ruoli = [
    ruolo("r1", "Addetto Antincendio", "Antincendio"),
    ruolo("r2", "Lavoratore", "Antincendio"),
    ruolo("r3", "Addetto Primo Soccorso", "Primo Soccorso"),
  ];
  const assegnazioni: AssegnazioneRuolo[] = [
    { id: "a1", dipendente_id: "1", ruolo_id: "r1" },
    { id: "a2", dipendente_id: "2", ruolo_id: "r1" },
    { id: "a3", dipendente_id: "3", ruolo_id: "r1" },
    { id: "a4", dipendente_id: "4", ruolo_id: "r3" },
  ];
  const voci = [
    {
      titolo: "Addetti registro antincendio",
      nomi: ["Cicatiello Maria Grazia *", "Cicatiello Maria Grazia"],
    },
  ];
  const base = { dipendenti, ruoli, assegnazioni, voci };

  it("dai ruoli: solo lavoratori in forza, in ordine alfabetico, cognome e nome per esteso", () => {
    const n = nominatiDaOrganigramma(voceElenco("antincendio")!, base);
    expect(n.map((x) => x.nome)).toEqual(["Bianchi Anna", "Strocchia Carlo"]);
    expect(nominatiDaOrganigramma(voceElenco("primo-soccorso")!, base).map((x) => x.nome)).toEqual([
      "Neri Paolo",
    ]);
  });

  it("dalle voci libere: toglie l'asterisco e i doppioni", () => {
    const n = nominatiDaOrganigramma(voceElenco("registro-antincendio")!, base);
    expect(n.map((x) => x.nome)).toEqual(["Cicatiello Maria Grazia"]);
    expect(n[0]?.origine).toBe("voce");
  });

  it("senza voce o ruolo collegati l'elenco è vuoto", () => {
    expect(nominatiDaOrganigramma(voceElenco("dpi")!, base)).toEqual([]);
    expect(nominatiDaOrganigramma(voceElenco("evacuazione")!, base)).toEqual([]);
  });

  it("candidati manuali: in forza e non già nell'elenco", () => {
    const gia = nominatiDaOrganigramma(voceElenco("antincendio")!, base);
    expect(candidatiManuali(dipendenti, gia).map((x) => x.nome)).toEqual(["Neri Paolo"]);
  });
});

describe("PDF", () => {
  it("genera un PDF con una pagina almeno per ogni nominato, anche con caratteri non supportati", async () => {
    const { generaPdfNomine, spezzaRighe } = await import("./genera-pdf");
    const { PDFDocument } = await import("pdf-lib");
    const bytes = await generaPdfNomine(
      MODELLI_DEFAULT.dpi,
      {
        ...ditta,
        indirizzo: "Via Palestro 31/a",
        cap: "26100",
        provincia: "CR",
        telefono: "0372/22051",
        email: "a@b.it",
        pec: "p@b.it",
        codice_fiscale: "80003260199",
        logo_data_url: process.env["NOMINE_LOGO"] ?? null,
      },
      [
        { nome: "Riboni Claudia", protocollo: "1803" },
        { nome: "Zażółć Ćma", protocollo: "1804" },
      ],
      { anno: "2026-2027", data: "12/11/2026" },
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
    if (process.env["NOMINE_PDF_OUT"])
      (await import("node:fs")).writeFileSync(process.env["NOMINE_PDF_OUT"], bytes);
    const f = { widthOfTextAtSize: (t: string, s: number) => t.length * s * 0.5 };
    expect(spezzaRighe("uno due tre quattro cinque", f, 10, 60).length).toBeGreaterThan(1);
  });
});

import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { PDFDocument as Doc, StandardFonts } from "pdf-lib";
import { aCapo, costruisciRiquadriPdf, creaPdfOrganigrammaA3, NOMI_PROPORZIONE_MIN, pianificaElenchi, scalaConPiano, scalaPerEntrare, type Metriche, type RiquadroPdf } from "./esporta-organigramma-a3-pdf";

const nomi = (n: number, prefisso = "ROSSI") => Array.from({ length: n }, (_, i) => ({ testo: `${prefisso} Nome${i}`, daFormare: i % 7 === 0 }));
const riquadro = (titolo: string, ata: number, docenti: number): RiquadroPdf => ({
  titolo,
  ata: nomi(ata),
  docenti: nomi(docenti, "Prof. VERDI"),
  colonneInterne: ata + docenti > 12 ? 2 : 1,
});
const NORMALE: RiquadroPdf[][] = [
  [riquadro("Addetti primo soccorso", 8, 25), riquadro("Addetti defibrillatore", 6, 19)],
  [riquadro("Addetti all'evacuazione", 1, 2), riquadro("Preposti", 5, 41)],
  [riquadro("Addetti antincendio", 8, 22)],
];
const DITTA = { ragione_sociale: "Nichetti Gian Battista", datore_di_lavoro: "Dott.ssa MARIA GRAZIA NOLLI", rls: "Prof. GIANMARI", medico_competente: "Dott.ssa BOCCASAVIA", rspp: "Prof. NICHETTI", aspp: "Prof. AGNOLI", indirizzo: "Via Fascolo, 28", cap: "26015", comune: "Soresina", provincia: "CR" };

describe("PDF A3 dell'organigramma", () => {
  it("crea un solo foglio A3 orizzontale", async () => {
    const doc = await PDFDocument.load(await creaPdfOrganigrammaA3({ ditta: DITTA, annoScolastico: "2026-2027", colonne: NORMALE }));
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(1190.55, 1);
    expect(height).toBeCloseTo(841.89, 1);
  });
  it("con tanti nominativi riduce i caratteri ma resta su un solo foglio", async () => {
    const enorme: RiquadroPdf[][] = [[riquadro("A", 0, 120)], [riquadro("B", 0, 120)], [riquadro("C", 0, 120)]];
    expect(scalaPerEntrare(enorme)).toBeLessThan(0.9);
    const doc = await PDFDocument.load(await creaPdfOrganigrammaA3({ ditta: DITTA, annoScolastico: "2026-2027", colonne: enorme }));
    expect(doc.getPageCount()).toBe(1);
  });
  it("con pochi nominativi ingrandisce (al massimo 1,3) e con i numeri reali sta tra 1 e 1,3", () => {
    expect(scalaPerEntrare([[riquadro("A", 0, 3)], [], []])).toBe(1.3);
    const s = scalaPerEntrare(NORMALE);
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(1.3);
  });
  it("funziona senza ditta, senza riquadri e con caratteri fuori dal set standard", async () => {
    const strano: RiquadroPdf[][] = [[{ titolo: "Titolo ŝ ≠", ata: [{ testo: "Müller Zoë 王" }], docenti: [], colonneInterne: 1 }], [], []];
    const bytes = await creaPdfOrganigrammaA3({ ditta: undefined, annoScolastico: "2026-2027", colonne: strano });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
  it("costruisce i riquadri dall'ordine di disposizione: voci libere con «—», docenti con «Prof.»", () => {
    const col = costruisciRiquadriPdf(
      [[{ id: "primo-soccorso", colonneInterne: 1 }], [{ id: "voce-0", colonneInterne: 1 }, { id: "voce-9", colonneInterne: 1 }]],
      [{ chiave: "primo-soccorso", titolo: "Addetti primo soccorso", ata: [{ testo: "ROSSI Anna", daFormare: false }], docenti: [{ testo: "BIANCHI Luca", daFormare: true }] }],
      [{ titolo: "Registro", nomi: [] }],
    );
    expect(col[0]![0]!.docenti[0]).toEqual({ testo: "Prof. BIANCHI Luca", daFormare: true });
    expect(col[1]).toHaveLength(1); // «voce-9» inesistente: ignorata
    expect(col[1]![0]!.vuoto).toBe("—");
  });
});

describe("un solo corpo per tutti i nomi", () => {
  const metriche = async (): Promise<Metriche> => {
    const doc = await Doc.create();
    const n = await doc.embedFont(StandardFonts.Helvetica);
    const g = await doc.embedFont(StandardFonts.HelveticaBold);
    return { normale: (t, s) => n.widthOfTextAtSize(t, s), grassetto: (t, s) => g.widthOfTextAtSize(t, s) };
  };
  const lunghi = (): RiquadroPdf[][] => [
    [{ titolo: "Primo soccorso", ata: nomi(10), docenti: [...nomi(8, "Prof. VERDI"), { testo: "Prof. CASTIGLIONE DELLA ROCCA Giovanni Battista", daFormare: false }], colonneInterne: 2 }],
    [{ titolo: "Antincendio", ata: nomi(8), docenti: nomi(8, "Prof. NERI"), colonneInterne: 2 }],
    [],
  ];

  it("il corpo è lo stesso per tutti i riquadri e non scende sotto l'85% del normale", async () => {
    const met = await metriche();
    const p = pianificaElenchi(lunghi(), 1.15, met);
    const normale = 9.5 * 1.15;
    expect(p.corpo).toBeLessThanOrEqual(normale);
    expect(p.corpo).toBeGreaterThanOrEqual(normale * NOMI_PROPORZIONE_MIN - 1e-9);
    expect(p.corpo).toBeLessThan(normale); // il nome lungo costringe a ridurre, ma per tutti insieme
  });

  it("nessun nome viene troncato: il nome troppo lungo per l'85% va a capo e non perde lettere", async () => {
    const met = await metriche();
    const colonne = lunghi();
    const p = pianificaElenchi(colonne, 1.3, met);
    const riquadro = colonne[0]![0]!;
    const righe = p.riquadri.get(riquadro)!.colonne.flat().flatMap((v) => (v === "spazio" ? [] : v.righe));
    expect(righe.join(" ")).toContain("CASTIGLIONE DELLA ROCCA");
    expect(righe.join(" ")).toContain("Battista");
    expect(righe.join("").includes("…")).toBe(false);
  });

  it("senza nomi lunghi il corpo resta quello normale", async () => {
    const met = await metriche();
    const p = pianificaElenchi([[riquadro("A", 3, 3)], [], []], 1, met);
    expect(p.corpo).toBeCloseTo(9.5, 1);
  });

  it("le voci libere non abbassano il corpo dei nomi", async () => {
    const met = await metriche();
    const col: RiquadroPdf[][] = [[{ titolo: "Voce", ata: [{ testo: "Alunni addetti ai diversamente abili in caso di evacuazione dell'edificio", libera: true }], docenti: [], colonneInterne: 2 }], [], []];
    expect(pianificaElenchi(col, 1, met).corpo).toBeCloseTo(9.5, 1);
  });

  it("la tavola con nomi a capo sta comunque su un solo foglio e la scala non supera quella senza a-capo", async () => {
    const met = await metriche();
    const colonne = lunghi();
    expect(scalaConPiano(colonne, met)).toBeLessThanOrEqual(scalaPerEntrare(colonne));
    const doc = await PDFDocument.load(await creaPdfOrganigrammaA3({ ditta: DITTA, annoScolastico: "2026-2027", colonne }));
    expect(doc.getPageCount()).toBe(1);
  });

  it("aCapo: va a capo per parole, spezza una parola più larga dello spazio e non perde caratteri", () => {
    const w = (t: string) => t.length * 5;
    expect(aCapo("DE LUCA SANTORO G. B.", w, 60)).toEqual(["DE LUCA", "SANTORO", "G. B."]); // le iniziali restano insieme
    expect(aCapo("ANTONUCCIOXXXXXXXXXX", w, 50).join("")).toBe("ANTONUCCIOXXXXXXXXXX");
    expect(aCapo("", w, 50)).toEqual([""]);
  });
});

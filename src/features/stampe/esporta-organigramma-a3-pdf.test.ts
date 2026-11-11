import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { costruisciRiquadriPdf, creaPdfOrganigrammaA3, scalaPerEntrare, type RiquadroPdf } from "./esporta-organigramma-a3-pdf";

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

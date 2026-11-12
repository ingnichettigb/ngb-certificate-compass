/*
 * File:      segnalibri.test.ts
 * Percorso:  src/features/stampe/globale/segnalibri.test.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Link interni e segnalibri: il PDF salvato e riletto contiene le annotazioni e l'albero dei segnalibri.
 */
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { aggiungiLink, aggiungiSegnalibri } from "./segnalibri";

async function documento(n: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([200, 200]);
  return doc;
}

function titoli(doc: PDFDocument, dict: PDFDict): string[] {
  const out: string[] = [];
  let corrente = dict.lookup(PDFName.of("First"), PDFDict);
  while (corrente) {
    out.push((corrente.lookup(PDFName.of("Title")) as PDFHexString).decodeText());
    corrente = corrente.lookup(PDFName.of("Next")) as PDFDict | undefined as PDFDict;
    if (!(corrente instanceof PDFDict)) break;
  }
  return out;
}

describe("link interni", () => {
  it("aggiunge un'annotazione Link che punta alla pagina giusta", async () => {
    const doc = await documento(3);
    aggiungiLink(doc, doc.getPage(0), [10, 10, 100, 30], doc.getPage(2));
    const riletto = await PDFDocument.load(await doc.save());
    const annots = riletto.getPage(0).node.Annots();
    expect(annots?.size()).toBe(1);
    const a = annots?.lookup(0, PDFDict);
    expect(a?.get(PDFName.of("Subtype"))?.toString()).toBe("/Link");
    const dest = a?.lookup(PDFName.of("Dest"), PDFArray);
    expect(dest?.get(0)).toBe(riletto.getPage(2).ref);
  });
});

describe("segnalibri", () => {
  it("crea l'albero con figli, conteggi e apre il pannello", async () => {
    const doc = await documento(5);
    aggiungiSegnalibri(doc, [
      { titolo: "Copertina", pagina: 0 },
      {
        titolo: "Rossi Maria Łucja",
        pagina: 1,
        figli: [
          { titolo: "Preposto (01/01/2020)", pagina: 2 },
          { titolo: "Antincendio (05/05/2022)", pagina: 3 },
        ],
      },
      { titolo: "Indice e controlli", pagina: 4 },
    ]);
    const riletto = await PDFDocument.load(await doc.save());
    expect(riletto.catalog.get(PDFName.of("PageMode"))?.toString()).toBe("/UseOutlines");
    const radice = riletto.catalog.lookup(PDFName.of("Outlines"), PDFDict);
    expect(radice.lookup(PDFName.of("Count"), PDFNumber).asNumber()).toBe(3);
    expect(titoli(riletto, radice)).toEqual([
      "Copertina",
      "Rossi Maria Łucja",
      "Indice e controlli",
    ]);

    const secondo = radice.lookup(PDFName.of("First"), PDFDict).lookup(PDFName.of("Next"), PDFDict);
    expect(secondo.lookup(PDFName.of("Count"), PDFNumber).asNumber()).toBe(-2); // figli chiusi
    expect(titoli(riletto, secondo)).toEqual(["Preposto (01/01/2020)", "Antincendio (05/05/2022)"]);
    const dest = secondo.lookup(PDFName.of("Dest"), PDFArray);
    expect(dest.get(0)).toBe(riletto.getPage(1).ref);
  });

  it("ignora le voci con pagina inesistente e non scrive nulla se non resta niente", async () => {
    const doc = await documento(1);
    aggiungiSegnalibri(doc, [{ titolo: "Fuori", pagina: 9 }]);
    expect(doc.catalog.get(PDFName.of("Outlines"))).toBeUndefined();
  });
});

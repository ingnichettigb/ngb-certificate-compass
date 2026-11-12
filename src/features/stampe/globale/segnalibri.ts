/*
 * File:      segnalibri.ts
 * Percorso:  src/features/stampe/globale/segnalibri.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Link interni cliccabili (indice → scheda del lavoratore, scheda → «Torna all'indice») e segnalibri nel pannello
 *            laterale del lettore PDF (lavoratori con, sotto, i loro attestati). pdf-lib non ha un'API per i segnalibri:
 *            si scrive direttamente la struttura /Outlines del PDF.
 */
import { PDFDocument, PDFHexString, PDFName, type PDFPage, type PDFRef } from "pdf-lib";

export type Rettangolo = [x1: number, y1: number, x2: number, y2: number];

/** Area cliccabile su `pagina` che porta alla pagina `destinazione` (senza bordo visibile). */
export function aggiungiLink(
  doc: PDFDocument,
  pagina: PDFPage,
  area: Rettangolo,
  destinazione: PDFPage,
): void {
  const annotazione = doc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: area,
    Border: [0, 0, 0],
    Dest: [destinazione.ref, PDFName.of("Fit")],
  });
  pagina.node.addAnnot(doc.context.register(annotazione));
}

export type Segnalibro = {
  titolo: string;
  /** Indice della pagina di destinazione, da 0. */
  pagina: number;
  /** Voci annidate (chiuse all'apertura). */
  figli?: Segnalibro[];
};

type Estremi = { primo: PDFRef; ultimo: PDFRef; visibili: number };

/** Costruisce l'albero dei segnalibri e lo collega al documento; il pannello si apre da solo. */
export function aggiungiSegnalibri(doc: PDFDocument, voci: Segnalibro[]): void {
  const pagine = doc.getPages();
  const valide = (elenco: Segnalibro[]) => elenco.filter((v) => pagine[v.pagina] !== undefined);
  const radice = valide(voci);
  if (!radice.length) return;
  const ctx = doc.context;
  const radiceRef = ctx.nextRef();

  const costruisci = (elenco: Segnalibro[], genitore: PDFRef): Estremi | null => {
    const lista = valide(elenco);
    if (!lista.length) return null;
    const refs = lista.map(() => ctx.nextRef());
    lista.forEach((v, i) => {
      const destinazione = pagine[v.pagina];
      if (!destinazione) return;
      const prev = refs[i - 1];
      const next = refs[i + 1];
      const figli = v.figli ? costruisci(v.figli, refs[i] as PDFRef) : null;
      ctx.assign(
        refs[i] as PDFRef,
        ctx.obj({
          Title: PDFHexString.fromText(v.titolo),
          Parent: genitore,
          Dest: [destinazione.ref, PDFName.of("Fit")],
          ...(prev ? { Prev: prev } : {}),
          ...(next ? { Next: next } : {}),
          ...(figli ? { First: figli.primo, Last: figli.ultimo, Count: -figli.visibili } : {}),
        }),
      );
    });
    return {
      primo: refs[0] as PDFRef,
      ultimo: refs[refs.length - 1] as PDFRef,
      visibili: lista.length,
    };
  };

  const livello = costruisci(radice, radiceRef);
  if (!livello) return;
  ctx.assign(
    radiceRef,
    ctx.obj({
      Type: "Outlines",
      First: livello.primo,
      Last: livello.ultimo,
      Count: livello.visibili,
    }),
  );
  doc.catalog.set(PDFName.of("Outlines"), radiceRef);
  doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
}

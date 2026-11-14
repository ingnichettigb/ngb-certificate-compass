/*
 * File:      genera-pdf.ts
 * Percorso:  src/features/nomine/genera-pdf.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — PDF delle nomine con pdf-lib (testo reale, A4): intestazione e logo dalla ditta, una nomina per nominato,
 *            ogni nomina inizia su una pagina nuova; numero di pagina e copyright in fondo, come le altre stampe.
 *   rev 2 — 14/11/2026 — Sedi: il nome del plesso scelto arriva al segnaposto {{sede}} dei modelli.
 */
import type { PDFFont, PDFPage } from "pdf-lib";
import type { DittaRecord } from "@/lib/api/ditta";
import { COPYRIGHT_STAMPE, byteLogoDitta } from "@/lib/identita-ditta";
import { costruisciDocumento, type Blocco, type DatiNomina } from "./documento";
import { righeIntestazione } from "./intestazione";
import type { ModelloNomina } from "./tipi";

const A4 = { w: 595.28, h: 841.89 };
const MARGINE = 56;
const LARGHEZZA = A4.w - MARGINE * 2;
const CORPO = 9.5;
const INTERLINEA = 1.28;

export type NominaPerPdf = { nome: string; protocollo: string; numero?: string };

/** Spezza il testo in righe che stanno nella larghezza data. */
export function spezzaRighe(
  testo: string,
  font: Pick<PDFFont, "widthOfTextAtSize">,
  size: number,
  larghezza: number,
): string[] {
  const righe: string[] = [];
  let corrente = "";
  for (const parola of testo.split(/\s+/).filter(Boolean)) {
    const prova = corrente ? `${corrente} ${parola}` : parola;
    if (corrente && font.widthOfTextAtSize(prova, size) > larghezza) {
      righe.push(corrente);
      corrente = parola;
    } else corrente = prova;
  }
  if (corrente) righe.push(corrente);
  return righe.length ? righe : [""];
}

export async function generaPdfNomine(
  modello: ModelloNomina,
  ditta: Partial<DittaRecord> | null | undefined,
  nominati: NominaPerPdf[],
  comuni: Pick<DatiNomina, "anno" | "data" | "sede">,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const normale = await doc.embedFont(StandardFonts.Helvetica);
  const grassetto = await doc.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = byteLogoDitta(ditta);
  const logo = logoBytes ? await doc.embedPng(logoBytes) : null;
  const nero = rgb(0, 0, 0);
  const grigio = rgb(0.35, 0.35, 0.35);

  /** Toglie i caratteri che il font standard non sa scrivere (altrimenti pdf-lib va in errore). */
  const ammessi = new Set(normale.getCharacterSet());
  const pulisci = (t: string) =>
    [...t.replace(/\u00A0/g, " ")]
      .map((c) => (c === "\n" || ammessi.has(c.codePointAt(0)!) ? c : "?"))
      .join("");

  const pagine: PDFPage[] = [];
  let pagina!: PDFPage;
  let y = 0;
  const nuovaPagina = () => {
    pagina = doc.addPage([A4.w, A4.h]);
    pagine.push(pagina);
    y = A4.h - MARGINE;
  };
  const serve = (altezza: number) => {
    if (y - altezza < MARGINE + 18) nuovaPagina();
  };

  const scrivi = (testo: string, x: number, font: PDFFont, size: number, colore = nero) => {
    pagina.drawText(pulisci(testo), { x, y: y - size, size, font, color: colore });
  };
  const centrato = (
    testo: string,
    font: PDFFont,
    size: number,
    x0 = MARGINE,
    larghezza = LARGHEZZA,
  ) => {
    const t = pulisci(testo);
    scrivi(t, x0 + (larghezza - font.widthOfTextAtSize(t, size)) / 2, font, size);
  };
  /** Paragrafo a capo automatico; restituisce lo spazio usato. */
  const paragrafo = (
    testo: string,
    x: number,
    larghezza: number,
    font: PDFFont,
    size: number,
    dopo = 5,
  ) => {
    const righe = spezzaRighe(pulisci(testo), font, size, larghezza);
    for (const r of righe) {
      serve(size * INTERLINEA);
      scrivi(r, x, font, size);
      y -= size * INTERLINEA;
    }
    y -= dopo;
  };

  const intestazione = () => {
    const righe = righeIntestazione(ditta);
    const altezzaTesto = righe.length * 12 + 10;
    const altezzaLogo = logo ? Math.min(60, (logo.height / logo.width) * 80) + 10 : 0;
    const altezza = Math.max(altezzaTesto, altezzaLogo, 52);
    pagina.drawRectangle({
      x: MARGINE,
      y: y - altezza,
      width: LARGHEZZA,
      height: altezza,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.7,
    });
    let xTesto = MARGINE;
    let largTesto = LARGHEZZA;
    if (logo) {
      const w = Math.min(80, (logo.width / logo.height) * 60);
      const h = (logo.height / logo.width) * w;
      pagina.drawImage(logo, { x: MARGINE + 8, y: y - altezza / 2 - h / 2, width: w, height: h });
      xTesto = MARGINE + w + 16;
      largTesto = LARGHEZZA - w - 16;
    }
    let yy = y - (altezza - righe.length * 12) / 2 - 2;
    for (const r of righe) {
      const f = r.grassetto ? grassetto : normale;
      const t = pulisci(r.testo);
      const size = r.grassetto ? 10.5 : 8.5;
      pagina.drawText(t, {
        x: xTesto + (largTesto - f.widthOfTextAtSize(t, size)) / 2,
        y: yy - size,
        size,
        font: f,
        color: nero,
      });
      yy -= 12;
    }
    y -= altezza + 22;
  };

  const disegna = (b: Blocco) => {
    switch (b.t) {
      case "titolo": {
        const righe = spezzaRighe(pulisci(b.testo), grassetto, 10, LARGHEZZA);
        for (const r of righe) {
          serve(14);
          centrato(r, grassetto, 10);
          y -= 13;
        }
        y -= 6;
        break;
      }
      case "protocollo": {
        serve(16);
        scrivi(`${b.numero ? `N° ${b.numero}  ·  ` : ""}prot. N° ${b.protocollo}`, MARGINE, normale, 8.5);
        const a = pulisci(b.anno);
        scrivi(a, MARGINE + LARGHEZZA - normale.widthOfTextAtSize(a, 8.5), normale, 8.5);
        y -= 18;
        break;
      }
      case "destinatario": {
        serve(34);
        const x = MARGINE + LARGHEZZA * 0.58;
        scrivi("Spett.le", x, normale, CORPO);
        y -= 13;
        scrivi(b.nome, x, grassetto, CORPO);
        y -= 28;
        break;
      }
      case "oggetto":
        paragrafo(
          b.testo.startsWith("Oggetto") ? b.testo : `Oggetto: ${b.testo}`,
          MARGINE,
          LARGHEZZA,
          grassetto,
          10.5,
          12,
        );
        break;
      case "paragrafo":
        paragrafo(b.testo, MARGINE, LARGHEZZA, normale, CORPO, 6);
        break;
      case "sottotitolo":
        paragrafo(b.testo, MARGINE + 14, LARGHEZZA - 14, grassetto, CORPO, 3);
        break;
      case "voce": {
        const righe = spezzaRighe(pulisci(b.testo), normale, CORPO, LARGHEZZA - 20);
        serve(CORPO * INTERLINEA * Math.min(righe.length, 2));
        scrivi(`${b.numero}.`, MARGINE, normale, CORPO);
        for (const r of righe) {
          serve(CORPO * INTERLINEA);
          scrivi(r, MARGINE + 20, normale, CORPO);
          y -= CORPO * INTERLINEA;
        }
        y -= 3;
        break;
      }
      case "puntato": {
        const righe = spezzaRighe(pulisci(b.testo), normale, CORPO, LARGHEZZA - 44);
        serve(CORPO * INTERLINEA);
        scrivi("-", MARGINE + 24, normale, CORPO);
        for (const r of righe) {
          serve(CORPO * INTERLINEA);
          scrivi(r, MARGINE + 34, normale, CORPO);
          y -= CORPO * INTERLINEA;
        }
        y -= 2;
        break;
      }
      case "rientrato":
        paragrafo(b.testo, MARGINE + 20, LARGHEZZA - 20, normale, CORPO, 3);
        break;
      case "firma-dirigente": {
        serve(100);
        y -= 4;
        scrivi(`${b.luogo}${b.luogo ? "     " : ""}${b.data}`, MARGINE, normale, CORPO);
        const xc = MARGINE + LARGHEZZA * 0.5;
        const lc = LARGHEZZA * 0.5;
        scrivi("", xc, normale, CORPO);
        centrato(b.qualifica, normale, CORPO, xc, lc);
        y -= 12;
        if (b.nome) {
          centrato(b.nome, normale, CORPO, xc, lc);
          y -= 12;
        }
        const [prima, ...altre] = b.note;
        if (prima) {
          centrato(prima, normale, 7, xc, lc);
          y -= 10;
        }
        for (const n of altre) {
          const righe = spezzaRighe(pulisci(n), normale, 7, LARGHEZZA);
          for (const r of righe) {
            centrato(r, normale, 7);
            y -= 9;
          }
        }
        y -= 18;
        break;
      }
      case "formazione": {
        serve(90);
        paragrafo("Il sottoscritto dichiara:", MARGINE, LARGHEZZA, grassetto, CORPO, 3);
        const f = b.figura;
        paragrafo(
          `[  ] di non aver ricevuto nessuna formazione per quanto riguarda la figura di ${f}.`,
          MARGINE,
          LARGHEZZA,
          normale,
          8.5,
          2,
        );
        paragrafo(
          `[  ] di aver ricevuto adeguata formazione per quanto riguarda la figura di ${f} e produrrà regolare certificazione`,
          MARGINE,
          LARGHEZZA,
          normale,
          8.5,
          2,
        );
        paragrafo(
          `[  ] di aver ricevuto adeguata formazione per quanto riguarda la figura di ${f} ma di non essere aggiornato`,
          MARGINE,
          LARGHEZZA,
          normale,
          8.5,
          8,
        );
        break;
      }
      case "presa-visione": {
        serve(70);
        paragrafo(b.etichetta, MARGINE, LARGHEZZA, grassetto, CORPO, 8);
        const riga = y - 14;
        scrivi("Nome Cognome", MARGINE, normale, 8);
        scrivi("data", MARGINE + LARGHEZZA * 0.45, normale, 8);
        scrivi("Firma", MARGINE + LARGHEZZA * 0.65, normale, 8);
        y -= 13;
        scrivi(b.nome, MARGINE, grassetto, CORPO);
        if (b.numero) scrivi(`N° ${b.numero}`, MARGINE + LARGHEZZA * 0.45, normale, 8);
        pagina.drawLine({
          start: { x: MARGINE + LARGHEZZA * 0.45, y: riga - 6 },
          end: { x: MARGINE + LARGHEZZA * 0.6, y: riga - 6 },
          thickness: 0.6,
          color: grigio,
        });
        pagina.drawLine({
          start: { x: MARGINE + LARGHEZZA * 0.65, y: riga - 6 },
          end: { x: MARGINE + LARGHEZZA, y: riga - 6 },
          thickness: 0.6,
          color: grigio,
        });
        y -= 16;
        break;
      }
    }
  };

  for (const n of nominati) {
    nuovaPagina();
    intestazione();
    for (const b of costruisciDocumento(modello, ditta, {
      nome: n.nome,
      protocollo: n.protocollo,
      ...(n.numero ? { numero: n.numero } : {}),
      anno: comuni.anno,
      data: comuni.data,
      ...(comuni.sede ? { sede: comuni.sede } : {}),
    }))
      disegna(b);
  }
  if (!nominati.length) {
    nuovaPagina();
    intestazione();
  }

  pagine.forEach((p, i) => {
    const t = pulisci(`${COPYRIGHT_STAMPE}     pag. ${i + 1}/${pagine.length}`);
    p.drawText(t, {
      x: MARGINE + LARGHEZZA - normale.widthOfTextAtSize(t, 7),
      y: 30,
      size: 7,
      font: normale,
      color: grigio,
    });
  });

  return doc.save();
}

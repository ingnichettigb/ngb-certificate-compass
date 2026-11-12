/*
 * File:      esporta-organigramma-a3-pdf.ts
 * Percorso:  src/features/stampe/esporta-organigramma-a3-pdf.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — «Genera PDF» dell'Organigramma della sicurezza: crea direttamente il file A3 orizzontale (un solo foglio, testo reale)
 *            senza passare dalla stampante virtuale del browser, che scompaginava la tavola. Usa pdf-lib (già nel progetto, caricato solo al
 *            clic) e le stesse colonne dell'anteprima (impaginaPerFunzione): primo soccorso + defibrillatore a sinistra, evacuazione + preposti
 *            al centro, antincendio a destra. Se il contenuto eccede il foglio, i caratteri si riducono in automatico (minimo 55%).
 *            «*» (da formare) in rosso e grassetto, come nel sistema colori delle altre stampe.
 *   rev 2 — 12/11/2026 — Un solo carattere e un solo corpo per tutti i nomi (pianificaElenchi): il corpo è quello con cui sta il nome più lungo,
 *            mai sotto l'85% del normale; se anche così non sta, il nome va a capo con lo stesso corpo (aCapo). Niente più nomi rimpiccioliti
 *            uno a uno né troncati con «…». Le voci libere (non nomi) seguono lo stesso corpo ma non lo abbassano.
 */
import type { PDFFont } from "pdf-lib";
import type { DittaRecord, VoceOrganigramma } from "@/lib/api/ditta";
import type { BloccoOrganigramma } from "./organigramma-a3";
import type { PostoLayout } from "./impagina-organigramma-a3";
import { testoPdf } from "./esporta-pdf";
import { nomeFileEsportazione, scarica } from "./esporta-file";

export type RigaElenco = { testo: string; daFormare?: boolean; /** Voce libera (non un nominativo): non abbassa il corpo dei nomi. */ libera?: boolean };
/** Un riquadro pronto da disegnare: ATA (o voci libere) prima, poi i docenti. */
export type RiquadroPdf = { titolo: string; ata: RigaElenco[]; docenti: RigaElenco[]; colonneInterne: 1 | 2; /** Testo se non ci sono nominativi. */ vuoto?: string };

export type DittaOrganigramma = Pick<
  DittaRecord,
  "ragione_sociale" | "datore_di_lavoro" | "rls" | "medico_competente" | "rspp" | "aspp" | "indirizzo" | "cap" | "comune" | "provincia"
>;

export type OpzioniPdfOrganigrammaA3 = {
  ditta: DittaOrganigramma | undefined;
  annoScolastico: string;
  /** Le tre colonne della tavola, dall'alto in basso. */
  colonne: RiquadroPdf[][];
  dataStampa?: Date;
};

/** Costruisce i riquadri del PDF dalla disposizione (stessi dati e stesso ordine dell'anteprima a video). */
export function costruisciRiquadriPdf(posti: PostoLayout[][], blocchi: BloccoOrganigramma[], vociVisibili: VoceOrganigramma[]): RiquadroPdf[][] {
  return posti.map((colonna) =>
    colonna.flatMap((p): RiquadroPdf[] => {
      if (p.id.startsWith("voce-")) {
        const v = vociVisibili[Number(p.id.slice(5))];
        if (!v) return [];
        return [{ titolo: v.titolo, ata: v.nomi.filter((n) => n.trim()).map((testo) => ({ testo, libera: true })), docenti: [], colonneInterne: p.colonneInterne, vuoto: "—" }];
      }
      const b = blocchi.find((x) => x.chiave === p.id);
      if (!b) return [];
      return [
        {
          titolo: b.titolo,
          ata: b.ata.map((n) => ({ testo: n.testo, daFormare: n.daFormare })),
          docenti: b.docenti.map((n) => ({ testo: `Prof. ${n.testo}`, daFormare: n.daFormare })),
          colonneInterne: p.colonneInterne,
        },
      ];
    }),
  );
}

/* ------------------------------------------------------------------------------------------------
 * Misure (punti PDF; A3 orizzontale)
 * ---------------------------------------------------------------------------------------------- */

const A3 = { larghezza: 1190.55, altezza: 841.89 };
const MARGINE = 22.68; // 8 mm, come la stampa
const SCALA_MIN = 0.55;
const SCALA_MAX = 1.3; // se c'è spazio, i caratteri si ingrandiscono (più leggibili su A3)

type Misure = { nome: number; riga: number; titolo: number; barra: number; pad: number; spazioBox: number; gapColonne: number; gapInterno: number };
const misureA = (s: number): Misure => ({
  nome: 9.5 * s,
  riga: 11.4 * s,
  titolo: 10.5 * s,
  barra: 17 * s,
  pad: 4 * s,
  spazioBox: 7 * s,
  gapColonne: 10,
  gapInterno: 12 * s,
});

const ALTEZZA_VERTICE = 110; // titoli + datore di lavoro + figure del servizio
const ALTEZZA_PIEDE = 86; // legenda + firme

function altezzaRiquadro(r: RiquadroPdf, m: Misure): number {
  const totale = r.ata.length + r.docenti.length;
  const righe = Math.max(1, Math.ceil(totale / r.colonneInterne));
  const spaziatore = r.colonneInterne === 1 && r.ata.length > 0 && r.docenti.length > 0 ? m.riga * 0.6 : 0;
  return m.barra + m.pad * 2 + righe * m.riga + spaziatore;
}

const altezzaColonna = (c: RiquadroPdf[], m: Misure) => c.reduce((t, r, i) => t + altezzaRiquadro(r, m) + (i > 0 ? m.spazioBox : 0), 0);

/** Scala (da 0,55 a 1,3) più grande con cui tutta la tavola sta nell'area utile sotto il vertice e sopra le firme. */
export function scalaPerEntrare(colonne: RiquadroPdf[][]): number {
  const disponibile = A3.altezza - 2 * MARGINE - ALTEZZA_VERTICE - ALTEZZA_PIEDE - 16;
  for (let s = SCALA_MAX; s >= SCALA_MIN - 1e-9; s -= 0.02) {
    const m = misureA(s);
    if (Math.max(0, ...colonne.map((c) => altezzaColonna(c, m))) <= disponibile) return Number(s.toFixed(2));
  }
  return SCALA_MIN;
}

/* ------------------------------------------------------------------------------------------------
 * Un solo corpo per tutti i nomi
 * ---------------------------------------------------------------------------------------------- */

/** Il corpo dei nomi non scende mai sotto questa parte del normale: oltre, il nome va a capo (stesso corpo). */
export const NOMI_PROPORZIONE_MIN = 0.85;

/** Larghezza del testo (in punti) con il carattere normale e con il grassetto (della stella «da formare»). */
export type Metriche = { normale: (t: string, size: number) => number; grassetto: (t: string, size: number) => number };

/** Va a capo per parole; una parola più larga dello spazio viene spezzata per caratteri. */
export function aCapo(t: string, larghezzaDi: (s: string) => number, max: number): string[] {
  const righe: string[] = [];
  let corrente = "";
  const spezza = (p: string): string[] => {
    const pezzi: string[] = [];
    let pezzo = "";
    for (const c of p) {
      if (pezzo && larghezzaDi(pezzo + c) > max) {
        pezzi.push(pezzo);
        pezzo = c;
      } else pezzo += c;
    }
    if (pezzo) pezzi.push(pezzo);
    return pezzi;
  };
  // Le iniziali puntate di fila («G. B.») restano insieme: a capo non si lascia una «B.» da sola
  const parole: string[] = [];
  for (const p of t.split(" ").filter(Boolean)) {
    const precedente = parole[parole.length - 1];
    if (precedente && /^\p{L}\.$/u.test(p) && /(^|\s)\p{L}\.$/u.test(precedente)) parole[parole.length - 1] = `${precedente} ${p}`;
    else parole.push(p);
  }
  for (const parola of parole) {
    const prova = corrente ? `${corrente} ${parola}` : parola;
    if (larghezzaDi(prova) <= max) {
      corrente = prova;
      continue;
    }
    if (corrente) righe.push(corrente);
    if (larghezzaDi(parola) <= max) corrente = parola;
    else {
      const pezzi = spezza(parola);
      righe.push(...pezzi.slice(0, -1));
      corrente = pezzi[pezzi.length - 1] ?? "";
    }
  }
  if (corrente) righe.push(corrente);
  return righe.length ? righe : [""];
}

export type VoceDisegno = { righe: string[]; daFormare?: boolean | undefined } | "spazio";
export type PianoRiquadro = { colonne: VoceDisegno[][]; haNomi: boolean; larghezzaInterna: number; altezza: number };
export type PianoElenchi = { m: Misure; larghezzaColonna: number; corpo: number; rientro: number; riquadri: Map<RiquadroPdf, PianoRiquadro>; altezzaMassima: number };

const UTILE = A3.larghezza - 2 * MARGINE;

/**
 * Dispone gli elenchi alla scala data. Il corpo è UNO per tutti i nomi: quello normale, ridotto solo quanto serve perché il nome
 * più lungo stia in una riga (mai sotto NOMI_PROPORZIONE_MIN); i nomi che ancora non stanno vanno a capo con lo stesso corpo.
 */
export function pianificaElenchi(colonne: RiquadroPdf[][], scala: number, met: Metriche): PianoElenchi {
  const m = misureA(scala);
  const nCol = Math.max(1, colonne.length);
  const larghezzaColonna = (UTILE - m.gapColonne * (nCol - 1)) / nCol;
  const rientro = 5 * scala; // le righe di un nome a capo sono rientrate
  const stella = (v: RigaElenco, size: number) => (v.daFormare ? met.grassetto("*", size) + 2.5 : 0);
  const tutti = colonne.flat();
  const wInt = (r: RiquadroPdf) => (larghezzaColonna - m.pad * 2 - m.gapInterno * (r.colonneInterne - 1)) / r.colonneInterne;

  let corpo = m.nome;
  for (const r of tutti) {
    for (const v of [...r.ata, ...r.docenti]) {
      if (v.libera) continue;
      const larghezza = met.normale(testoPdf(v.testo), m.nome);
      const spazio = wInt(r) - stella(v, m.nome) - rientro;
      if (larghezza > spazio) corpo = Math.min(corpo, (m.nome * spazio) / larghezza);
    }
  }
  corpo = Math.max(Math.floor(corpo * 20) / 20, m.nome * NOMI_PROPORZIONE_MIN);

  const riquadri = new Map<RiquadroPdf, PianoRiquadro>();
  for (const r of tutti) {
    const interni = r.colonneInterne;
    const voci: Array<RigaElenco | "spazio"> = [...r.ata];
    if (interni === 1 && r.ata.length > 0 && r.docenti.length > 0) voci.push("spazio");
    voci.push(...r.docenti);
    const pronte: VoceDisegno[] = voci.map((v) =>
      v === "spazio"
        ? "spazio"
        : { righe: aCapo(testoPdf(v.testo), (t) => met.normale(t, corpo), wInt(r) - stella(v, corpo) - rientro), daFormare: v.daFormare },
    );
    const perColonna = Math.max(1, Math.ceil(pronte.length / interni));
    const gruppi = Array.from({ length: interni }, (_, c) => pronte.slice(c * perColonna, (c + 1) * perColonna));
    const altezzaGruppo = (g: VoceDisegno[]) => g.reduce((t, v) => t + (v === "spazio" ? m.riga * 0.6 : v.righe.length * m.riga), 0);
    const altezzaElenco = Math.max(m.riga, ...gruppi.map(altezzaGruppo));
    riquadri.set(r, { colonne: gruppi, haNomi: voci.some((v) => v !== "spazio"), larghezzaInterna: wInt(r), altezza: m.barra + m.pad * 2 + altezzaElenco });
  }
  const altezzaColonnaPiano = (c: RiquadroPdf[]) => c.reduce((t, r, i) => t + riquadri.get(r)!.altezza + (i > 0 ? m.spazioBox : 0), 0);
  return { m, larghezzaColonna, corpo, rientro, riquadri, altezzaMassima: Math.max(0, ...colonne.map(altezzaColonnaPiano)) };
}

/** Scala più grande (da 0,55 a 1,3) con cui, a corpo unico e con i nomi a capo, la tavola sta nell'area utile. */
export function scalaConPiano(colonne: RiquadroPdf[][], met: Metriche): number {
  const disponibile = A3.altezza - 2 * MARGINE - ALTEZZA_VERTICE - ALTEZZA_PIEDE - 16;
  for (let s = scalaPerEntrare(colonne); s >= SCALA_MIN - 1e-9; s = Number((s - 0.02).toFixed(2))) {
    if (pianificaElenchi(colonne, s, met).altezzaMassima <= disponibile) return s;
  }
  return SCALA_MIN;
}

/* ------------------------------------------------------------------------------------------------
 * Creazione del PDF
 * ---------------------------------------------------------------------------------------------- */

export async function creaPdfOrganigrammaA3(o: OpzioniPdfOrganigrammaA3): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const normale = await doc.embedFont(StandardFonts.Helvetica);
  const grassetto = await doc.embedFont(StandardFonts.HelveticaBold);
  const corsivo = await doc.embedFont(StandardFonts.HelveticaOblique);
  const d = o.ditta;
  const stampato = o.dataStampa ?? new Date();

  doc.setTitle(testoPdf("Organigramma della sicurezza"));
  doc.setAuthor(testoPdf(d?.ragione_sociale || "Nichetti Gian Battista"));
  doc.setSubject("Organigramma del servizio di prevenzione e protezione");
  doc.setCreationDate(stampato);

  const page = doc.addPage([A3.larghezza, A3.altezza]);
  const nero = rgb(0, 0, 0);
  const rosso = rgb(0.78, 0.1, 0.1);
  const grigio = rgb(0.9, 0.9, 0.9);
  const grigioTesto = rgb(0.4, 0.4, 0.4);
  const X0 = MARGINE;
  const utile = A3.larghezza - 2 * MARGINE;
  const Y = (dall_alto: number) => A3.altezza - dall_alto; // coordinate dall'alto → PDF

  const larghezza = (t: string, f: PDFFont, size: number) => f.widthOfTextAtSize(t, size);
  const testo = (t: string, x: number, daAlto: number, size: number, f: PDFFont = normale, colore = nero) =>
    page.drawText(testoPdf(t), { x, y: Y(daAlto) - size * 0.8, size, font: f, color: colore });
  const centrato = (t: string, xCentro: number, daAlto: number, size: number, f: PDFFont = normale) =>
    testo(t, xCentro - larghezza(testoPdf(t), f, size) / 2, daAlto, size, f);
  const scatola = (x: number, daAlto: number, w: number, h: number, spessore = 0.8, riempi = false) =>
    page.drawRectangle({ x, y: Y(daAlto) - h, width: w, height: h, borderColor: nero, borderWidth: spessore, ...(riempi ? { color: grigio } : {}) });
  /** Testo che, se più largo dello spazio, si rimpicciolisce fino al 70% e poi si tronca con «…» (non va mai fuori dal riquadro). */
  const entro = (t: string, f: PDFFont, size: number, max: number): { t: string; size: number } => {
    let pulito = testoPdf(t);
    let sz = size;
    while (larghezza(pulito, f, sz) > max && sz > size * 0.7) sz -= 0.25;
    while (larghezza(pulito, f, sz) > max && pulito.length > 1) pulito = `${pulito.slice(0, -2)}…`;
    return { t: pulito, size: sz };
  };

  /* ---- Intestazione e vertice ---- */
  const centro = X0 + utile / 2;
  let y = MARGINE;
  centrato("ORGANIGRAMMA DEL SERVIZIO DI PREVENZIONE E PROTEZIONE DELLA SICUREZZA", centro, y, 8);
  y += 11;
  centrato(d?.ragione_sociale ?? "", centro, y, 20, grassetto);
  const anno = testoPdf(o.annoScolastico);
  const wAnno = larghezza(anno, grassetto, 15);
  testo(anno, X0 + utile - wAnno, y + 4, 15, grassetto);
  testo("ANNO SCOLASTICO", X0 + utile - wAnno - larghezza("ANNO SCOLASTICO", grassetto, 8) - 6, y + 10, 8, grassetto);
  y += 28;

  const wDatore = utile / 3;
  scatola(centro - wDatore / 2, y, wDatore, 34, 1.6);
  centrato("DATORE DI LAVORO", centro, y + 5, 7);
  centrato(d?.datore_di_lavoro || "—", centro, y + 16, 11, grassetto);
  y += 34;
  page.drawLine({ start: { x: centro, y: Y(y) }, end: { x: centro, y: Y(y + 9) }, thickness: 0.8, color: nero });
  y += 9;
  page.drawLine({ start: { x: X0, y: Y(y) }, end: { x: X0 + utile, y: Y(y) }, thickness: 0.8, color: nero });
  y += 6;

  const figure: Array<[string, string | null | undefined]> = [
    ["R.L.S.", d?.rls],
    ["Medico Competente", d?.medico_competente],
    ["R.S.P.P.", d?.rspp],
    ["A.S.P.P.", d?.aspp],
  ];
  const gapFigure = 9;
  const wFigura = (utile - gapFigure * 3) / 4;
  figure.forEach(([etichetta, valore], i) => {
    const x = X0 + i * (wFigura + gapFigure);
    scatola(x, y, wFigura, 21);
    const wEt = larghezza(testoPdf(etichetta), grassetto, 9.5) + 4; // testoPdf toglie gli spazi ai bordi: la distanza è esplicita
    testo(etichetta, x + 6, y + 6, 9.5, grassetto);
    const resto = entro(valore || "—", normale, 9.5, wFigura - 12 - wEt);
    testo(resto.t, x + 6 + wEt, y + 6, resto.size);
  });
  y += 21 + 10; // fine del vertice

  /* ---- Riquadri in tre colonne: un solo corpo per tutti i nomi ---- */
  const met: Metriche = { normale: (t, size) => larghezza(t, normale, size), grassetto: (t, size) => larghezza(t, grassetto, size) };
  const piano = pianificaElenchi(o.colonne, scalaConPiano(o.colonne, met), met);
  const { m, larghezzaColonna: wCol, corpo, rientro } = piano;

  const disegnaElenco = (r: RiquadroPdf, x: number, top: number) => {
    const p = piano.riquadri.get(r)!;
    if (!p.haNomi) {
      testo(r.vuoto ?? "Nessun incarico assegnato", x + m.pad, top, corpo, corsivo, grigioTesto);
      return;
    }
    p.colonne.forEach((gruppo, c) => {
      const xv = x + m.pad + c * (p.larghezzaInterna + m.gapInterno);
      let yv = top;
      for (const v of gruppo) {
        if (v === "spazio") {
          yv += m.riga * 0.6;
          continue;
        }
        v.righe.forEach((riga, k) => {
          const xr = xv + (k > 0 ? rientro : 0);
          testo(riga, xr, yv, corpo);
          if (k === v.righe.length - 1 && v.daFormare) testo("*", xr + larghezza(riga, normale, corpo) + 2.5, yv, corpo, grassetto, rosso);
          yv += m.riga;
        });
      }
    });
  };

  o.colonne.forEach((colonna, c) => {
    const x = X0 + c * (wCol + m.gapColonne);
    let top = y;
    colonna.forEach((r) => {
      const h = piano.riquadri.get(r)!.altezza;
      scatola(x, top, wCol, h, 0.8);
      // barra del titolo
      page.drawRectangle({ x, y: Y(top) - m.barra, width: wCol, height: m.barra, color: grigio, borderColor: nero, borderWidth: 0.8 });
      testo(r.titolo.toUpperCase(), x + m.pad + 1, top + (m.barra - m.titolo) / 2, m.titolo, grassetto);
      disegnaElenco(r, x, top + m.barra + m.pad);
      top += h + m.spazioBox;
    });
  });

  /* ---- Piede: legenda e firme (ancorati al fondo del foglio) ---- */
  const fondo = A3.altezza - MARGINE;
  const yLegenda = fondo - ALTEZZA_PIEDE + 4;
  testo("*", X0, yLegenda, 9, grassetto, rosso);
  testo("da formare (nessun attestato valido per l'incarico)", X0 + larghezza("*", grassetto, 9) + 4, yLegenda, 9);

  const gapFirme = 28;
  const wFirma = (utile - gapFirme * 2) / 3;
  const yFirme = fondo - 56;
  const rigaFirma = fondo - 16;
  const xFirma = (i: number) => X0 + i * (wFirma + gapFirme);
  testo(`Per presa visione R.L.S. ${d?.rls ?? ""}`, xFirma(0), yFirme, 9);
  page.drawLine({ start: { x: xFirma(0), y: Y(rigaFirma) }, end: { x: xFirma(0) + wFirma, y: Y(rigaFirma) }, thickness: 0.8, color: nero });
  centrato("Il Datore di lavoro", xFirma(1) + wFirma / 2, yFirme, 9);
  centrato(d?.datore_di_lavoro ?? "", xFirma(1) + wFirma / 2, yFirme + 11, 9);
  page.drawLine({ start: { x: xFirma(1), y: Y(rigaFirma) }, end: { x: xFirma(1) + wFirma, y: Y(rigaFirma) }, thickness: 0.8, color: nero });
  scatola(xFirma(2), yFirme - 4, wFirma, 44);
  centrato(d?.ragione_sociale ?? "", xFirma(2) + wFirma / 2, yFirme + 6, 10, grassetto);
  const indirizzo = [d?.indirizzo, [d?.cap, d?.comune].filter(Boolean).join(" "), d?.provincia && `(${d.provincia})`].filter(Boolean).join(" ");
  centrato(indirizzo, xFirma(2) + wFirma / 2, yFirme + 21, 9);

  return doc.save();
}

/** Crea il PDF e lo scarica come file (nessuna finestra di stampa). */
export async function scaricaPdfOrganigrammaA3(opzioni: OpzioniPdfOrganigrammaA3) {
  const byte = await creaPdfOrganigrammaA3(opzioni);
  scarica(new Blob([byte as BlobPart], { type: "application/pdf" }), nomeFileEsportazione("OrganigrammaA3", "pdf"));
}

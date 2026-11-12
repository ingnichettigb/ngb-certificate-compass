/*
 * File:      pagine-fisse.ts
 * Percorso:  src/features/stampe/globale/pagine-fisse.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Pagine disegnate della «Stampa globale» (A4 verticale): copertina grande con logo e indicazioni,
 *            scheda del lavoratore (anagrafica, funzioni, attestati per funzione e data), pagina finale con indice e controlli,
 *            piè di pagina «Blocco N di M · Pagina X di Y».
 *   rev 2 — 12/11/2026 06:53 — Copyright su tutte le pagine della stampa globale.
 *   rev 3 — 12/11/2026 — «Torna all'indice» in alto su ogni pagina della scheda (rettangoloTornaIndice, il link lo aggiunge genera.ts);
 *            la pagina finale restituisce dove ha scritto le righe dell'indice, per renderle cliccabili.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { Dipendente } from "@/lib/api";
import { statoScadenza } from "@/lib/api/incarichi";
import { dataIt } from "../stampa-formati";
import { spezzaTesto, testoPdf } from "../esporta-pdf";
import type { GruppoAttestati } from "./ordine-attestati";
import { COPYRIGHT_STAMPE } from "@/lib/identita-ditta";

export const A4V = { l: 595.28, a: 841.89 };
const M = 42;
const NERO = rgb(0.1, 0.1, 0.1);
const GRIGIO = rgb(0.4, 0.4, 0.4);
const VERDE = rgb(0.1, 0.45, 0.25);
const ROSSO = rgb(0.75, 0.1, 0.1);
const ARANCIO = rgb(0.8, 0.45, 0);

export type Caratteri = { n: PDFFont; b: PDFFont };
export async function caricaCaratteri(doc: PDFDocument): Promise<Caratteri> {
  return {
    n: await doc.embedFont(StandardFonts.Helvetica),
    b: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

function scrivi(
  p: PDFPage,
  t: string,
  x: number,
  y: number,
  f: PDFFont,
  size: number,
  colore = NERO,
) {
  p.drawText(testoPdf(t), { x, y, font: f, size, color: colore });
}
function centrato(p: PDFPage, t: string, y: number, f: PDFFont, size: number, colore = NERO) {
  const s = testoPdf(t);
  p.drawText(s, { x: (A4V.l - f.widthOfTextAtSize(s, size)) / 2, y, font: f, size, color: colore });
}
function tagliaAlla(f: PDFFont, t: string, size: number, largh: number): string {
  let s = testoPdf(t);
  if (f.widthOfTextAtSize(s, size) <= largh) return s;
  while (s.length > 1 && f.widthOfTextAtSize(`${s}…`, size) > largh) s = s.slice(0, -1);
  return `${s.trimEnd()}...`;
}

/* ─────────────────────────── Copertina ─────────────────────────── */

export type OpzioniCopertina = {
  ditta: string;
  logo?: { bytes: Uint8Array; formato: "jpg" | "png" } | null;
  numero: number;
  totale: number;
  intervallo: string;
  lavoratori: number;
  dataStampa: Date;
  indicazioni: string;
  /** Indirizzo/riferimenti sotto la ragione sociale (facoltativo). */
  riferimenti?: string;
};

export async function disegnaCopertina(
  doc: PDFDocument,
  c: Caratteri,
  o: OpzioniCopertina,
): Promise<void> {
  const p = doc.addPage([A4V.l, A4V.a]);
  let y = A4V.a - M;
  if (o.logo) {
    try {
      const img =
        o.logo.formato === "jpg"
          ? await doc.embedJpg(o.logo.bytes)
          : await doc.embedPng(o.logo.bytes);
      const s = Math.min(260 / img.width, 120 / img.height);
      p.drawImage(img, {
        x: (A4V.l - img.width * s) / 2,
        y: y - img.height * s,
        width: img.width * s,
        height: img.height * s,
      });
      y -= img.height * s + 30;
    } catch {
      y -= 20;
    }
  } else {
    y -= 20;
  }
  p.drawRectangle({ x: M, y: y - 4, width: A4V.l - 2 * M, height: 3, color: VERDE });
  y -= 60;
  centrato(p, "STAMPA GLOBALE", y, c.b, 40, VERDE);
  y -= 34;
  centrato(p, "Fascicolo attestati di formazione", y, c.n, 15, GRIGIO);
  y -= 50;
  for (const riga of spezzaTesto(o.ditta.toUpperCase(), A4V.l - 2 * M, (s) =>
    c.b.widthOfTextAtSize(s, 26),
  )) {
    centrato(p, riga, y, c.b, 26);
    y -= 32;
  }
  if (o.riferimenti) {
    centrato(p, tagliaAlla(c.n, o.riferimenti, 11, A4V.l - 2 * M), y, c.n, 11, GRIGIO);
    y -= 20;
  }
  y -= 40;
  centrato(
    p,
    `BLOCCO ${String(o.numero).padStart(2, "0")} DI ${String(o.totale).padStart(2, "0")}`,
    y,
    c.b,
    30,
  );
  y -= 66;
  centrato(p, o.intervallo, y, c.b, 54, VERDE);
  y -= 42;
  centrato(
    p,
    `${o.lavoratori} ${o.lavoratori === 1 ? "lavoratore" : "lavoratori"} in ordine alfabetico`,
    y,
    c.n,
    14,
    GRIGIO,
  );
  y -= 56;

  p.drawRectangle({ x: M, y: y - 4, width: A4V.l - 2 * M, height: 1, color: GRIGIO });
  y -= 24;
  scrivi(p, "INDICAZIONI", M, y, c.b, 13, VERDE);
  y -= 20;
  for (const par of o.indicazioni.split("\n")) {
    for (const riga of spezzaTesto(par, A4V.l - 2 * M, (s) => c.n.widthOfTextAtSize(s, 12))) {
      if (y < M + 40) break;
      scrivi(p, riga, M, y, c.n, 12);
      y -= 16;
    }
  }
  scrivi(
    p,
    `Stampato il ${dataIt(o.dataStampa.toISOString())} alle ${o.dataStampa.toTimeString().slice(0, 5)}`,
    M,
    M + 4,
    c.n,
    9,
    GRIGIO,
  );
}

/* ─────────────────────────── Scheda lavoratore ─────────────────────────── */

const TESTO_TORNA = "Torna all'indice";
const BLU = rgb(0.1, 0.3, 0.7);

/** Area del «Torna all'indice» in alto a destra (stessa su ogni pagina della scheda). */
export function rettangoloTornaIndice(c: Caratteri): [number, number, number, number] {
  const w = c.n.widthOfTextAtSize(TESTO_TORNA, 8);
  return [A4V.l - M - w - 2, A4V.a - 30, A4V.l - M + 2, A4V.a - 18];
}

function disegnaTornaIndice(p: PDFPage, c: Caratteri) {
  const [x1, y1] = rettangoloTornaIndice(c);
  p.drawText(TESTO_TORNA, { x: x1 + 2, y: y1 + 3, font: c.n, size: 8, color: BLU });
}

export type RigaAllegato = { pagine: number; nota?: string };
export type OpzioniScheda = {
  dip: Dipendente;
  funzioni: string[];
  gruppi: GruppoAttestati[];
  /** Esito del file per ogni attestato: serve a scrivere «allegato», «mancante», «non convertibile». */
  esitoPerAttestato: Map<string, string>;
};

const COLONNE = [
  { t: "Corso", l: 205 },
  { t: "Emissione", l: 62 },
  { t: "Scadenza", l: 62 },
  { t: "Stato", l: 62 },
  { t: "Allegato", l: 120 },
];

export async function disegnaScheda(
  doc: PDFDocument,
  c: Caratteri,
  o: OpzioniScheda,
): Promise<number> {
  const prima = doc.getPageCount();
  let p = doc.addPage([A4V.l, A4V.a]);
  disegnaTornaIndice(p, c);
  let y = A4V.a - M;
  const largh = A4V.l - 2 * M;

  const nuovaPagina = () => {
    p = doc.addPage([A4V.l, A4V.a]);
    disegnaTornaIndice(p, c);
    y = A4V.a - M;
    scrivi(p, `${o.dip.cognome} ${o.dip.nome} (continua)`, M, y, c.b, 11, GRIGIO);
    y -= 26;
  };
  const serve = (h: number) => {
    if (y - h < M + 24) nuovaPagina();
  };

  p.drawRectangle({ x: M, y: y - 44, width: largh, height: 52, color: rgb(0.93, 0.97, 0.94) });
  scrivi(
    p,
    tagliaAlla(c.b, `${o.dip.cognome} ${o.dip.nome}`.toUpperCase(), 24, largh - 16),
    M + 8,
    y - 28,
    c.b,
    24,
    NERO,
  );
  y -= 66;

  scrivi(p, "DATI ANAGRAFICI", M, y, c.b, 11, VERDE);
  y -= 16;
  const coppie: [string, string][] = [
    ["Codice fiscale", o.dip.codice_fiscale],
    ["Nato/a a", o.dip.luogo_nascita ?? "—"],
    ["Data di nascita", dataIt(o.dip.data_nascita)],
    ["Reparto", [o.dip.reparto, o.dip.sottoreparto].filter(Boolean).join(" – ") || "—"],
    ["Classe di concorso", o.dip.classe_concorso || "—"],
    ["Materia", o.dip.materia || "—"],
    ["Assunzione", dataIt(o.dip.data_assunzione)],
    [
      "Stato",
      o.dip.stato_lavoratore === "cessato"
        ? `Cessato (${dataIt(o.dip.data_cessazione)})`
        : "In forza",
    ],
  ];
  for (let i = 0; i < coppie.length; i += 2) {
    for (let k = 0; k < 2; k++) {
      const cp = coppie[i + k];
      if (!cp) continue;
      const x = M + k * (largh / 2);
      scrivi(p, `${cp[0]}:`, x, y, c.n, 10, GRIGIO);
      scrivi(p, tagliaAlla(c.b, cp[1], 10.5, largh / 2 - 108), x + 98, y, c.b, 10.5);
    }
    y -= 15;
  }
  y -= 14;

  scrivi(p, "FUNZIONI A CUI È INCARICATO", M, y, c.b, 11, VERDE);
  y -= 16;
  const testoFunzioni = o.funzioni.length ? o.funzioni.join(" · ") : "Nessun incarico assegnato";
  for (const riga of spezzaTesto(testoFunzioni, largh, (s) => c.b.widthOfTextAtSize(s, 11))) {
    serve(16);
    scrivi(p, riga, M, y, c.b, 11);
    y -= 15;
  }
  y -= 14;

  serve(40);
  scrivi(p, "ATTESTATI (per funzione, dal più recente)", M, y, c.b, 11, VERDE);
  y -= 8;
  if (!o.gruppi.length) {
    y -= 14;
    scrivi(p, "Nessun attestato approvato in archivio.", M, y, c.n, 11, GRIGIO);
  }
  const intestazione = () => {
    y -= 14;
    let x = M;
    p.drawRectangle({ x: M, y: y - 4, width: largh, height: 15, color: rgb(0.88, 0.88, 0.88) });
    for (const col of COLONNE) {
      scrivi(p, col.t, x + 3, y, c.b, 9);
      x += col.l;
    }
    y -= 4;
  };
  for (const g of o.gruppi) {
    serve(60);
    y -= 22;
    scrivi(p, g.etichetta.toUpperCase(), M, y, c.b, 10.5, VERDE);
    intestazione();
    for (const a of g.attestati) {
      serve(20);
      y -= 14;
      const stato = a.data_scadenza_calcolata ? statoScadenza(a.data_scadenza_calcolata) : "senza";
      const [testoStato, colore] =
        stato === "scaduto"
          ? ["Scaduto", ROSSO]
          : stato === "in-scadenza"
            ? ["In scadenza", ARANCIO]
            : stato === "senza"
              ? ["Senza scad.", GRIGIO]
              : ["Valido", VERDE];
      const esito = o.esitoPerAttestato.get(a.id) ?? "—";
      const nonOk = /manc|non conv|errore/i.test(esito);
      let x = M;
      const celle: [string, PDFFont, ReturnType<typeof rgb>][] = [
        [a.tipi_corso?.nome_corso ?? "Corso", c.n, NERO],
        [dataIt(a.data_corso), c.n, NERO],
        [dataIt(a.data_scadenza_calcolata), c.n, NERO],
        [testoStato, c.b, colore],
        [esito, nonOk ? c.b : c.n, nonOk ? ROSSO : NERO],
      ];
      celle.forEach(([t, f, col], i) => {
        const largCol = COLONNE[i]?.l ?? 60;
        scrivi(p, tagliaAlla(f, t, 9, largCol - 6), x + 3, y, f, 9, col);
        x += largCol;
      });
      p.drawRectangle({ x: M, y: y - 4, width: largh, height: 0.4, color: rgb(0.8, 0.8, 0.8) });
    }
  }
  return doc.getPageCount() - prima;
}

/* ─────────────────────────── Pagina finale ─────────────────────────── */

export type VoceIndice = { nome: string; pagina: number };
export type Problema = { lavoratore: string; corso: string; motivo: string };

/** Dove è finita ogni riga dell'indice (pagina da 0 e altezza), per aggiungervi il link. */
export type RigaIndiceDisegnata = { voce: VoceIndice; paginaIndice: number; y: number };
export type EsitoPaginaFinale = { primaPagina: number; righe: RigaIndiceDisegnata[] };

export function disegnaPaginaFinale(
  doc: PDFDocument,
  c: Caratteri,
  indice: VoceIndice[],
  problemi: Problema[],
): EsitoPaginaFinale {
  const primaPagina = doc.getPageCount();
  const righe: RigaIndiceDisegnata[] = [];
  let p = doc.addPage([A4V.l, A4V.a]);
  let y = A4V.a - M;
  const nuova = (titolo: string) => {
    p = doc.addPage([A4V.l, A4V.a]);
    y = A4V.a - M;
    scrivi(p, titolo, M, y, c.b, 12, GRIGIO);
    y -= 26;
  };
  scrivi(p, "INDICE DEL BLOCCO", M, y, c.b, 20, VERDE);
  y -= 18;
  scrivi(p, "Clicca su un nome per aprire la scheda del lavoratore.", M, y, c.n, 9, GRIGIO);
  y -= 22;
  for (const v of indice) {
    if (y < M + 30) nuova("Indice del blocco (continua)");
    righe.push({ voce: v, paginaIndice: doc.getPageCount() - 1, y });
    scrivi(p, tagliaAlla(c.n, v.nome, 11, A4V.l - 2 * M - 70), M, y, c.n, 11);
    const s = String(v.pagina);
    scrivi(p, s, A4V.l - M - c.b.widthOfTextAtSize(s, 11), y, c.b, 11);
    y -= 15;
  }
  y -= 24;
  if (y < M + 80) nuova("Controlli (continua)");
  scrivi(p, "CONTROLLI SUGLI ALLEGATI", M, y, c.b, 14, problemi.length ? ROSSO : VERDE);
  y -= 22;
  if (!problemi.length) {
    scrivi(p, "Tutti gli attestati hanno il file collegato e sono stati inseriti.", M, y, c.n, 11);
    return { primaPagina, righe };
  }
  for (const pr of problemi) {
    if (y < M + 30) nuova("Controlli sugli allegati (continua)");
    scrivi(p, tagliaAlla(c.b, pr.lavoratore, 10, 150), M, y, c.b, 10);
    scrivi(p, tagliaAlla(c.n, pr.corso, 10, 190), M + 155, y, c.n, 10);
    scrivi(p, tagliaAlla(c.n, pr.motivo, 10, A4V.l - 2 * M - 350), M + 350, y, c.n, 10, ROSSO);
    y -= 14;
  }
  return { primaPagina, righe };
}

/* ─────────────────────────── Piè di pagina ─────────────────────────── */

/** «Blocco N di M · Pagina X di Y» su ogni pagina (salta le pagine ruotate, per non scrivere di traverso). */
export function applicaPiedeDiPagina(
  doc: PDFDocument,
  f: PDFFont,
  numero: number,
  totale: number,
): void {
  const pagine = doc.getPages();
  pagine.forEach((p, i) => {
    if (p.getRotation().angle % 360 !== 0) return;
    const t = `Blocco ${numero} di ${totale}  ·  Pagina ${i + 1} di ${pagine.length}  ·  ${COPYRIGHT_STAMPE}`;
    const { width } = p.getSize();
    p.drawText(t, {
      x: (width - f.widthOfTextAtSize(t, 8)) / 2,
      y: 10,
      size: 8,
      font: f,
      color: GRIGIO,
    });
  });
}

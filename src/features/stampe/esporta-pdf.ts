/*
 * File:      esporta-pdf.ts
 * Percorso:  src/features/stampe/esporta-pdf.ts
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Genera direttamente un file PDF con testo reale (modificabile con un editor PDF), senza passare dalla
 *            stampante: stesso contenuto dell'anteprima (intestazione ditta, titolo, filtri, colonne visibili e larghezze scelte,
 *            sezioni con salto pagina, totale, legenda). Usa pdf-lib, già nel progetto, caricato solo al clic.
 */
import type { PDFFont, PDFPage } from "pdf-lib";
import type { Dipendente } from "@/lib/api";
import type { DittaRecord } from "@/lib/api/ditta";
import { dataIt, INTESTAZIONI, cella, raggruppa, type Colonna, type FiltriStampa, type OrdineColonna, type RigaStampa } from "./dati-stampa";
import { gruppiLavoratori, type RaggruppaPer } from "./stampa-gruppi";
import { scarica, nomeFileEsportazione } from "./esporta-file";
import type { LarghezzeColonne } from "./preferenze-colonne";

export type SezionePdf = {
  titolo?: string;
  righe: RigaStampa[];
  /** Inizia su una pagina nuova (reparti, funzioni, schede individuali). */
  nuovaPagina: boolean;
};

export type OpzioniPdf = {
  titolo: string;
  sottotitolo?: string;
  ditta: DittaRecord | undefined;
  orizzontale: boolean;
  colonne: Colonna[];
  /** Larghezze scelte dall'utente (pixel): servono come pesi relativi tra le colonne. */
  larghezze?: LarghezzeColonne;
  sezioni: SezionePdf[];
  totale?: string;
  legenda?: string[];
  dataStampa?: Date;
};

/* ------------------------------------------------------------------------------------------------
 * Sezioni: stessa logica dell'anteprima (ContenutoStampa), senza interfaccia
 * ---------------------------------------------------------------------------------------------- */

/** Divide le righe nelle sezioni del documento scelto; le righe arrivano già ordinate come in anteprima. */
export function sezioniPerPdf(
  filtri: Pick<FiltriStampa, "modello">,
  righe: RigaStampa[],
  ordine: OrdineColonna | null,
  dipendenti: Pick<Dipendente, "id" | "reparto" | "sottoreparto" | "luogo_nascita" | "data_nascita" | "data_assunzione" | "stato_lavoratore" | "data_cessazione">[] = [],
  raggruppaPer?: RaggruppaPer,
  soloGruppo?: string | null,
): SezionePdf[] {
  switch (filtri.modello) {
    case "registro":
      return [{ righe, nuovaPagina: false }];
    case "lavoratori":
      return raggruppaPer
        ? gruppiLavoratori(righe, raggruppaPer, soloGruppo).map((g, i) => ({ titolo: g.titolo, righe: g.righe, nuovaPagina: i > 0 }))
        : [{ righe, nuovaPagina: false }];
    case "scadenze":
      return [{ righe: ordine ? righe : [...righe].sort((a, b) => (a.scadenza ?? "").localeCompare(b.scadenza ?? "")), nuovaPagina: false }];
    case "gruppo":
      return raggruppa(righe, (r) => r.gruppoTitolo).map(([g, rr]) => ({
        titolo: `${g} – ${new Set(rr.map((r) => r.dipendenteId)).size} lavoratori`,
        righe: rr,
        nuovaPagina: false,
      }));
    case "reparto":
      return raggruppa([...righe].sort((a, b) => a.reparto.localeCompare(b.reparto, "it")), (r) => r.reparto).map(([rep, rr]) => ({
        titolo: `Reparto: ${rep}`,
        righe: rr,
        nuovaPagina: false,
      }));
    case "scheda":
      return raggruppa(righe, (r) => r.dipendenteId).map(([id, rr], i) => {
        const d = dipendenti.find((x) => x.id === id);
        const p = rr[0]!;
        const parti = [
          `${p.cognome} ${p.nome}`,
          `CF ${p.cf || "—"}`,
          `Reparto ${d?.reparto ?? "—"}${d?.sottoreparto ? ` – ${d.sottoreparto}` : ""}`,
          `Nato a ${d?.luogo_nascita ?? "—"} il ${dataIt(d?.data_nascita)}`,
          `Assunzione ${dataIt(d?.data_assunzione)}`,
          d?.stato_lavoratore === "cessato" ? `Cessato il ${dataIt(d.data_cessazione)}` : "In forza",
        ];
        return { titolo: parti.join(" · "), righe: rr, nuovaPagina: i > 0 };
      });
  }
}

const VOCI_CORSO: Colonna[] = ["corsoBase", "corsoSpecifico", "preposto", "antincendio", "primoSoccorso", "defibrillatore"];
const VOCI_RUOLO: Colonna[] = ["preposto", "antincendio", "primoSoccorso", "defibrillatore"];

/** Le stesse note sotto la tabella dell'anteprima, come testo semplice. */
export function righeLegenda(colonne: Colonna[]): string[] {
  const out: string[] = [];
  if (colonne.some((c) => VOCI_CORSO.includes(c))) {
    out.push("Legenda corsi: «Sì – data» = data dell'ultimo corso approvato; «Scaduto – data» = corso da rifare; «No» = nessun attestato in archivio.");
  }
  if (colonne.some((c) => VOCI_RUOLO.includes(c))) {
    out.push(
      "Preposto, Antincendio, Primo soccorso, Defibrillatore: «NA» = ruolo di sicurezza non assegnato; «No» = ruolo assegnato ma attestato mancante; in grassetto sull'anteprima = ha l'attestato ma non il ruolo assegnato.",
    );
  }
  if (colonne.includes("mancano")) out.push("Anagrafica: «MANCA» = dato assente nell'anagrafica del lavoratore.");
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Testo e larghezze
 * ---------------------------------------------------------------------------------------------- */

/** Caratteri fuori dal set dei font standard del PDF (WinAnsi) diventano «?», così non si rompe la generazione. */
const WINANSI_EXTRA = new Set("–—‘’“”•…€™†‡‰šŠžŽœŒŸƒˆ˜‹›‚„");
export function testoPdf(t: string): string {
  return [...t.normalize("NFC").replace(/\s+/g, " ").trim()]
    .map((ch) => (ch.charCodeAt(0) <= 0xff || WINANSI_EXTRA.has(ch) ? ch : "?"))
    .join("");
}

/** Spezza il testo in righe che stanno nella larghezza data (va a capo sugli spazi, e dentro le parole troppo lunghe). */
export function spezzaTesto(testo: string, larghezza: number, misura: (s: string) => number): string[] {
  const pulito = testoPdf(testo);
  if (!pulito) return [""];
  const righe: string[] = [];
  let corrente = "";
  const aggiungi = (parola: string) => {
    const prova = corrente ? `${corrente} ${parola}` : parola;
    if (misura(prova) <= larghezza) {
      corrente = prova;
      return;
    }
    if (corrente) righe.push(corrente);
    corrente = "";
    if (misura(parola) <= larghezza) {
      corrente = parola;
      return;
    }
    let pezzo = "";
    for (const ch of parola) {
      if (misura(pezzo + ch) > larghezza && pezzo) {
        righe.push(pezzo);
        pezzo = "";
      }
      pezzo += ch;
    }
    corrente = pezzo;
  };
  for (const parola of pulito.split(" ")) aggiungi(parola);
  if (corrente) righe.push(corrente);
  return righe;
}

/** Peso di ogni colonna: la larghezza scelta in anteprima, altrimenti una stima dal contenuto più lungo (con tetto). */
export function pesiColonne(colonne: Colonna[], sezioni: SezionePdf[], larghezze: LarghezzeColonne = {}): number[] {
  const righe = sezioni.flatMap((s) => s.righe);
  return colonne.map((c) => {
    const scelta = larghezze[c];
    if (scelta) return scelta;
    const piuLungo = Math.max(INTESTAZIONI[c].length, ...righe.slice(0, 400).map((r) => Math.min(cella(r, c).length, 60)));
    return Math.min(Math.max(piuLungo * 6 + 16, 44), 280);
  });
}

/* ------------------------------------------------------------------------------------------------
 * Creazione del PDF
 * ---------------------------------------------------------------------------------------------- */

const A4 = { corto: 595.28, lungo: 841.89 };
const MARGINE = 34;
const CORPO = 8;
const INTERLINEA = 10;
const PAD = 3;

export async function creaPdf(o: OpzioniPdf): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const normale = await doc.embedFont(StandardFonts.Helvetica);
  const grassetto = await doc.embedFont(StandardFonts.HelveticaBold);
  const stampato = o.dataStampa ?? new Date();

  doc.setTitle(testoPdf(o.titolo));
  doc.setAuthor(testoPdf(o.ditta?.ragione_sociale || "Nichetti Gian Battista"));
  doc.setSubject("Formazione D.Lgs. 81/2008");
  doc.setCreationDate(stampato);

  const larghPagina = o.orizzontale ? A4.lungo : A4.corto;
  const altPagina = o.orizzontale ? A4.corto : A4.lungo;
  const utile = larghPagina - 2 * MARGINE;
  const fondoPagina = MARGINE + 14; // spazio per «Pagina X di Y»

  const pesi = pesiColonne(o.colonne, o.sezioni, o.larghezze);
  const somma = pesi.reduce((a, b) => a + b, 0) || 1;
  const largColonne = pesi.map((p) => (p / somma) * utile);

  const misura = (f: PDFFont, dim: number) => (s: string) => f.widthOfTextAtSize(s, dim);
  const grigio = rgb(0.9, 0.9, 0.9);
  const linea = rgb(0.75, 0.75, 0.75);
  const nero = rgb(0, 0, 0);

  let pagina: PDFPage;
  let y = 0;
  const pagine: PDFPage[] = [];

  const nuovaPagina = (primaIntestazione: boolean) => {
    pagina = doc.addPage([larghPagina, altPagina]);
    pagine.push(pagina);
    y = altPagina - MARGINE;
    if (primaIntestazione) intestazione();
    else {
      pagina.drawText(testoPdf(o.titolo), { x: MARGINE, y: y - 9, size: 9, font: grassetto, color: nero });
      y -= 18;
    }
  };

  const intestazione = () => {
    const d = o.ditta;
    const ind = [d?.indirizzo, [d?.cap, d?.comune].filter(Boolean).join(" "), d?.provincia && `(${d.provincia})`].filter(Boolean).join(" ");
    pagina.drawText(testoPdf(d?.ragione_sociale || "Nichetti Gian Battista"), { x: MARGINE, y: y - 11, size: 11, font: grassetto, color: nero });
    pagina.drawText(testoPdf(ind || "Soresina (CR)"), { x: MARGINE, y: y - 22, size: 8, font: normale, color: nero });
    let sotto = y - 22;
    if (d?.partita_iva) {
      sotto -= 10;
      pagina.drawText(testoPdf(`P.IVA ${d.partita_iva}`), { x: MARGINE, y: sotto, size: 8, font: normale, color: nero });
    }
    const destra = [
      "Formazione D.Lgs. 81/2008 – Accordo Stato-Regioni",
      `Stampato il ${stampato.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}`,
    ];
    destra.forEach((t, i) => {
      const w = normale.widthOfTextAtSize(testoPdf(t), 8);
      pagina.drawText(testoPdf(t), { x: larghPagina - MARGINE - w, y: y - 11 - i * 10, size: 8, font: normale, color: nero });
    });
    y = sotto - 10;
    pagina.drawText(testoPdf(o.titolo).toUpperCase(), { x: MARGINE, y: y - 12, size: 13, font: grassetto, color: nero });
    y -= 17;
    if (o.sottotitolo) {
      for (const r of spezzaTesto(o.sottotitolo, utile, misura(normale, 8))) {
        pagina.drawText(r, { x: MARGINE, y: y - 9, size: 8, font: normale, color: nero });
        y -= 10;
      }
    }
    pagina.drawLine({ start: { x: MARGINE, y: y - 3 }, end: { x: larghPagina - MARGINE, y: y - 3 }, thickness: 1.2, color: nero });
    y -= 12;
  };

  const rigaIntestazioneTabella = () => {
    const alt = INTERLINEA + 2 * PAD;
    pagina.drawRectangle({ x: MARGINE, y: y - alt, width: utile, height: alt, color: grigio });
    let x = MARGINE;
    o.colonne.forEach((c, i) => {
      const w = largColonne[i]!;
      const righe = spezzaTesto(INTESTAZIONI[c], w - 2 * PAD, misura(grassetto, CORPO));
      pagina.drawText(righe[0] ?? "", { x: x + PAD, y: y - PAD - CORPO + 1, size: CORPO, font: grassetto, color: nero });
      x += w;
    });
    y -= alt;
  };

  const altezzaRiga = (celle: string[][]) => Math.max(...celle.map((r) => r.length), 1) * INTERLINEA + 2 * PAD;

  const disegnaSezione = (s: SezionePdf, prima: boolean) => {
    const altTitolo = s.titolo ? 16 : 0;
    const altHead = INTERLINEA + 2 * PAD;
    const celleDi = (r: RigaStampa) => o.colonne.map((c, i) => spezzaTesto(cella(r, c), largColonne[i]! - 2 * PAD, misura(normale, CORPO)));
    const primaRiga = s.righe[0] ? altezzaRiga(celleDi(s.righe[0])) : 0;

    if (prima || s.nuovaPagina || y - altTitolo - altHead - primaRiga < fondoPagina) nuovaPagina(prima && pagine.length === 0);
    if (s.titolo) {
      for (const r of spezzaTesto(s.titolo, utile, misura(grassetto, 10)).slice(0, 2)) {
        pagina.drawText(r, { x: MARGINE, y: y - 10, size: 10, font: grassetto, color: nero });
        y -= 12;
      }
      pagina.drawLine({ start: { x: MARGINE, y: y - 1 }, end: { x: larghPagina - MARGINE, y: y - 1 }, thickness: 0.6, color: linea });
      y -= 4;
    }
    rigaIntestazioneTabella();
    for (const r of s.righe) {
      const celle = celleDi(r);
      const alt = altezzaRiga(celle);
      if (y - alt < fondoPagina) {
        nuovaPagina(false);
        rigaIntestazioneTabella();
      }
      let x = MARGINE;
      celle.forEach((righe, i) => {
        righe.forEach((t, k) => {
          pagina.drawText(t, { x: x + PAD, y: y - PAD - CORPO + 1 - k * INTERLINEA, size: CORPO, font: normale, color: nero });
        });
        x += largColonne[i]!;
      });
      y -= alt;
      pagina.drawLine({ start: { x: MARGINE, y }, end: { x: larghPagina - MARGINE, y }, thickness: 0.4, color: linea });
    }
    y -= 10;
  };

  o.sezioni.forEach((s, i) => disegnaSezione(s, i === 0));
  if (!pagine.length) nuovaPagina(true);

  const coda = [o.totale && `Totale: ${o.totale}`, ...(o.legenda ?? [])].filter(Boolean) as string[];
  for (const [i, t] of coda.entries()) {
    const righe = spezzaTesto(t, utile, misura(i === 0 && o.totale ? grassetto : normale, i === 0 && o.totale ? 9 : 7.5));
    if (y - righe.length * 10 < fondoPagina) nuovaPagina(false);
    for (const r of righe) {
      pagina!.drawText(r, { x: MARGINE, y: y - 8, size: i === 0 && o.totale ? 9 : 7.5, font: i === 0 && o.totale ? grassetto : normale, color: nero });
      y -= 10;
    }
  }

  pagine.forEach((p, i) => {
    const t = `Pagina ${i + 1} di ${pagine.length}`;
    const w = normale.widthOfTextAtSize(t, 8);
    p.drawText(t, { x: larghPagina - MARGINE - w, y: MARGINE - 2, size: 8, font: normale, color: nero });
  });

  return doc.save();
}

/** Crea il PDF e lo scarica come file (nessuna finestra di stampa). */
export async function scaricaPdf(nomeBase: string, opzioni: OpzioniPdf) {
  const byte = await creaPdf(opzioni);
  scarica(new Blob([byte as BlobPart], { type: "application/pdf" }), nomeFileEsportazione(nomeBase, "pdf"));
}


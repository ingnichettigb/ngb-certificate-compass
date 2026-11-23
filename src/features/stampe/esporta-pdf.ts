/*
 * File:      esporta-pdf.ts
 * Percorso:  src/features/stampe/esporta-pdf.ts
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Genera direttamente un file PDF con testo reale (modificabile con un editor PDF), senza passare dalla
 *            stampante: stesso contenuto dell'anteprima (intestazione ditta, titolo, filtri, colonne visibili e larghezze scelte,
 *            sezioni con salto pagina, totale, legenda). Usa pdf-lib, già nel progetto, caricato solo al clic.
 *   rev 2 — 09/11/2026 20:00 — Colori e grassetto come in anteprima (righeCella: rosso, arancione, grassetto), righe alternate grigie,
 *            celle su due righe (data + avviso) e legenda dell'Organigramma.
 *   rev 3 — 09/11/2026 21:55 — Legenda coerente con i colori: «in grassetto» (non più «sull'anteprima») e riga «Stato» con rosso/arancione.
 *   rev 4 — 12/11/2026 06:53 — Logo dall'anagrafica e copyright su ogni pagina PDF.
 *   rev 5 — 22/11/2026 — Nota sullo Stato: «In scadenza» in arancione con la data, ancora valido, entro 9 mesi (GIORNI_PREAVVISO_STAMPE).
 *   rev 6 — 23/11/2026 14:15 — Per righe secondarie dello stesso lavoratore, numero con trattino e dati anagrafici con «—» discreto.
 *   rev 7 — 23/11/2026 14:55 — Ripristinata l'esportazione righeLegenda (note sotto la tabella, come in anteprima), rimossa per errore.
 *   rev 8 — 23/11/2026 15:35 — Doppia riga sottile di separazione tra lavoratori diversi; legenda aggiornata con «Scaduto da aggiornare» e «Da rifare corso base».
 */
import type { PDFFont, PDFPage } from "pdf-lib";
import type { Dipendente } from "@/lib/api";
import type { DittaRecord } from "@/lib/api/ditta";
import { COPYRIGHT_STAMPE, byteLogoDitta, nomeDitta } from "@/lib/identita-ditta";
import { dataIt, INTESTAZIONI, cella, raggruppa, righeCella, LEGENDA_SQUADRE, type Colonna, type FiltriStampa, type OrdineColonna, type RigaStampa } from "./dati-stampa";
import { GIORNI_PREAVVISO_STAMPE } from "./stampa-formati";
import { gruppiLavoratori, sezioniPerReparto, type RaggruppaPer } from "./stampa-gruppi";
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

const COLONNE_ANAGRAFICHE_PDF: ReadonlySet<Colonna> = new Set([
  "lavoratore", "cf", "reparto", "mansione", "nascita", "luogoNascita", "dataNascita", "assunzione",
]);

const VOCI_CORSO: Colonna[] = ["corsoBase", "corsoSpecifico", "preposto", "antincendio", "primoSoccorso", "defibrillatore"];
const VOCI_RUOLO: Colonna[] = ["preposto", "antincendio", "primoSoccorso", "defibrillatore"];

/** Le stesse note sotto la tabella dell'anteprima, come testo semplice. */
export function righeLegenda(colonne: Colonna[]): string[] {
  const out: string[] = [];
  if (colonne.some((c) => VOCI_CORSO.includes(c))) {
    out.push("Legenda corsi: «Sì – data» = data dell'ultimo corso approvato; «Scaduto – data» = corso da rifare; «No» = nessun attestato in archivio.");
  }
  if (colonne.some((c) => VOCI_RUOLO.includes(c))) {
    out.push("In grassetto: attestato approvato presente ma ruolo non assegnato al lavoratore.");
  }
  if (colonne.includes("corsoBaseSquadra") || colonne.includes("aggiornamentoSquadra")) {
    out.push(LEGENDA_SQUADRE);
  }
  if (colonne.includes("stato")) {
    out.push(
      `Stato: «Scaduto da aggiornare» e «Da rifare corso base» in rosso; «MANCA» in rosso se privo di attestato; «In scadenza» in arancione (scade entro ${GIORNI_PREAVVISO_STAMPE} giorni).`,
    );
  }
  return out;
}

/** Prepara le sezioni con le righe e il salto pagina appropriato per il modello. */
export function sezioniPerPdf(
  filtri: Pick<FiltriStampa, "modello">,
  righe: RigaStampa[],
  raggruppaPer: RaggruppaPer | null,
  dipendenti: Dipendente[],
  ordine: OrdineColonna | null | undefined,
): SezionePdf[] {
  if (filtri.modello === "reparto" || raggruppaPer === "reparto") {
    return sezioniPerReparto(righe, ordine).map((s) => ({ titolo: s.titolo, righe: s.righe, nuovaPagina: true }));
  }
  if (filtri.modello === "gruppo" || raggruppaPer === "gruppo") {
    return raggruppa(righe, (r) => r.gruppoTitolo || "Altri corsi").map(([titolo, righeGruppo]) => ({
      titolo,
      righe: righeGruppo,
      nuovaPagina: true,
    }));
  }
  if (filtri.modello === "scheda") {
    return raggruppa(righe, (r) => `${r.cognome} ${r.nome} · ${r.cf}`).map(([titolo, righeLavoratore]) => ({
      titolo,
      righe: righeLavoratore,
      nuovaPagina: true,
    }));
  }
  if (raggruppaPer === "funzione") {
    return gruppiLavoratori(righe, dipendenti, "funzione").map((g) => ({
      titolo: g.titolo,
      righe: g.righe,
      nuovaPagina: true,
    }));
  }
  return [{ righe, nuovaPagina: false }];
}

/** Divide il testo in righe in modo che nessuna superi la larghezza indicata. */
function spezzaTesto(testo: string, maxLargh: number, largh: (s: string) => number): string[] {
  if (!testo) return [""];
  const parole = testo.split(/\s+/);
  const out: string[] = [];
  let corrente = "";
  for (const p of parole) {
    const prova = corrente ? `${corrente} ${p}` : p;
    if (largh(prova) <= maxLargh) {
      corrente = prova;
    } else {
      if (corrente) out.push(corrente);
      if (largh(p) > maxLargh) {
        let frammento = "";
        for (const ch of p) {
          if (largh(frammento + ch) <= maxLargh) frammento += ch;
          else {
            if (frammento) out.push(frammento);
            frammento = ch;
          }
        }
        corrente = frammento;
      } else {
        corrente = p;
      }
    }
  }
  if (corrente) out.push(corrente);
  return out.length ? out : [""];
}

export async function creaPdf(o: OpzioniPdf): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const normale = await doc.embedFont(StandardFonts.Helvetica);
  const grassetto = await doc.embedFont(StandardFonts.HelveticaBold);

  let logoImg: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  const rawLogo = byteLogoDitta(o.ditta);
  if (rawLogo) {
    try {
      logoImg = await doc.embedPng(rawLogo);
    } catch {
      logoImg = null;
    }
  }

  const [A4_CORTO, A4_LUNGO] = [595.28, 841.89];
  const [larghPagina, altPagina] = o.orizzontale ? [A4_LUNGO, A4_CORTO] : [A4_CORTO, A4_LUNGO];
  const MARGINE = 28;
  const utile = larghPagina - 2 * MARGINE;
  const PAD = 3;
  const CORPO = 7;
  const INTERLINEA = 8.5;

  const nero = rgb(0.1, 0.1, 0.1);
  const grigio = rgb(0.4, 0.4, 0.4);
  const grigioChiaro = rgb(0.65, 0.65, 0.65);
  const linea = rgb(0.75, 0.75, 0.75);
  const zebra = rgb(0.96, 0.96, 0.97);
  const rosso = rgb(0.82, 0.13, 0.13);
  const arancione = rgb(0.85, 0.42, 0.05);

  const misura = (f: PDFFont, dim: number) => (t: string) => f.widthOfTextAtSize(t, dim);
  const fondoPagina = MARGINE + 22;

  const larghNum = 20;
  const pesi = o.colonne.map((c) => o.larghezze?.[c] ?? 80);
  const sommaPesi = pesi.reduce((s, p) => s + p, 0) || 1;
  const spazioDati = utile - larghNum;
  const largColonne = pesi.map((p) => Math.max(24, Math.floor((p / sommaPesi) * spazioDati)));
  const diff = spazioDati - largColonne.reduce((s, x) => s + x, 0);
  if (largColonne.length) largColonne[largColonne.length - 1]! += diff;

  const intestazioni = o.colonne.map((c, i) =>
    spezzaTesto(INTESTAZIONI[c] ?? c, largColonne[i]! - 2 * PAD, misura(grassetto, CORPO)),
  );
  const maxRigheHead = Math.max(1, ...intestazioni.map((h) => h.length));
  const altHeadEffettiva = maxRigheHead * INTERLINEA + 2 * PAD;

  const pagine: PDFPage[] = [];
  let pagina: PDFPage = null as unknown as PDFPage;
  let y = 0;

  const nuovaPagina = (conIntestazioneDitta: boolean) => {
    pagina = doc.addPage([larghPagina, altPagina]);
    pagine.push(pagina);
    y = altPagina - MARGINE;

    if (conIntestazioneDitta) {
      let xTesto = MARGINE;
      if (logoImg) {
        const altMax = 32;
        const larghMax = 90;
        const scala = Math.min(larghMax / logoImg.width, altMax / logoImg.height, 1);
        const w = logoImg.width * scala;
        const h = logoImg.height * scala;
        pagina.drawImage(logoImg, { x: MARGINE, y: y - h, width: w, height: h });
        xTesto = MARGINE + w + 10;
      }
      const ditta = nomeDitta(o.ditta);
      pagina.drawText(ditta, { x: xTesto, y: y - 10, size: 10, font: grassetto, color: nero });
      const cf = o.ditta?.codice_fiscale ? `CF ${o.ditta.codice_fiscale}` : "";
      const piva = o.ditta?.partita_iva ? `P.IVA ${o.ditta.partita_iva}` : "";
      const fiscale = [cf, piva].filter(Boolean).join(" · ");
      if (fiscale) pagina.drawText(fiscale, { x: xTesto, y: y - 20, size: 7.5, font: normale, color: grigio });

      const dataStr = dataIt((o.dataStampa ?? new Date()).toISOString());
      const larghData = misura(normale, 8)(dataStr);
      pagina.drawText(dataStr, { x: larghPagina - MARGINE - larghData, y: y - 10, size: 8, font: normale, color: grigio });

      y -= 38;
      pagina.drawLine({ start: { x: MARGINE, y }, end: { x: larghPagina - MARGINE, y }, thickness: 0.6, color: linea });
      y -= 10;
    }

    pagina.drawText(o.titolo, { x: MARGINE, y: y - 12, size: 12, font: grassetto, color: nero });
    y -= 15;
    if (o.sottotitolo) {
      pagina.drawText(o.sottotitolo, { x: MARGINE, y: y - 8, size: 8, font: normale, color: grigio });
      y -= 12;
    }
    y -= 4;
  };

  const rigaIntestazioneTabella = () => {
    pagina.drawRectangle({ x: MARGINE, y: y - altHeadEffettiva, width: utile, height: altHeadEffettiva, color: zebra });
    pagina.drawLine({ start: { x: MARGINE, y }, end: { x: larghPagina - MARGINE, y }, thickness: 0.6, color: linea });
    pagina.drawText("N.", { x: MARGINE + PAD, y: y - PAD - CORPO + 1, size: CORPO, font: grassetto, color: nero });
    let x = MARGINE + larghNum;
    intestazioni.forEach((righe, i) => {
      righe.forEach((r, k) => {
        pagina.drawText(r, { x: x + PAD, y: y - PAD - CORPO + 1 - k * INTERLINEA, size: CORPO, font: grassetto, color: nero });
      });
      x += largColonne[i]!;
    });
    y -= altHeadEffettiva;
    pagina.drawLine({ start: { x: MARGINE, y }, end: { x: larghPagina - MARGINE, y }, thickness: 0.6, color: linea });
  };

  const altezzaRiga = (celle: { t: string; font: PDFFont; colore: ReturnType<typeof rgb> }[][]) => {
    const maxRighe = Math.max(1, ...celle.map((c) => c.length));
    return maxRighe * INTERLINEA + 2 * PAD;
  };

  const disegnaSezione = (s: SezionePdf, prima: boolean) => {
    const altTitolo = s.titolo ? 16 : 0;
    const altHead = INTERLINEA + 2 * PAD;

    const celleDi = (r: RigaStampa, stessoLavoratore: boolean) =>
      o.colonne.map((c, i) => {
        if (stessoLavoratore && COLONNE_ANAGRAFICHE_PDF.has(c)) {
          return [{ t: "—", font: normale, colore: grigioChiaro }];
        }
        return righeCella(r, c).flatMap((v) =>
          spezzaTesto(v.testo, largColonne[i]! - 2 * PAD, misura(v.grassetto ? grassetto : normale, CORPO)).map((t) => ({
            t,
            font: v.grassetto ? grassetto : normale,
            colore: v.colore === "rosso" ? rosso : v.colore === "arancione" ? arancione : nero,
          })),
        );
      });

    const primaRiga = s.righe[0] ? altezzaRiga(celleDi(s.righe[0], false)) : 0;

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

    let prog = 0;
    for (const [n, r] of s.righe.entries()) {
      const stessoLavoratore = n > 0 && s.righe[n - 1]?.dipendenteId === r.dipendenteId;
      const ultimoDelLavoratore = n === s.righe.length - 1 || s.righe[n + 1]?.dipendenteId !== r.dipendenteId;
      if (!stessoLavoratore) prog += 1;
      const numTesto = stessoLavoratore ? "—" : String(prog);

      const celle = celleDi(r, stessoLavoratore);
      const alt = altezzaRiga(celle);
      if (y - alt < fondoPagina) {
        nuovaPagina(false);
        rigaIntestazioneTabella();
      }
      if (prog % 2 === 0) pagina.drawRectangle({ x: MARGINE, y: y - alt, width: utile, height: alt, color: zebra });

      pagina.drawText(numTesto, {
        x: MARGINE + PAD,
        y: y - PAD - CORPO + 1,
        size: CORPO,
        font: normale,
        color: stessoLavoratore ? grigioChiaro : nero,
      });

      let x = MARGINE + larghNum;
      celle.forEach((righe, i) => {
        righe.forEach((v, k) => {
          pagina.drawText(v.t, { x: x + PAD, y: y - PAD - CORPO + 1 - k * INTERLINEA, size: CORPO, font: v.font, color: v.colore });
        });
        x += largColonne[i]!;
      });
      y -= alt;

      if (ultimoDelLavoratore) {
        // Doppia riga sottile tra lavoratori distinti
        pagina.drawLine({ start: { x: MARGINE, y }, end: { x: larghPagina - MARGINE, y }, thickness: 0.4, color: linea });
        pagina.drawLine({ start: { x: MARGINE, y: y - 1.5 }, end: { x: larghPagina - MARGINE, y: y - 1.5 }, thickness: 0.4, color: linea });
        y -= 1.5;
      } else {
        // Riga singola sottile discreta tra i corsi dello stesso lavoratore
        pagina.drawLine({ start: { x: MARGINE, y }, end: { x: larghPagina - MARGINE, y }, thickness: 0.25, color: grigioChiaro });
      }
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

  pagine.forEach((p, idx) => {
    p.drawLine({ start: { x: MARGINE, y: MARGINE + 8 }, end: { x: larghPagina - MARGINE, y: MARGINE + 8 }, thickness: 0.4, color: linea });
    p.drawText(COPYRIGHT_STAMPE, { x: MARGINE, y: MARGINE - 2, size: 8, font: normale, color: nero });
    const t = `Pagina ${idx + 1} di ${pagine.length}`;
    const w = misura(normale, 8)(t);
    p.drawText(t, { x: larghPagina - MARGINE - w, y: MARGINE - 2, size: 8, font: normale, color: nero });
  });

  return doc.save();
}

export async function scaricaPdf(o: OpzioniPdf, nomeBase: string): Promise<void> {
  const bytes = await creaPdf(o);
  scarica(new Blob([bytes as BlobPart], { type: "application/pdf" }), nomeFileEsportazione(nomeBase, "pdf"));
}

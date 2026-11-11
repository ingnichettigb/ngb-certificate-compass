/*
 * File:      allegati.ts
 * Percorso:  src/features/stampe/globale/allegati.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Lettura dei file degli attestati (archivio Supabase o cartelle locali) e loro inserimento in un PDF:
 *            i PDF si copiano pagina per pagina; JPG e PNG diventano una pagina A4 (orientata come l'immagine, con margine);
 *            WebP e GIF passano da un canvas del browser. Word e altri formati NON si convertono qui: restano segnalati
 *            nella pagina finale di controllo (la conversione fedele di un DOCX richiede LibreOffice sul server).
 */
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { risolviDocumentoAttestato } from "@/lib/api/cartelle-risoluzione";

export type FormatoFile = "pdf" | "jpg" | "png" | "webp" | "gif" | "zip" | "sconosciuto";

export type EsitoAllegato =
  | { tipo: "pdf"; bytes: Uint8Array }
  | { tipo: "immagine"; bytes: Uint8Array; formato: "jpg" | "png" }
  | { tipo: "mancante" }
  | { tipo: "non-convertibile"; motivo: string };

/** Riconosce il formato dai primi byte (l'estensione del nome non è affidabile). */
export function riconosciFormato(b: Uint8Array): FormatoFile {
  const testa = (n: number) => String.fromCharCode(...b.slice(0, n));
  if (testa(1024).includes("%PDF")) return "pdf";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 4 && b[0] === 0x89 && testa(4).slice(1) === "PNG") return "png";
  if (testa(4) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "webp";
  if (testa(3) === "GIF") return "gif";
  if (testa(2) === "PK") return "zip"; // anche DOCX/XLSX
  return "sconosciuto";
}

const DIMENSIONE_PREDEFINITA = 500_000;

async function urlDelFile(percorso: string): Promise<string | null> {
  const r = await risolviDocumentoAttestato(percorso);
  if (r.url) return r.url;
  // Percorsi dell'archivio non riconosciuti dal risolutore (es. «Archivio Attestati Sicurezza/…»): si prova direttamente il bucket.
  try {
    const { data } = await supabase.storage
      .from("attestati")
      .createSignedUrl(percorso.trim(), 3600);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/** Dimensione in byte del file senza scaricarlo (intestazione HTTP); se non si riesce, un valore prudente. */
export async function dimensioneAllegato(percorso: string): Promise<number> {
  try {
    const url = await urlDelFile(percorso);
    if (!url) return 0;
    const r = await fetch(url, { method: "HEAD" });
    const n = Number(r.headers.get("content-length"));
    return Number.isFinite(n) && n > 0 ? n : DIMENSIONE_PREDEFINITA;
  } catch {
    return DIMENSIONE_PREDEFINITA;
  }
}

async function immagineInPng(bytes: Uint8Array): Promise<Uint8Array> {
  const bmp = await createImageBitmap(new Blob([bytes as BlobPart]));
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas non disponibile");
  ctx.drawImage(bmp, 0, 0);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) throw new Error("conversione immagine non riuscita");
  return new Uint8Array(await blob.arrayBuffer());
}

/** Scarica il file di un attestato e dice cosa è. Non lancia errori: li riporta nell'esito. */
export async function leggiAllegato(percorso: string | null | undefined): Promise<EsitoAllegato> {
  const p = (percorso ?? "").trim();
  if (!p) return { tipo: "mancante" };
  try {
    const url = await urlDelFile(p);
    if (!url) return { tipo: "mancante" };
    const risposta = await fetch(url);
    if (!risposta.ok) return { tipo: "mancante" };
    const bytes = new Uint8Array(await risposta.arrayBuffer());
    const formato = riconosciFormato(bytes);
    if (formato === "pdf") return { tipo: "pdf", bytes };
    if (formato === "jpg" || formato === "png") return { tipo: "immagine", bytes, formato };
    if (formato === "webp" || formato === "gif") {
      try {
        return { tipo: "immagine", bytes: await immagineInPng(bytes), formato: "png" };
      } catch {
        return {
          tipo: "non-convertibile",
          motivo: `immagine ${formato.toUpperCase()} non convertibile`,
        };
      }
    }
    if (formato === "zip")
      return {
        tipo: "non-convertibile",
        motivo: "documento Word/Office: convertire in PDF e ricaricare",
      };
    return { tipo: "non-convertibile", motivo: "formato non riconosciuto" };
  } catch (e) {
    return { tipo: "non-convertibile", motivo: `lettura non riuscita (${(e as Error).message})` };
  }
}

const A4 = { corto: 595.28, lungo: 841.89 };
const MARGINE = 28;

/** Aggiunge il file al PDF; restituisce quante pagine ha aggiunto. Lancia un errore se il file è danneggiato. */
export async function appendiAllegato(doc: PDFDocument, esito: EsitoAllegato): Promise<number> {
  if (esito.tipo === "pdf") {
    const sorgente = await PDFDocument.load(esito.bytes, { ignoreEncryption: true });
    const pagine = await doc.copyPages(sorgente, sorgente.getPageIndices());
    pagine.forEach((p) => doc.addPage(p));
    return pagine.length;
  }
  if (esito.tipo === "immagine") {
    const img =
      esito.formato === "jpg" ? await doc.embedJpg(esito.bytes) : await doc.embedPng(esito.bytes);
    const orizzontale = img.width > img.height;
    const [lp, ap] = orizzontale ? [A4.lungo, A4.corto] : [A4.corto, A4.lungo];
    const scala = Math.min((lp - 2 * MARGINE) / img.width, (ap - 2 * MARGINE) / img.height, 1.5);
    const w = img.width * scala;
    const h = img.height * scala;
    const pagina = doc.addPage([lp, ap]);
    pagina.drawImage(img, { x: (lp - w) / 2, y: (ap - h) / 2, width: w, height: h });
    return 1;
  }
  return 0;
}

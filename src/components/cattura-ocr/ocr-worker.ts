/*
 * File:      ocr-worker.ts
 * Percorso:  src/components/cattura-ocr/ocr-worker.ts
 * OCR locale nel browser (Tesseract): worker condiviso, ritaglio del rettangolo e lettura del testo.
 */
import type { Rett } from "./types";

type Worker = import("tesseract.js").Worker;

let workerPromise: Promise<Worker> | null = null;
async function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then((T) => T.createWorker("ita+eng"));
  }
  return workerPromise;
}

/** Ritaglia dall'immagine il rettangolo scelto, ingrandito x2 per migliorare la lettura. */
export function ritagliaRettangolo(img: HTMLImageElement, r: Rett): HTMLCanvasElement {
  const kx = img.naturalWidth / img.clientWidth;
  const ky = img.naturalHeight / img.clientHeight;
  const canvas = document.createElement("canvas");
  const scala = 2;
  canvas.width = r.w * kx * scala;
  canvas.height = r.h * ky * scala;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, r.x * kx, r.y * ky, r.w * kx, r.h * ky, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Legge il testo del canvas e lo restituisce su una riga sola, senza spazi doppi. */
export async function leggiTesto(canvas: HTMLCanvasElement): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas);
  return String(data.text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

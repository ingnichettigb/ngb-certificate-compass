/*
 * File:      types.ts
 * Percorso:  src/components/cattura-ocr/types.ts
 * Tipi condivisi dal visualizzatore con mirino OCR.
 */

/** Rettangolo di selezione, in pixel dell'immagine visualizzata (prima dello zoom). */
export type Rett = { x: number; y: number; w: number; h: number };

/** Modalità attiva: "pan" sposta il documento, "ocr" disegna il mirino. */
export type ModalitaVista = "pan" | "ocr";

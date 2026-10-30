/*
 * File:      ocr-testo.ts
 * Percorso:  src/features/operatore/ocr-testo.ts
 * Pulizia del testo letto con l'OCR e conversione delle date.
 */
import type { CampoOcr } from "./types";

export const ETICHETTE_OCR: Record<CampoOcr, string> = {
  cognome: "Cognome",
  nome: "Nome",
  codice_fiscale: "Codice Fiscale",
  email: "Email lavoratore",
  codice_ateco: "Codice ATECO",
  data_corso: "Data emanazione",
  ore: "Ore corso",
  note: "Note",
  numero_attestato: "Numero attestato",
};

/**
 * Funzione di "Maquillage" e pulizia dell'OCR:
 * Toglie spazi e caratteri spuri ai bordi (es. barre |, tilde, apici, trattini).
 */
export function pulisciTestoOcr(testoGrezzo: string, campo?: CampoOcr): string {
  if (!testoGrezzo) return "";
  let pulito = testoGrezzo.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  // Rimuove caratteri di bordo tipici dei margini tabella o scansioni
  pulito = pulito.replace(/^[|_\-~*`'"°:;.\/\\—]+/g, "").replace(/[|_\-~*`'"°:;.\/\\—]+$/g, "").trim();

  if (campo === "codice_fiscale") {
    return pulito.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  if (campo === "cognome" || campo === "nome") {
    return pulito.toUpperCase().replace(/[^A-ZÀ-ÿ\s']/g, "").replace(/\s+/g, " ").trim();
  }
  if (campo === "email") {
    return pulito.toLowerCase().replace(/\s+/g, "");
  }
  if (campo === "numero_attestato") {
    return pulito.toUpperCase().replace(/\s+/g, "");
  }
  if (campo === "ore") {
    return pulito.replace(/[^0-9.,]/g, "");
  }
  if (campo === "data_corso") {
    return pulito.replace(/[^0-9/.\-]/g, "");
  }
  return pulito;
}

export function dataDaTesto(t: string): string {
  const m = t.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (!m) return "";
  let y = m[3]!;
  if (y.length === 2) y = "20" + y;
  return `${y}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

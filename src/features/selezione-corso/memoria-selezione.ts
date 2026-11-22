/*
 * File:           memoria-selezione.ts
 * Percorso:       src/features/selezione-corso/memoria-selezione.ts
 * Data creazione: 22/11/2026
 * Scopo:          ricorda in questo browser l'ultimo corso scelto e le ultime categorie scelte, per riproporli per primi.
 *                 È solo una comodità: se la memoria del browser non è disponibile (finestra privata, dati bloccati)
 *                 non succede nulla e l'elenco parte da «Tutte».
 * Revisioni:
 *   rev 1 — 22/11/2026 — Prima versione.
 */

const CHIAVE_ULTIMO_CORSO = "ngb.selezione-corso.ultimo";
const CHIAVE_CATEGORIE = "ngb.selezione-corso.categorie";

export function leggiUltimoCorso(): string | null {
  try {
    return window.localStorage.getItem(CHIAVE_ULTIMO_CORSO) || null;
  } catch {
    return null;
  }
}

export function salvaUltimoCorso(id: string): void {
  try {
    window.localStorage.setItem(CHIAVE_ULTIMO_CORSO, id);
  } catch {
    /* comodità: si ignora */
  }
}

export function leggiCategorie(): string[] {
  try {
    const grezzo = window.localStorage.getItem(CHIAVE_CATEGORIE);
    const valore: unknown = grezzo ? JSON.parse(grezzo) : [];
    return Array.isArray(valore) ? valore.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function salvaCategorie(chiavi: string[]): void {
  try {
    window.localStorage.setItem(CHIAVE_CATEGORIE, JSON.stringify(chiavi));
  } catch {
    /* comodità: si ignora */
  }
}

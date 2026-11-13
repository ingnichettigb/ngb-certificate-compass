/*
 * File:      titolo-nominato.ts
 * Percorso:  src/features/nomine/titolo-nominato.ts
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 — Titolo davanti al nome sulla lettera: «Prof.» / «Prof.ssa» per i docenti (sesso ricavato dal codice fiscale),
 *            nessun titolo per gli altri (come nelle lettere del Liceo per il personale ATA). Il titolo si può togliere dalla pagina.
 */
import { normalizzaOmocodia } from "@/features/dipendenti/codice-fiscale/controllo-cf";

/** «M» / «F» dal giorno di nascita del codice fiscale (le donne hanno il giorno aumentato di 40); null se il codice non è leggibile. */
export function sessoDaCodiceFiscale(cf: string | null | undefined): "M" | "F" | null {
  const c = normalizzaOmocodia((cf ?? "").trim().toUpperCase());
  if (!/^[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]$/.test(c)) return null;
  const giorno = Number(c.slice(9, 11));
  if (giorno >= 41 && giorno <= 71) return "F";
  if (giorno >= 1 && giorno <= 31) return "M";
  return null;
}

/** Titolo da anteporre al nome: solo per i docenti e solo se il sesso è noto. */
export function titoloNominato(d: { reparto?: string | null; codice_fiscale?: string | null }): string {
  if ((d.reparto ?? "").trim().toLowerCase() !== "docente") return "";
  const s = sessoDaCodiceFiscale(d.codice_fiscale);
  return s === "F" ? "Prof.ssa" : s === "M" ? "Prof." : "";
}

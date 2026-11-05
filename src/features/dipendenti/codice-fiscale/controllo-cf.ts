/*
 * File:      controllo-cf.ts
 * Percorso:  src/features/dipendenti/codice-fiscale/controllo-cf.ts
 * Data creazione: 05/11/2026
 * Controllo del codice fiscale (non bloccante): lunghezza, struttura, mese, giorno/sesso,
 * codice comune/Stato (Belfiore) e carattere di controllo. Gestisce l'omocodia.
 * Revisioni:
 *   - Rev 1 — 05/11/2026 17:50 — Prima stesura, regole ministeriali (riferimento foglio Filocamo).
 */
import { CODICI_BELFIORE } from "./codici-belfiore";

const DISPARI: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};
const MESI = "ABCDEHLMPRST";
/** Lettere che sostituiscono le cifre in caso di omocodia (0..9). */
const OMOCODIA = "LMNPQRSTUV";
const POS_NUMERICHE = [6, 7, 9, 10, 12, 13, 14];

function valorePari(c: string): number {
  return /[0-9]/.test(c) ? Number(c) : c.charCodeAt(0) - 65;
}

export function calcolaCarattereControllo(primi15: string): string {
  const s = primi15.toUpperCase();
  let somma = 0;
  for (let i = 0; i < 15; i++) somma += i % 2 === 0 ? (DISPARI[s[i]] ?? 0) : valorePari(s[i]);
  return String.fromCharCode(65 + (somma % 26));
}

/** Riporta a cifre le posizioni sostituite per omocodia. */
export function normalizzaOmocodia(cf: string): string {
  const a = cf.split("");
  for (const p of POS_NUMERICHE) {
    const k = OMOCODIA.indexOf(a[p]);
    if (k >= 0) a[p] = String(k);
  }
  return a.join("");
}

export type EsitoCF = { valido: boolean; problemi: string[] };

export function analizzaCodiceFiscale(input: string): EsitoCF {
  const cf = input.trim().toUpperCase();
  const problemi: string[] = [];
  if (!cf) return { valido: true, problemi };
  if (cf.length !== 16) problemi.push(`Lunghezza ${cf.length}: attesi 16 caratteri`);
  if (!/^[A-Z0-9]*$/.test(cf)) problemi.push("Solo lettere e numeri ammessi");
  if (problemi.length) return { valido: false, problemi };

  if (!/^[A-Z]{6}$/.test(cf.slice(0, 6))) problemi.push("I primi 6 caratteri devono essere lettere");
  const n = normalizzaOmocodia(cf);
  if (!/^\d{2}$/.test(n.slice(6, 8))) problemi.push("Anno di nascita non valido");
  if (!MESI.includes(cf[8])) problemi.push("Mese non valido (lettere ammesse: A-E, H, L, M, P, R-T)");
  const g = Number(n.slice(9, 11));
  if (!/^\d{2}$/.test(n.slice(9, 11)) || !((g >= 1 && g <= 31) || (g >= 41 && g <= 71)))
    problemi.push("Giorno/sesso non valido (01-31 maschi, 41-71 femmine)");
  const luogo = n[11] + n.slice(12, 15);
  if (!/^[A-Z]\d{3}$/.test(luogo) || !CODICI_BELFIORE.has(luogo))
    problemi.push(`Codice comune/Stato "${luogo}" non riconosciuto`);
  const atteso = calcolaCarattereControllo(cf.slice(0, 15));
  if (atteso !== cf[15]) problemi.push(`Carattere di controllo errato: atteso "${atteso}", trovato "${cf[15]}"`);
  return { valido: problemi.length === 0, problemi };
}

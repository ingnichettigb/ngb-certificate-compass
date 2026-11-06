/*
 * File:      testo-maiuscolo.ts
 * Percorso:  src/lib/testo-maiuscolo.ts
 * Creato:    05/11/2026
 * Uniforma in MAIUSCOLO i testi anagrafici (cognome, nome, luogo di nascita) per evitare
 * il dubbio tra maiuscolo e minuscolo. L'email, le note e i valori di catalogo
 * (profilo ATA, classe di concorso) non passano da qui.
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 */

/** Maiuscolo «live» per i campi in digitazione: non toglie gli spazi mentre si scrive. */
export function inMaiuscolo(v: string | null | undefined): string {
  return (v ?? "").toLocaleUpperCase("it-IT");
}

/** Maiuscolo pulito per il salvataggio: spazi doppi e spazi in testa o in coda eliminati. */
export function maiuscolo(v: string | null | undefined): string {
  return (v ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLocaleUpperCase("it-IT");
}

/*
 * File:          messaggi-raccordo.ts
 * Percorso:      src/features/tabelle-raccordo/messaggi-raccordo.ts
 * Data creazione: 2026-11-21
 * Messaggi comprensibili per gli errori del database nelle tabelle di raccordo e controllo dei codici scritti a mano.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 3).
 *   - Rev 2 (2026-11-23): Convenzione unica dei codici: maiuscolo con il TRATTINO (ADD-DAE). Spazi e trattini bassi scritti a mano diventano trattini.
 */

/** Messaggio da mostrare per un errore di salvataggio: i casi dei vincoli del database in italiano semplice. */
export function messaggioErrore(e: unknown): string {
  const { code, message } = (e ?? {}) as { code?: string; message?: string };
  if (code === "23505") return "Esiste già un record uguale: stesso codice oppure stessa regola.";
  if (code === "23503")
    return "Il ruolo o il corso indicato non esiste, oppure il record è ancora usato da altre regole.";
  if (code === "23502") return "Manca un campo obbligatorio.";
  return message ?? "errore sconosciuto";
}

/**
 * Codice scritto a mano: maiuscolo, con il TRATTINO tra le parti (es. ADD-DAE, OPER-PLE-II-831). Spazi e trattini bassi diventano trattini
 * (una sola volta, mai ai bordi); sono ammesse solo lettere e numeri non accentati. Restituisce il codice pronto da salvare, oppure null.
 */
export function codiceValido(testo: string): string | null {
  const cod = testo
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(cod) ? cod : null;
}

/*
 * File:          messaggi-raccordo.ts
 * Percorso:      src/features/tabelle-raccordo/messaggi-raccordo.ts
 * Data creazione: 2026-11-21
 * Messaggi comprensibili per gli errori del database nelle tabelle di raccordo e controllo dei codici scritti a mano.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 3).
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
 * Codice scritto a mano: si porta in maiuscolo e si accetta solo con lettere, numeri e trattino basso (come ADD_DAE).
 * Restituisce il codice pronto da salvare, oppure null se non è valido.
 */
export function codiceValido(testo: string): string | null {
  const cod = testo.trim().toUpperCase();
  return /^[A-Z0-9_]+$/.test(cod) ? cod : null;
}

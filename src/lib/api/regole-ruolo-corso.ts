/*
 * File:          regole-ruolo-corso.ts
 * Percorso:      src/lib/api/regole-ruolo-corso.ts
 * Data creazione: 2026-11-21
 * Lettura della Tabella 02 (regole_ruolo_corso): l'UNICO punto di verità del legame ruolo -> corso (base e aggiornamento).
 * Il ruolo è indicato con il suo codice (ruolo_codice, chiave esterna di ruoli_sicurezza) e i corsi con il loro codice
 * (chiavi esterne di tipi_corso): nessun nome in mezzo.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 2).
 */
import { leggiTutto, sb } from "./client";

/** Chiave TanStack Query della Tabella 02: chi la modifica deve invalidare questa. */
export const CHIAVE_REGOLE_RUOLO_CORSO = ["regole-ruolo-corso"] as const;

export type RegolaRuoloCorso = {
  id: string;
  /** Codice del ruolo (ruoli_sicurezza.codice). */
  ruolo_codice: string;
  /** Etichetta: il database la tiene allineata al nome del ruolo. Non usarla per riconoscere il ruolo. */
  ruolo?: string | null;
  parametro: string;
  valore: string;
  /** Codice del corso base (tipi_corso.codice). */
  corso_base: string | null;
  /** Codice del corso di aggiornamento (tipi_corso.codice). */
  corso_aggiornamento: string | null;
  ordine: number;
  applica?: boolean;
};

/** Tutte le regole, nell'ordine della tabella. */
export async function getRegoleRuoloCorso(): Promise<RegolaRuoloCorso[]> {
  return leggiTutto<RegolaRuoloCorso>(() =>
    sb.from("regole_ruolo_corso").select("*").order("ordine").order("id"),
  );
}

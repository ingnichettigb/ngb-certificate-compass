/*
 * File:      matrice-costanti.ts
 * Percorso:  src/features/dipendenti/matrice/matrice-costanti.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: chiavi di memorizzazione, larghezze base e tipo di ordinamento.
 */
export type TipoOrdinamento = "asc" | "desc" | "none";

export const CHIAVE_LARGHEZZE = "matrice_sicurezza_larghezze_v2";
export const CHIAVE_NASCOSTI = "matrice_sicurezza_corsi_nascosti_v2";

export const LARGHEZZE_FISSE_BASE = {
  nominativo: 220,
  funzione: 240,
  ruolo: 160,
  corso: 120,
};

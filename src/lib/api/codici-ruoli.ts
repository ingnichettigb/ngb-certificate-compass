/*
 * File:          codici-ruoli.ts
 * Percorso:      src/lib/api/codici-ruoli.ts
 * Data creazione: 2026-11-21
 * Codici stabili dei ruoli di sicurezza (ruoli_sicurezza.codice) e ricerca di un ruolo per CODICE.
 * Il nome del ruolo è solo un'etichetta e si può cambiare: tutto ciò che collega un ruolo a un corso, a una
 * funzione dell'import o a un incarico deve passare da qui, mai dal nome.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 1).
 *   - Rev 2 (2026-11-23 10:40): Ruoli DL e DL-RSPP; regola DL-RSPP consentito fino a 15 lavoratori (dal 16° no).
 */
import type { RuoloSicurezza } from "./ruoli";

/** Codici dei ruoli ufficiali (devono coincidere con ruoli_sicurezza.codice nel database). */
export const CODICE_RUOLO = {
  LAVORATORE: "LAVORATORE",
  PREPOSTO: "PREPOSTO",
  ADD_ANTINCENDIO: "ADD-ANTINCENDIO",
  ADD_PRIMO_SOCCORSO: "ADD-PRIMO-SOCCORSO",
  ADD_DAE: "ADD-DAE",
  ADD_EVACUAZIONE: "ADD-EVACUAZIONE",
  RLS: "RLS",
  ASPP: "ASPP",
  RSPP: "RSPP",
  INC_PRIVACY: "INC-PRIVACY",
  DL: "DL",
  DL_RSPP: "DL-RSPP",
} as const;

export type CodiceRuolo = (typeof CODICE_RUOLO)[keyof typeof CODICE_RUOLO];

/** Codice in forma confrontabile: maiuscolo e senza spazi ai lati. */
export function normalizzaCodice(codice: string | null | undefined): string {
  return (codice ?? "").toUpperCase().trim();
}

/** Ruolo del catalogo con quel codice (per impostazione solo se attivo). */
export function trovaRuoloPerCodice(
  ruoli: RuoloSicurezza[],
  codice: string,
  soloAttivi = true,
): RuoloSicurezza | undefined {
  const cod = normalizzaCodice(codice);
  if (!cod) return undefined;
  return ruoli.find((r) => (!soloAttivi || r.attivo) && normalizzaCodice(r.codice) === cod);
}

/**
 * Codice del ruolo di un'attrezzatura a partire dal codice del corso (base o aggiornamento):
 * «LAV-PLE-II-831» e «LAV-PLE-II-831-AGG» -> «OPER-PLE-II-831». Null se il corso non è un'attrezzatura.
 * Regola di transizione: la fonte definitiva è la Tabella 02 (regole_ruolo_corso).
 */
export function codiceRuoloAttrezzatura(codiceCorso: string | null | undefined): string | null {
  const cod = normalizzaCodice(codiceCorso);
  if (!cod.startsWith("LAV-")) return null;
  return "OPER-" + cod.slice(4).replace(/-AGG$/, "");
}

/** DL-RSPP (art. 34 D.Lgs. 81/08): consentito fino a questo numero di lavoratori compreso; dal successivo non è attivabile. */
export const MAX_LAVORATORI_DL_RSPP = 15;

/** true se il datore di lavoro può svolgere direttamente i compiti del SPP con quel numero di lavoratori (null = non noto: consentito). */
export function dlRsppConsentito(lavoratori: number | null | undefined): boolean {
  return lavoratori === null || lavoratori === undefined || lavoratori <= MAX_LAVORATORI_DL_RSPP;
}

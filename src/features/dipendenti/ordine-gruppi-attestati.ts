/*
 * File:          ordine-gruppi-attestati.ts
 * Percorso:      src/features/dipendenti/ordine-gruppi-attestati.ts
 * Data creazione: 2026-11-20
 * Revisioni:
 *   - Rev 1 (2026-11-20): Ordine «per gruppo» della tabella «Tutti gli attestati» della scheda dipendente.
 *     Gruppi: Lavoratori, Preposto, Primo soccorso, Antincendio, Defibrillatore, Evacuazione, Privacy, Altro, Covid.
 *     Dentro ogni gruppo prima i corsi base, poi gli aggiornamenti, sempre in ordine di data (dal più vecchio).
 *   - Rev 2 (2026-11-20 16:25): valori mancanti passati come null (correzione errore di tipo).
 */
import { assegnaGruppoArgomento, type GruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import { eAggiornamento } from "@/features/stampe/stampa-squadre";
import type { TipoCorso } from "@/lib/api";

type CorsoLike = Pick<TipoCorso, "codice" | "nome_corso" | "macro_categoria" | "livello_specifico" | "codice_corso_aggiornamento">;

/** Ordine di visualizzazione dei gruppi (chiavi di GRUPPI_ARGOMENTO). */
const ORDINE_GRUPPI = [
  "sicurezza-lavoratori",
  "preposti",
  "primo-soccorso",
  "antincendio",
  "defibrillatore",
  "evacuazione",
  "privacy",
  "altro",
  "covid",
] as const;

export function indiceGruppo(gruppo: GruppoArgomento): number {
  const i = ORDINE_GRUPPI.indexOf(gruppo.chiave as (typeof ORDINE_GRUPPI)[number]);
  return i === -1 ? ORDINE_GRUPPI.indexOf("altro") : i;
}

/**
 * Un corso è un aggiornamento quando nella Tabella tipi di corso il suo «Codice aggiorn.» coincide con il suo
 * stesso codice. In subordine vale la regola già usata altrove (livello del corso o elenco dei codici noti).
 */
export function eCorsoAggiornamento(c: CorsoLike | null | undefined): boolean {
  if (!c) return false;
  const cod = (c.codice ?? "").trim().toUpperCase();
  const agg = (c.codice_corso_aggiornamento ?? "").trim().toUpperCase();
  if (cod && agg && cod === agg) return true;
  return eAggiornamento(c);
}

/** Posizione del corso dentro il gruppo: 0 generale, 1 specifico, 2 altri base, 3 aggiornamenti. */
function fase(c: CorsoLike | null | undefined): number {
  if (eCorsoAggiornamento(c)) return 3;
  const cod = (c?.codice ?? "").toUpperCase();
  if (cod.startsWith("SIC-GEN")) return 0;
  if (cod.startsWith("SIC-SPE")) return 1;
  return 2;
}

export function gruppoDelCorso(c: CorsoLike | null | undefined): GruppoArgomento {
  return assegnaGruppoArgomento({
    macro_categoria: c?.macro_categoria ?? null,
    codice: c?.codice ?? null,
    nome_corso: c?.nome_corso ?? null,
  });
}

/** Chiave di confronto: gruppo, poi fase (base prima, aggiornamenti dopo). */
export function chiaveOrdineGruppo(c: CorsoLike | null | undefined): number {
  return indiceGruppo(gruppoDelCorso(c)) * 10 + fase(c);
}

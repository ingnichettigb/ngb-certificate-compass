/*
 * File:          riferimenti.ts
 * Percorso:      src/features/tabelle-raccordo/riferimenti.ts
 * Data creazione: 2026-11-21
 * Colonne «riferimento» delle tabelle di raccordo: si sceglie un ruolo o un corso dall'elenco, si vede il nome e si salva
 * il CODICE (chiave stabile). Funzioni pure: gli elenchi arrivano dalla pagina.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 3).
 */
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import type { TipoCorso } from "@/lib/api/tipi-corso";
import { normalizzaCodice } from "@/lib/api/codici-ruoli";

export type FonteRiferimento = "ruoli" | "corsi";

export type OpzioneRiferimento = {
  /** Codice che si salva nel database. */
  valore: string;
  /** Testo che si vede nell'elenco e nella cella. */
  etichetta: string;
};

/** Ruoli che hanno un codice, in ordine alfabetico; i disattivati restano scegliibili ma segnalati. */
export function opzioniRuoli(ruoli: RuoloSicurezza[]): OpzioneRiferimento[] {
  return ruoli
    .filter((r) => normalizzaCodice(r.codice) !== "")
    .map((r) => ({
      valore: normalizzaCodice(r.codice),
      etichetta: `${r.nome} (${normalizzaCodice(r.codice)})${r.attivo ? "" : " · disattivato"}`,
    }))
    .sort((a, b) => a.etichetta.localeCompare(b.etichetta, "it", { numeric: true }));
}

/** Corsi che hanno un codice, in ordine di codice: «CODICE – nome del corso». */
export function opzioniCorsi(corsi: TipoCorso[]): OpzioneRiferimento[] {
  return corsi
    .filter((c) => normalizzaCodice(c.codice) !== "")
    .map((c) => ({
      valore: normalizzaCodice(c.codice),
      etichetta: `${normalizzaCodice(c.codice)} – ${c.nome_corso}`,
    }))
    .sort((a, b) => a.valore.localeCompare(b.valore, "it", { numeric: true }));
}

/** Etichetta di un codice; se l'elenco non lo contiene si mostra il codice stesso (mai un campo vuoto). */
export function etichettaRiferimento(opzioni: OpzioneRiferimento[], valore: unknown): string {
  const cod = normalizzaCodice(typeof valore === "string" ? valore : valore == null ? "" : String(valore));
  if (!cod) return "";
  return opzioni.find((o) => o.valore === cod)?.etichetta ?? cod;
}

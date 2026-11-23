/*
 * File:          ricerca-cartelle.ts
 * Percorso:      src/features/cartelle/ricerca-cartelle.ts
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 20:30): Ricerca file nelle cartelle collegate che distingue «nessuna cartella»,
 *     «permesso mancante» e «nessun risultato», invece di saltare in silenzio le cartelle non autorizzate.
 *   - Rev 2 (2026-11-22): Avanzamento, annullamento e limite di tempo; l'esito indica se la ricerca è stata interrotta (risultati parziali).
 */
import { cercaInTutteLeCartelleConEsito } from "@/lib/api/cartelle-multiple";
import type { AvanzamentoRicerca, FileTrovato, MotivoInterruzione } from "@/lib/api/cartella-locale";
import { autorizzaCartelle, leggiStatoCartelle, type StatoCartelle } from "@/lib/api/stato-cartelle";

export type EsitoRicerca = {
  stato: StatoCartelle;
  /** null = la ricerca NON è stata eseguita (nessuna cartella o nessun permesso). */
  risultati: FileTrovato[] | null;
  /** Diverso da null se la ricerca è stata fermata (annullata o troppo lunga): i risultati sono parziali. */
  interrotta?: MotivoInterruzione | null;
};

export type OpzioniCercaConStato = {
  segnale?: AbortSignal | undefined;
  onAvanzamento?: ((a: AvanzamentoRicerca) => void) | undefined;
};

/**
 * @param chiediPermessi true solo se la chiamata parte da un clic dell'utente: il browser rifiuta
 *   la richiesta di permesso se non c'è un gesto recente (per es. all'apertura automatica di un dialog).
 */
export async function cercaConStato(testo: string, chiediPermessi: boolean, opz: OpzioniCercaConStato = {}): Promise<EsitoRicerca> {
  let stato = await leggiStatoCartelle();
  if (stato.stato === "nessuna") return { stato, risultati: null };

  if (stato.stato === "da_autorizzare" && chiediPermessi) {
    stato = await autorizzaCartelle("read");
  }
  if (stato.autorizzate === 0) return { stato, risultati: null };

  const { risultati, interrotta } = await cercaInTutteLeCartelleConEsito(testo, opz);
  return { stato, risultati, interrotta };
}

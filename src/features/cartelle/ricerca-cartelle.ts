/*
 * File:          ricerca-cartelle.ts
 * Percorso:      src/features/cartelle/ricerca-cartelle.ts
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 20:30): Ricerca file nelle cartelle collegate che distingue «nessuna cartella»,
 *     «permesso mancante» e «nessun risultato», invece di saltare in silenzio le cartelle non autorizzate.
 */
import { cercaInTutteLeCartelle } from "@/lib/api/cartelle-multiple";
import type { FileTrovato } from "@/lib/api/cartella-locale";
import { autorizzaCartelle, leggiStatoCartelle, type StatoCartelle } from "@/lib/api/stato-cartelle";

export type EsitoRicerca = {
  stato: StatoCartelle;
  /** null = la ricerca NON è stata eseguita (nessuna cartella o nessun permesso). */
  risultati: FileTrovato[] | null;
};

/**
 * @param chiediPermessi true solo se la chiamata parte da un clic dell'utente: il browser rifiuta
 *   la richiesta di permesso se non c'è un gesto recente (per es. all'apertura automatica di un dialog).
 */
export async function cercaConStato(testo: string, chiediPermessi: boolean): Promise<EsitoRicerca> {
  let stato = await leggiStatoCartelle();
  if (stato.stato === "nessuna") return { stato, risultati: null };

  if (stato.stato === "da_autorizzare" && chiediPermessi) {
    stato = await autorizzaCartelle("read");
  }
  if (stato.autorizzate === 0) return { stato, risultati: null };

  return { stato, risultati: await cercaInTutteLeCartelle(testo) };
}

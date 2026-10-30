/*
 * File:          stato-cartelle.ts
 * Percorso:      src/lib/api/stato-cartelle.ts
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 20:30): Stato e autorizzazione delle cartelle locali collegate, usati da indicatore in testata,
 *     avvisi nei dialog e messaggi d'errore (nessuna cartella / da autorizzare / ok).
 */
import {
  elencoCartelle,
  aggiungiCartella,
  type CartellaCollegata,
} from "./cartelle-multiple";
import { verificaPermessi, scegliCartellaLocale } from "./cartella-locale";

export type StatoCartelle = {
  /** nessuna: nessuna cartella collegata · da_autorizzare: almeno una senza permesso · ok: tutte autorizzate */
  stato: "nessuna" | "da_autorizzare" | "ok";
  cartelle: { id: string; nome: string; autorizzata: boolean }[];
  /** Numero di cartelle con permesso attivo. */
  autorizzate: number;
};

function costruisciStato(elenco: { id: string; nome: string; autorizzata: boolean }[]): StatoCartelle {
  const autorizzate = elenco.filter((c) => c.autorizzata).length;
  const stato = elenco.length === 0 ? "nessuna" : autorizzate === elenco.length ? "ok" : "da_autorizzare";
  return { stato, cartelle: elenco, autorizzate };
}

/** Legge lo stato SENZA chiedere permessi (si può chiamare in qualsiasi momento, anche senza clic). */
export async function leggiStatoCartelle(modo: "read" | "readwrite" = "read"): Promise<StatoCartelle> {
  const cartelle = await elencoCartelle();
  const elenco = await Promise.all(
    cartelle.map(async (c) => ({
      id: c.id,
      nome: c.nome,
      autorizzata: await verificaPermessi(c.handle, false, modo),
    })),
  );
  return costruisciStato(elenco);
}

/**
 * Chiede al browser il permesso per le cartelle che non lo hanno. Va chiamata da un clic dell'utente
 * (e il prima possibile dopo il clic), altrimenti il browser rifiuta la richiesta.
 */
export async function autorizzaCartelle(modo: "read" | "readwrite" = "read"): Promise<StatoCartelle> {
  const cartelle: CartellaCollegata[] = await elencoCartelle();
  const elenco: { id: string; nome: string; autorizzata: boolean }[] = [];
  for (const c of cartelle) {
    elenco.push({ id: c.id, nome: c.nome, autorizzata: await verificaPermessi(c.handle, true, modo) });
  }
  return costruisciStato(elenco);
}

/**
 * Collega una cartella: la prima diventa la cartella principale dell'archivio, le successive sono aggiuntive.
 * Restituisce il nome della cartella, oppure null se la selezione è stata annullata.
 */
export async function collegaCartella(): Promise<string | null> {
  try {
    const esistenti = await elencoCartelle();
    if (esistenti.length === 0) {
      const h = await scegliCartellaLocale();
      return h ? h.name : null;
    }
    const nuova = await aggiungiCartella();
    return nuova ? nuova.nome : null;
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return null;
    throw e;
  }
}

/*
 * File:          idb-tabella.ts
 * Percorso:      src/lib/api/idb-tabella.ts
 * Data creazione: 2026-11-22
 * Revisioni:
 *   - Rev 1 (2026-11-22): Apertura di un database IndexedDB che garantisce l'esistenza di una tabella. Se il database esiste già
 *     (creato da una versione precedente dell'app) ma senza la tabella, lo riapre con la versione successiva e la crea:
 *     risolve «One of the specified object stores was not found».
 *   - Rev 2 (2026-11-22): Se il browser non risponde entro 5 secondi (aggiornamento in coda dietro un'altra scheda aperta con la versione
 *     precedente) si ferma con un messaggio chiaro invece di restare in attesa senza fine.
 */

const MESSAGGIO_BLOCCO =
  "Chiudi le altre schede dell'applicazione e riprova: stanno ancora usando la versione precedente dell'archivio locale.";
const MESSAGGIO_TIMEOUT =
  "L'archivio locale del browser non risponde. Chiudi le altre schede dell'applicazione (o riavvia il browser) e riprova.";

/** Attesa massima per l'apertura del database. */
export const ATTESA_APERTURA_MS = 5000;

/**
 * Apre il database `nome` assicurandosi che contenga la tabella `tabella`.
 * Aprendo senza indicare la versione si legge quella esistente: se la tabella manca (database creato quando la tabella
 * aveva un altro nome o non c'era) si riapre con versione + 1 e la si crea.
 */
export async function apriDbConTabella(nome: string, tabella: string, opzioni?: IDBObjectStoreParameters): Promise<IDBDatabase> {
  const apri = (versione?: number) =>
    new Promise<IDBDatabase>((resolve, reject) => {
      let finita = false;
      const timer = setTimeout(() => {
        finita = true;
        reject(new Error(MESSAGGIO_TIMEOUT));
      }, ATTESA_APERTURA_MS);
      const req = versione ? indexedDB.open(nome, versione) : indexedDB.open(nome);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(tabella)) db.createObjectStore(tabella, opzioni);
      };
      req.onsuccess = () => {
        clearTimeout(timer);
        if (finita) {
          req.result.close(); // risposta arrivata dopo l'errore: la connessione non serve più
          return;
        }
        finita = true;
        resolve(req.result);
      };
      req.onerror = () => {
        clearTimeout(timer);
        finita = true;
        reject(req.error);
      };
      req.onblocked = () => {
        clearTimeout(timer);
        finita = true;
        reject(new Error(MESSAGGIO_BLOCCO));
      };
    });

  const db = await apri();
  if (db.objectStoreNames.contains(tabella)) {
    // Se in futuro un'altra scheda aggiorna il database, questa non lo blocca.
    db.onversionchange = () => db.close();
    return db;
  }
  const prossima = db.version + 1;
  db.close();
  const aggiornato = await apri(prossima);
  aggiornato.onversionchange = () => aggiornato.close();
  return aggiornato;
}

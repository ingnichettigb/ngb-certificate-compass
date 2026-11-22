/*
 * File:      cartelle-archivio.ts
 * Percorso:  src/lib/api/cartelle-archivio.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da cartelle-multiple.ts: elenco, aggiunta e rimozione delle cartelle collegate e ricerca per nome. Nessun cambio di comportamento.
 *   rev 2 — 22/11/2026 — apriDb con apriDbConTabella: se il database creato il 27/10 ha ancora la vecchia tabella «cartelle», crea «cartelle_collegate»
 *            (prima: «One of the specified object stores was not found» e impossibile aggiungere cartelle).
 */
import { getCartellaArchivio, leggiPercorsoTestuale, cercaFileRicorsivo, verificaPermessi, notificaCartelleCambiate } from "./cartella-locale";
import type { FileTrovato } from "./cartella-locale";
import { apriDbConTabella } from "./idb-tabella";

const DB_NOME = "app_archivio_cartelle";
const STORE_NOME = "cartelle_collegate";
export const CHIAVE_ULTIMA = "ultima_cartella_salvataggio";

export type CartellaCollegata = {
  id: string;
  nome: string;
  /** Alias di nome (compatibilità) */
  name: string;
  percorso?: string | undefined;
  principale?: boolean;
  handle: FileSystemDirectoryHandle;
  dataAggiunta: Date;
};

type RecordCartellaDb = {
  id: string;
  nome: string;
  percorso?: string | undefined;
  handle: FileSystemDirectoryHandle;
  dataAggiunta: string;
};

function apriDb(): Promise<IDBDatabase> {
  return apriDbConTabella(DB_NOME, STORE_NOME, { keyPath: "id" });
}

export async function elencoCartelle(): Promise<CartellaCollegata[]> {
  const lista: CartellaCollegata[] = [];

  const base = await getCartellaArchivio(false);
  if (base) {
    const percorsoBase = (await leggiPercorsoTestuale()) || undefined;
    lista.push({
      id: "principale",
      nome: base.name,
      name: base.name,
      percorso: percorsoBase,
      principale: true,
      handle: base,
      dataAggiunta: new Date(0),
    });
  }

  try {
    const db = await apriDb();
    const daDb = await new Promise<RecordCartellaDb[]>((resolve) => {
      const tx = db.transaction(STORE_NOME, "readonly");
      const store = tx.objectStore(STORE_NOME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as RecordCartellaDb[]) || []);
      req.onerror = () => resolve([]);
    });

    for (const r of daDb) {
      if (base && r.handle.name === base.name) continue;
      lista.push({
        id: r.id,
        nome: r.nome || r.handle.name,
        name: r.nome || r.handle.name,
        percorso: r.percorso,
        handle: r.handle,
        dataAggiunta: new Date(r.dataAggiunta),
      });
    }
  } catch {
    /* fallback alla sola cartella base */
  }

  return lista;
}

export async function aggiungiCartella(
  handleIn?: FileSystemDirectoryHandle,
  nomePersonalizzato?: string,
  percorso?: string
): Promise<CartellaCollegata> {
  const handle =
    handleIn ??
    (await (window as unknown as { showDirectoryPicker: (o?: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ mode: "readwrite" }));
  const db = await apriDb();
  const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: RecordCartellaDb = {
    id,
    nome: nomePersonalizzato?.trim() || handle.name,
    percorso: percorso?.trim(),
    handle,
    dataAggiunta: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readwrite");
    tx.objectStore(STORE_NOME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notificaCartelleCambiate();

  return {
    id: record.id,
    nome: record.nome,
    name: record.nome,
    percorso: record.percorso,
    handle: record.handle,
    dataAggiunta: new Date(record.dataAggiunta),
  };
}

export async function aggiornaPercorsoCartella(id: string, percorso: string): Promise<void> {
  const db = await apriDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readwrite");
    const store = tx.objectStore(STORE_NOME);
    const req = store.get(id);
    req.onsuccess = () => {
      const record = req.result as RecordCartellaDb | undefined;
      if (record) {
        record.percorso = percorso.trim();
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notificaCartelleCambiate();
}

export async function rimuoviCartella(id: string): Promise<void> {
  const db = await apriDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readwrite");
    tx.objectStore(STORE_NOME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notificaCartelleCambiate();
}

export const rimuoviCartellaAggiuntiva = rimuoviCartella;

export async function cercaInTutteLeCartelle(chiave: string): Promise<FileTrovato[]> {
  const cartelle = await elencoCartelle();
  const risultati: FileTrovato[] = [];

  for (const c of cartelle) {
    if (!(await verificaPermessi(c.handle, false, "read"))) continue;
    const trovati = await cercaFileRicorsivo(c.handle, chiave);
    for (const t of trovati) {
      risultati.push({ ...t, cartella: c.nome });
    }
  }

  return risultati.sort((a, b) => b.dataModifica.getTime() - a.dataModifica.getTime());
}

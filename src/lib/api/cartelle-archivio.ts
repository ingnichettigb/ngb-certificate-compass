/*
 * File:      cartelle-archivio.ts
 * Percorso:  src/lib/api/cartelle-archivio.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da cartelle-multiple.ts: elenco, aggiunta e rimozione delle cartelle collegate e ricerca per nome. Nessun cambio di comportamento.
 *   rev 2 — 22/11/2026 — apriDb con apriDbConTabella: se il database creato il 27/10 ha ancora la vecchia tabella «cartelle», crea «cartelle_collegate»
 *            (prima: «One of the specified object stores was not found» e impossibile aggiungere cartelle).
 *   rev 3 — 22/11/2026 — cercaInTutteLeCartelleConEsito: avanzamento, annullamento e limite di tempo; cercaInTutteLeCartelle resta com'era per chi la usa.
 */
import { getCartellaArchivio, leggiPercorsoTestuale, scansionaCartella, verificaPermessi, notificaCartelleCambiate } from "./cartella-locale";
import type { AvanzamentoRicerca, FileTrovato, MotivoInterruzione } from "./cartella-locale";
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

export type OpzioniRicercaCartelle = {
  segnale?: AbortSignal | undefined;
  onAvanzamento?: ((a: AvanzamentoRicerca) => void) | undefined;
};

export type EsitoRicercaCartelle = {
  risultati: FileTrovato[];
  /** Diverso da null se la ricerca è stata fermata (annullata o troppo lunga): i risultati sono parziali. */
  interrotta: MotivoInterruzione | null;
};

/** Cerca in tutte le cartelle collegate e autorizzate, riferendo l'avanzamento e rispettando annullamento e limite di tempo. */
export async function cercaInTutteLeCartelleConEsito(chiave: string, opz: OpzioniRicercaCartelle = {}): Promise<EsitoRicercaCartelle> {
  const cartelle = await elencoCartelle();
  const risultati: FileTrovato[] = [];
  const totale: AvanzamentoRicerca = { cartelle: 0, file: 0, trovati: 0 };
  let interrotta = null as MotivoInterruzione | null;

  for (const c of cartelle) {
    if (opz.segnale?.aborted) {
      interrotta = "annullata";
      break;
    }
    if (!(await verificaPermessi(c.handle, false, "read"))) continue;
    const esito = await scansionaCartella(c.handle, chiave, {
      segnale: opz.segnale,
      onAvanzamento: (a) =>
        opz.onAvanzamento?.({ cartelle: totale.cartelle + a.cartelle, file: totale.file + a.file, trovati: risultati.length + a.trovati }),
    });
    totale.cartelle += esito.avanzamento.cartelle;
    totale.file += esito.avanzamento.file;
    for (const t of esito.risultati) risultati.push({ ...t, cartella: c.nome });
    if (esito.interrotta) {
      interrotta = esito.interrotta;
      if (esito.interrotta === "annullata") break;
    }
  }

  risultati.sort((a, b) => b.dataModifica.getTime() - a.dataModifica.getTime());
  return { risultati, interrotta };
}

export async function cercaInTutteLeCartelle(chiave: string): Promise<FileTrovato[]> {
  return (await cercaInTutteLeCartelleConEsito(chiave)).risultati;
}

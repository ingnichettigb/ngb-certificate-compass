/*
 * File:      cartella-locale.ts
 * Percorso:  src/lib/api/cartella-locale.ts
 * Gestione cartella locale/rete tramite File System Access API:
 * - Salvataggio persistente del handle in IndexedDB
 * - Scansione ricorsiva delle sottocartelle
 * - Lettura, anteprima e scrittura file
 */

const DB_NOME = "app_archivio_locale";
const DB_VERSIONE = 1;
const STORE_NOME = "impostazioni";
const CHIAVE_HANDLE = "cartella_radice";

let cacheHandle: FileSystemDirectoryHandle | null = null;

export type FileTrovato = {
  nome: string;
  percorsoRelativo: string;
  handle: FileSystemFileHandle;
  dimensione: number;
  dataModifica: Date;
};

/** Verifica se il browser supporta l'accesso alle cartelle locali (Chrome, Edge, Opera, Brave). */
export function supportaCartellaLocale(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// Helper interno per IndexedDB nativo senza dipendenze
function apriDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSIONE);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NOME)) {
        db.createObjectStore(STORE_NOME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function salvaHandleSuDb(handle: FileSystemDirectoryHandle | null): Promise<void> {
  const db = await apriDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readwrite");
    const store = tx.objectStore(STORE_NOME);
    if (handle) {
      store.put(handle, CHIAVE_HANDLE);
    } else {
      store.delete(CHIAVE_HANDLE);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function leggiHandleDaDb(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await apriDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NOME, "readonly");
      const store = tx.objectStore(STORE_NOME);
      const req = store.get(CHIAVE_HANDLE);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Verifica se abbiamo i permessi di lettura sulla cartella, chiedendoli se necessario. */
export async function verificaPermessi(
  handle: FileSystemDirectoryHandle,
  richiediSeMancanti = true,
): Promise<boolean> {
  try {
    const h = handle as unknown as {
      queryPermission?: (o: { mode: string }) => Promise<PermissionState>;
      requestPermission?: (o: { mode: string }) => Promise<PermissionState>;
    };
    if (!h.queryPermission) return true;
    const stato = await h.queryPermission({ mode: "readwrite" });
    if (stato === "granted") return true;
    if (richiediSeMancanti && h.requestPermission) {
      const nuovoStato = await h.requestPermission({ mode: "readwrite" });
      return nuovoStato === "granted";
    }
    return false;
  } catch {
    return false;
  }
}

/** Recupera la cartella archivio configurata (da cache o IndexedDB). */
export async function getCartellaArchivio(richiediPermessi = false): Promise<FileSystemDirectoryHandle | null> {
  if (cacheHandle) {
    if (richiediPermessi) await verificaPermessi(cacheHandle, true);
    return cacheHandle;
  }
  const salvato = await leggiHandleDaDb();
  if (salvato) {
    if (richiediPermessi) {
      const ok = await verificaPermessi(salvato, true);
      if (ok) cacheHandle = salvato;
      return ok ? salvato : null;
    }
    cacheHandle = salvato;
    return salvato;
  }
  return null;
}

/** Apre il selettore di cartella e memorizza la scelta in modo permanente. */
export async function scegliCartellaLocale(): Promise<FileSystemDirectoryHandle | null> {
  const w = window as unknown as {
    showDirectoryPicker?: (o?: unknown) => Promise<FileSystemDirectoryHandle>;
  };
  if (!w.showDirectoryPicker) {
    throw new Error("Il tuo browser non supporta la selezione delle cartelle locali. Usa Chrome o Edge.");
  }
  const scelta = await w.showDirectoryPicker({
    id: "archivio-attestati-root",
    mode: "readwrite",
    startIn: "documents",
  });
  cacheHandle = scelta;
  await salvaHandleSuDb(scelta);
  return scelta;
}

/** Rimuove il riferimento alla cartella salvata nelle impostazioni. */
export async function dimenticaCartellaLocale(): Promise<void> {
  cacheHandle = null;
  await salvaHandleSuDb(null);
}

/**
 * Scansione ricorsiva di tutte le sottocartelle a partire dalla cartella radice.
 * Cerca i file corrispondenti alla chiave inserita (senza distinzione tra maiuscole e minuscole).
 */
export async function cercaFileRicorsivo(
  root: FileSystemDirectoryHandle,
  chiaveRicerca: string,
): Promise<FileTrovato[]> {
  const termini = chiaveRicerca
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const risultati: FileTrovato[] = [];

  async function navigaCartella(dir: FileSystemDirectoryHandle, percorsoAttuale: string) {
    // @ts-expect-error values() è supportato da FileSystemDirectoryHandle
    for await (const entry of dir.values()) {
      if (entry.kind === "file") {
        const nomeLower = entry.name.toLowerCase();
        // Cerca file con estensione documento/immagine
        const isDoc =
          nomeLower.endsWith(".pdf") ||
          nomeLower.endsWith(".jpg") ||
          nomeLower.endsWith(".jpeg") ||
          nomeLower.endsWith(".png");

        if (!isDoc) continue;

        // Se tutti i termini inseriti sono contenuti nel nome del file o nel percorso
        const corrisponde =
          termini.length === 0 ||
          termini.every((t) => nomeLower.includes(t) || percorsoAttuale.toLowerCase().includes(t));

        if (corrisponde) {
          try {
            const fileHandle = entry as FileSystemFileHandle;
            const fileData = await fileHandle.getFile();
            risultati.push({
              nome: entry.name,
              percorsoRelativo: percorsoAttuale ? `${percorsoAttuale}/${entry.name}` : entry.name,
              handle: fileHandle,
              dimensione: fileData.size,
              dataModifica: new Date(fileData.lastModified),
            });
          } catch {
            // Continua se un singolo file non è leggibile
          }
        }
      } else if (entry.kind === "directory") {
        const subDir = entry as FileSystemDirectoryHandle;
        const nuovoPercorso = percorsoAttuale ? `${percorsoAttuale}/${entry.name}` : entry.name;
        await navigaCartella(subDir, nuovoPercorso);
      }
    }
  }

  await navigaCartella(root, "");
  // Ordina per data di modifica più recente
  return risultati.sort((a, b) => b.dataModifica.getTime() - a.dataModifica.getTime());
}

/** Apre un file handle o percorso in una nuova scheda del browser. */
export async function apriFileLocale(fileHandle: FileSystemFileHandle): Promise<void> {
  const file = await fileHandle.getFile();
  const url = URL.createObjectURL(file);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Cerca un file a partire dal suo percorso relativo salvato e lo apre. */
export async function apriDaPercorsoRelativo(
  root: FileSystemDirectoryHandle,
  percorsoRelativo: string,
): Promise<boolean> {
  try {
    const parti = percorsoRelativo.split("/").filter(Boolean);
    let dir = root;
    for (let i = 0; i < parti.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parti[i] as string);
    }
    const fileHandle = await dir.getFileHandle(parti[parti.length - 1] as string);
    await apriFileLocale(fileHandle);
    return true;
  } catch {
    return false;
  }
}

/** Scrive un file nella cartella locale (compatibilità con il salvataggio esistente). */
export async function salvaInLocale(file: File, nomeFile: string, sottocartella = ""): Promise<boolean> {
  const root = await getCartellaArchivio(true);
  if (!root) throw new Error("Cartella archivio non impostata");

  let targetDir = root;
  if (sottocartella) {
    const parti = sottocartella.split("/").filter(Boolean);
    for (const p of parti) {
      targetDir = await targetDir.getDirectoryHandle(p, { create: true });
    }
  }

  let esiste = false;
  try {
    await targetDir.getFileHandle(nomeFile);
    esiste = true;
  } catch {
    esiste = false;
  }

  if (esiste && !window.confirm(`"${nomeFile}" esiste già nella cartella locale. Sovrascrivere?`)) {
    return false;
  }

  const handle = await targetDir.getFileHandle(nomeFile, { create: true });
  const w = await handle.createWritable();
  await w.write(file);
  await w.close();
  return true;
}

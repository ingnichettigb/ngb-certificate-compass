/*
 * File:          cartella-locale.ts
 * Percorso:      src/lib/api/cartella-locale.ts
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 09:07): Implementazione gestione handle IndexedDB e scansione ricorsiva.
 *   - Rev 2 (2026-10-25 11:00): Normalizzazione ricerca con rimozione accenti e tolleranza separatori per sottocartelle.
 *   - Rev 3 (2026-10-25 11:14): Aggiunta salvaInLocale: copia di un file nell'archivio locale con sottocartelle e rinomina anti-sovrascrittura.
 *   - Rev 4 (2026-10-27 21:05): Campo cartella su FileTrovato ed esportata scriviInCartella per il multi-cartella.
 *   - Rev 5 (2026-10-28 10:00): Aggiunta ottieniFileDaPercorso per consentire la lettura diretta del Blob per l'anteprima in pagina.
 *   - Rev 6 (2026-10-28 10:05): Aggiunti alias scegliCartellaLocale e dimenticaCartellaLocale per le schermate che usano i nomi storici.
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
  /** Nome della cartella collegata in cui è stato trovato (multi-cartella). */
  cartella?: string;
};

/** Verifica se il browser supporta l'accesso alle cartelle locali (Chrome, Edge, Opera, Brave). */
export function supportaCartellaLocale(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// Helper interno per IndexedDB nativo senza dipendenze esterne
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

/** Apre il selettore di cartelle nativo del browser e salva l'handle. */
export async function scegliCartellaArchivio(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportaCartellaLocale()) {
    throw new Error("Il tuo browser non supporta la selezione delle cartelle locali. Usa Chrome o Edge da PC.");
  }
  const w = window as unknown as {
    showDirectoryPicker?: (o?: unknown) => Promise<FileSystemDirectoryHandle>;
  };
  if (!w.showDirectoryPicker) return null;
  const handle = await w.showDirectoryPicker({
    id: "archivio-attestati-sicurezza",
    mode: "readwrite",
  });
  cacheHandle = handle;
  await salvaHandleSuDb(handle);
  return handle;
}

/** Rimuove la cartella configurata. */
export async function disconnettiCartellaArchivio(): Promise<void> {
  cacheHandle = null;
  await salvaHandleSuDb(null);
}

// Normalizza stringhe per la ricerca (minuscolo, senza accenti, spazi singoli)
function normalizzaPerRicerca(testo: string): string {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_.\s]+/g, " ")
    .trim();
}

/**
 * Cerca ricorsivamente tutti i file nella cartella che contengono la chiave nel nome
 * o nel percorso relativo. La ricerca è case-insensitive e ignora accenti e separatori.
 */
export async function cercaFileRicorsivo(
  dirHandle: FileSystemDirectoryHandle,
  chiave: string,
  percorsoAttuale = "",
  risultati: FileTrovato[] = [],
  profondita = 0,
  maxRisultati = 200,
): Promise<FileTrovato[]> {
  if (profondita > 10 || risultati.length >= maxRisultati) return risultati;

  const paroleChiave = normalizzaPerRicerca(chiave).split(" ").filter(Boolean);

  const iteratore = (dirHandle as unknown as {
    values: () => AsyncIterable<FileSystemHandle>;
  }).values();

  for await (const voce of iteratore) {
    if (risultati.length >= maxRisultati) break;
    const percorsoVoce = percorsoAttuale ? `${percorsoAttuale}/${voce.name}` : voce.name;

    if (voce.kind === "file") {
      const nomeLower = voce.name.toLowerCase();
      if (
        nomeLower.endsWith(".pdf") ||
        nomeLower.endsWith(".jpg") ||
        nomeLower.endsWith(".jpeg") ||
        nomeLower.endsWith(".png")
      ) {
        const testoConfronto = normalizzaPerRicerca(percorsoVoce);
        const corrisponde =
          paroleChiave.length === 0 ||
          paroleChiave.every((parola) => testoConfronto.includes(parola));

        if (corrisponde) {
          try {
            const fileHandle = voce as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            risultati.push({
              nome: voce.name,
              percorsoRelativo: percorsoVoce,
              handle: fileHandle,
              dimensione: file.size,
              dataModifica: new Date(file.lastModified),
            });
          } catch {
            // Ignora file non accessibili
          }
        }
      }
    } else if (voce.kind === "directory") {
      // Salta cartelle di sistema o pesanti
      if (!voce.name.startsWith(".") && voce.name !== "node_modules") {
        await cercaFileRicorsivo(
          voce as FileSystemDirectoryHandle,
          chiave,
          percorsoVoce,
          risultati,
          profondita + 1,
          maxRisultati,
        );
      }
    }
  }

  return risultati;
}

/** Apre un file locale in una nuova scheda del browser creando un blob URL temporaneo. */
export async function apriFileLocale(fileHandle: FileSystemFileHandle): Promise<void> {
  const file = await fileHandle.getFile();
  const url = URL.createObjectURL(file);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Restituisce l'oggetto File locale a partire da un percorso relativo, se presente. */
export async function ottieniFileDaPercorso(
  root: FileSystemDirectoryHandle,
  percorsoRelativo: string,
): Promise<File | null> {
  try {
    const parti = percorsoRelativo
      .replace(/^(\.\.\/|\.\/)+/, "")
      .split("/")
      .filter(Boolean);
    let dir = root;
    for (let i = 0; i < parti.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parti[i]!);
    }
    const nomeFile = parti[parti.length - 1];
    if (!nomeFile) return null;
    const fileHandle = await dir.getFileHandle(nomeFile);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

/** Cerca un file a partire dal suo percorso relativo memorizzato e lo apre. */
export async function apriDaPercorsoRelativo(
  root: FileSystemDirectoryHandle,
  percorsoRelativo: string,
): Promise<boolean> {
  try {
    const parti = percorsoRelativo
      .replace(/^(\.\.\/|\.\/)+/, "")
      .split("/")
      .filter(Boolean);
    let dir = root;
    for (let i = 0; i < parti.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parti[i]!);
    }
    const nomeFile = parti[parti.length - 1];
    if (!nomeFile) return false;
    const fileHandle = await dir.getFileHandle(nomeFile);
    await apriFileLocale(fileHandle);
    return true;
  } catch {
    return false;
  }
}

/**
 * Salva una copia del file nella cartella archivio configurata, creando le
 * sottocartelle necessarie. Se esiste già un file con lo stesso nome ne crea
 * uno con suffisso progressivo, così nessuna copia va sovrascritta.
 * Restituisce false se la cartella non è configurata o i permessi sono negati.
 */
export async function salvaInLocale(
  file: File,
  nomeFile: string,
  sottocartella?: string,
): Promise<boolean> {
  const root = await getCartellaArchivio(true);
  if (!root) return false;
  return scriviInCartella(root, file, nomeFile, sottocartella);
}

/** Scrive il file nella cartella indicata (sottocartelle create se mancano). */
export async function scriviInCartella(
  root: FileSystemDirectoryHandle,
  file: File,
  nomeFile: string,
  sottocartella?: string,
): Promise<boolean> {
  let dir = root;
  for (const parte of (sottocartella || "").split("/").filter(Boolean)) {
    dir = await dir.getDirectoryHandle(parte, { create: true });
  }

  const handle = await nuovoHandleFile(dir, nomeFile);
  const scrittura = await handle.createWritable();
  await scrittura.write(file);
  await scrittura.close();
  return true;
}

/** Handle di un file libero: se il nome è già occupato aggiunge " (2)", " (3)"... */
async function nuovoHandleFile(
  dir: FileSystemDirectoryHandle,
  nomeFile: string,
): Promise<FileSystemFileHandle> {
  const base = nomeFile.replace(/\.[^.]+$/, "");
  const estensione = nomeFile.slice(base.length);
  for (let n = 1; n <= 50; n++) {
    const candidato = n === 1 ? nomeFile : `${base} (${n})${estensione}`;
    try {
      await dir.getFileHandle(candidato);
    } catch {
      return dir.getFileHandle(candidato, { create: true });
    }
  }
  throw new Error("Impossibile salvare il file: nome già occupato troppe volte");
}

/** Nome storico usato dalle schermate: apre il selettore della cartella archivio principale. */
export const scegliCartellaLocale = scegliCartellaArchivio;

/** Nome storico usato dalle schermate: scollega la cartella archivio principale. */
export const dimenticaCartellaLocale = disconnettiCartellaArchivio;

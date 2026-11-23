/*
 * File:          cartella-locale.ts
 * Percorso:      src/lib/api/cartella-locale.ts
 * Data creazione: 2026-10-24
 * Revisioni:
 *   - Rev 1 (2026-10-24 16:30): Selezione cartella locale archivio con File System Access API.
 *   - Rev 2 (2026-10-24 17:15): Salvataggio automatico duplicati con suffisso numerico.
 *   - Rev 3 (2026-10-25 08:45): Apertura diretta file PDF/immagini da handle in nuova scheda browser.
 *   - Rev 4 (2026-10-25 10:45): Ricerca ricorsiva per cognome/testo con filtro solo file PDF/immagini.
 *   - Rev 5 (2026-10-25 21:00): Funzione ottieniFileDaPercorso per apertura immediata senza riaprire il picker.
 *   - Rev 6 (2026-10-30 11:10): Supporto percorsi con backslash Windows e rimozione automatica prefisso radice.
 *   - Rev 7 (2026-10-30 11:35): Ripristinati alias canonical e supporto browser per compilazione produzione.
 *   - Rev 8 (2026-10-30 19:30): verificaPermessi accetta la modalità (read/readwrite); default invariato.
 *   - Rev 9 (2026-10-30 20:30): Evento «cartelle:cambiate» (notificaCartelleCambiate) per aggiornare gli indicatori.
 *   - Rev 10 (2026-11-01 12:20): Salvataggio e lettura del percorso testuale esteso in IndexedDB.
 *   - Rev 11 (2026-11-22): apriDb con apriDbConTabella: se la tabella mancasse nel database già esistente viene creata.
 *   - Rev 12 (2026-11-22): Ricerca nei file con scansionaCartella: più cartelle in parallelo, contatore di avanzamento, annullamento e limite di tempo
 *     (180 s), cartelle non leggibili saltate; cercaFileRicorsivo resta come funzione compatibile.
 */

import { apriDbConTabella } from "./idb-tabella";

const DB_NOME = "app_archivio_attestati";
const STORE_NOME = "impostazioni";
const CHIAVE_HANDLE = "cartella_archivio_handle";
const CHIAVE_PERCORSO = "cartella_archivio_percorso_testo";

let cacheHandle: FileSystemDirectoryHandle | null = null;

/** Verifica se il browser supporta l'accesso nativo alle cartelle locali (Chrome, Edge, Opera). */
export function supportaCartellaLocale(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function apriDb(): Promise<IDBDatabase> {
  return apriDbConTabella(DB_NOME, STORE_NOME);
}

async function salvaHandleSuDb(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await apriDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readwrite");
    const store = tx.objectStore(STORE_NOME);
    store.put(handle, CHIAVE_HANDLE);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function salvaPercorsoTestuale(percorso: string): Promise<void> {
  const db = await apriDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readwrite");
    const store = tx.objectStore(STORE_NOME);
    store.put(percorso.trim(), CHIAVE_PERCORSO);
    tx.oncomplete = () => {
      notificaCartelleCambiate();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function leggiPercorsoTestuale(): Promise<string | null> {
  try {
    const db = await apriDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NOME, "readonly");
      const store = tx.objectStore(STORE_NOME);
      const req = store.get(CHIAVE_PERCORSO);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function rimuoviHandleDaDb(): Promise<void> {
  const db = await apriDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readwrite");
    const store = tx.objectStore(STORE_NOME);
    store.delete(CHIAVE_HANDLE);
    store.delete(CHIAVE_PERCORSO);
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

/** Nome dell'evento di finestra emesso quando cambia lo stato delle cartelle collegate o dei permessi. */
export const EVENTO_CARTELLE_CAMBIATE = "cartelle:cambiate";

/** Avvisa le schermate (indicatore in testata, avvisi nei dialog) che lo stato delle cartelle è cambiato. */
export function notificaCartelleCambiate(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_CARTELLE_CAMBIATE));
}

/** Verifica se abbiamo i permessi sulla cartella, chiedendoli se necessario. */
export async function verificaPermessi(
  handle: FileSystemDirectoryHandle,
  richiediSeMancanti = true,
  modo: "read" | "readwrite" = "readwrite",
): Promise<boolean> {
  try {
    const h = handle as unknown as {
      queryPermission?: (o: { mode: string }) => Promise<PermissionState>;
      requestPermission?: (o: { mode: string }) => Promise<PermissionState>;
    };
    if (!h.queryPermission) return true;
    const stato = await h.queryPermission({ mode: modo });
    if (stato === "granted") return true;
    if (richiediSeMancanti && h.requestPermission) {
      const nuovoStato = await h.requestPermission({ mode: modo });
      if (nuovoStato === "granted") notificaCartelleCambiate();
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

/** Chiede all'utente di selezionare la cartella dell'archivio attestati sul PC. */
export async function scegliCartellaArchivio(): Promise<FileSystemDirectoryHandle | null> {
  const w = window as unknown as {
    showDirectoryPicker?: (o?: unknown) => Promise<FileSystemDirectoryHandle>;
  };
  if (!w.showDirectoryPicker) {
    throw new Error(
      "Il tuo browser non supporta la selezione delle cartelle locali. Usa Google Chrome, Microsoft Edge o Opera.",
    );
  }

  const handle = await w.showDirectoryPicker({
    id: "archivio-attestati-sicurezza",
    mode: "readwrite",
  });

  cacheHandle = handle;
  await salvaHandleSuDb(handle);
  notificaCartelleCambiate();
  return handle;
}

/** Scollega la cartella configurata. */
export async function disconnettiCartellaArchivio(): Promise<void> {
  cacheHandle = null;
  await rimuoviHandleDaDb();
  notificaCartelleCambiate();
}

/** Formatta la dimensione file in formato leggibile. */
export function formattaDimensione(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type FileTrovato = {
  nome: string;
  percorsoRelativo: string;
  dimensione: number;
  dataModifica: Date;
  tipo: string;
  cartella?: string;
  handle: FileSystemFileHandle;
};

const ESTENSIONI_VALIDE = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

function haEstensioneValida(nome: string): boolean {
  const lower = nome.toLowerCase();
  return ESTENSIONI_VALIDE.some((ext) => lower.endsWith(ext));
}

function normalizzaTesto(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim();
}

export type AvanzamentoRicerca = { cartelle: number; file: number; trovati: number };
export type MotivoInterruzione = "annullata" | "tempo";

export type OpzioniScansione = {
  prefisso?: string | undefined;
  profondita?: number | undefined;
  maxProfondita?: number | undefined;
  maxRisultati?: number | undefined;
  /** Quante cartelle leggere contemporaneamente (default 6). */
  concorrenza?: number | undefined;
  /** Dopo questo tempo la ricerca si ferma e restituisce quanto trovato (default 180 000 ms). */
  limiteMs?: number | undefined;
  segnale?: AbortSignal | undefined;
  onAvanzamento?: ((a: AvanzamentoRicerca) => void) | undefined;
  /** Elenco a cui aggiungere i file trovati (default: nuovo elenco). */
  risultati?: FileTrovato[] | undefined;
};

export type EsitoScansione = {
  risultati: FileTrovato[];
  interrotta: MotivoInterruzione | null;
  avanzamento: AvanzamentoRicerca;
};

type LavoroCartella = { dir: FileSystemDirectoryHandle; prefisso: string; profondita: number };

/**
 * Cerca i file della cartella (e sottocartelle) che contengono tutte le parole chiave nel nome.
 * Legge più cartelle in parallelo, riferisce l'avanzamento, si può annullare e si ferma da sola dopo il limite di tempo
 * (anche se una lettura del disco non risponde): restituisce sempre quanto trovato fino a quel momento.
 */
export async function scansionaCartella(
  radice: FileSystemDirectoryHandle,
  chiaveRicerca: string,
  opz: OpzioniScansione = {},
): Promise<EsitoScansione> {
  const maxProfondita = opz.maxProfondita ?? 8;
  const maxRisultati = opz.maxRisultati ?? 60;
  const concorrenza = Math.max(1, opz.concorrenza ?? 6);
  const limiteMs = opz.limiteMs ?? 180_000;
  const risultati = opz.risultati ?? [];
  const profonditaIniziale = opz.profondita ?? 0;
  const avanzamento: AvanzamentoRicerca = { cartelle: 0, file: 0, trovati: risultati.length };

  if (profonditaIniziale > maxProfondita || risultati.length >= maxRisultati) {
    return { risultati, interrotta: null, avanzamento };
  }

  const parole = normalizzaTesto(chiaveRicerca).split(/\s+/).filter(Boolean);
  const coda: LavoroCartella[] = [{ dir: radice, prefisso: opz.prefisso ?? "", profondita: profonditaIniziale }];
  const inizio = Date.now();
  let interrotta = null as MotivoInterruzione | null;
  let inCorso = 0;
  let ultimoAvviso = 0;

  const avvisa = (forza = false) => {
    if (!opz.onAvanzamento) return;
    const ora = Date.now();
    if (!forza && ora - ultimoAvviso < 150) return;
    ultimoAvviso = ora;
    opz.onAvanzamento({ ...avanzamento });
  };

  const devoFermarmi = (): boolean => {
    if (interrotta) return true;
    if (opz.segnale?.aborted) {
      interrotta = "annullata";
      return true;
    }
    if (Date.now() - inizio > limiteMs) {
      interrotta = "tempo";
      return true;
    }
    return risultati.length >= maxRisultati;
  };

  const esamina = async (lavoro: LavoroCartella): Promise<void> => {
    const sorgente = lavoro.dir as unknown as { values?: () => AsyncIterable<FileSystemHandle> };
    if (!sorgente.values) return;
    avanzamento.cartelle += 1;
    try {
      for await (const entry of sorgente.values()) {
        if (devoFermarmi()) break;
        const percorso = lavoro.prefisso ? `${lavoro.prefisso}/${entry.name}` : entry.name;

        if (entry.kind === "file") {
          avanzamento.file += 1;
          if (haEstensioneValida(entry.name)) {
            const nomeNorm = normalizzaTesto(entry.name);
            if (parole.length === 0 || parole.every((p) => nomeNorm.includes(p))) {
              try {
                const fileHandle = entry as FileSystemFileHandle;
                const file = await fileHandle.getFile();
                if (devoFermarmi()) break;
                risultati.push({
                  nome: entry.name,
                  percorsoRelativo: percorso,
                  dimensione: file.size,
                  dataModifica: new Date(file.lastModified),
                  tipo: file.type || "application/octet-stream",
                  handle: fileHandle,
                });
                avanzamento.trovati = risultati.length;
              } catch {
                // Ignora file non leggibili
              }
            }
          }
        } else if (entry.kind === "directory") {
          if (entry.name.startsWith(".") || entry.name.toLowerCase() === "node_modules") continue;
          if (lavoro.profondita + 1 <= maxProfondita) {
            coda.push({ dir: entry as FileSystemDirectoryHandle, prefisso: percorso, profondita: lavoro.profondita + 1 });
          }
        }
        avvisa();
      }
    } catch {
      // Cartella non leggibile (permessi, percorso troppo lungo…): si prosegue con le altre.
    }
  };

  const lavoratore = async (): Promise<void> => {
    for (;;) {
      if (devoFermarmi()) return;
      const lavoro = coda.shift();
      if (!lavoro) {
        if (inCorso === 0) return;
        await new Promise<void>((r) => setTimeout(r, 4)); // un altro lavoratore può ancora aggiungere cartelle
        continue;
      }
      inCorso += 1;
      try {
        await esamina(lavoro);
      } finally {
        inCorso -= 1;
      }
    }
  };

  // Annullamento e limite di tempo valgono anche se una lettura del disco non risponde più.
  let sblocca: () => void = () => undefined;
  const interruzione = new Promise<void>((resolve) => {
    sblocca = resolve;
  });
  const timer = setTimeout(() => {
    if (!interrotta) interrotta = "tempo";
    sblocca();
  }, limiteMs);
  const alAnnullo = () => {
    if (!interrotta) interrotta = "annullata";
    sblocca();
  };
  opz.segnale?.addEventListener("abort", alAnnullo);
  if (opz.segnale?.aborted) alAnnullo();

  avvisa(true);
  try {
    await Promise.race([Promise.all(Array.from({ length: concorrenza }, lavoratore)), interruzione]);
  } finally {
    clearTimeout(timer);
    opz.segnale?.removeEventListener("abort", alAnnullo);
  }

  if (risultati.length > maxRisultati) risultati.length = maxRisultati;
  avanzamento.trovati = risultati.length;
  avvisa(true);
  return { risultati, interrotta, avanzamento };
}

/** Cerca ricorsivamente i file nella cartella che contengono tutte le parole chiave nel nome (aggiunge a `risultati`). */
export async function cercaFileRicorsivo(
  dir: FileSystemDirectoryHandle,
  chiaveRicerca: string,
  prefisso = "",
  risultati: FileTrovato[] = [],
  profondita = 0,
  maxProfondita = 8,
  maxRisultati = 60,
): Promise<FileTrovato[]> {
  await scansionaCartella(dir, chiaveRicerca, { prefisso, risultati, profondita, maxProfondita, maxRisultati });
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
    const percorsoNorm = percorsoRelativo
      .replace(/\\/g, "/")
      .replace(/^(\.\.\/|\.\/)+/, "")
      .trim();
    let parti = percorsoNorm.split("/").filter(Boolean);
    if (parti.length > 0 && parti[0]?.toLowerCase() === root.name.toLowerCase()) {
      parti = parti.slice(1);
    }
    let dir = root;
    for (let i = 0; i < parti.length - 1; i++) {
      const sotto = parti[i];
      if (sotto) {
        dir = await dir.getDirectoryHandle(sotto);
      }
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
    const percorsoNorm = percorsoRelativo
      .replace(/\\/g, "/")
      .replace(/^(\.\.\/|\.\/)+/, "")
      .trim();
    let parti = percorsoNorm.split("/").filter(Boolean);
    if (parti.length > 0 && parti[0]?.toLowerCase() === root.name.toLowerCase()) {
      parti = parti.slice(1);
    }
    let dir = root;
    for (let i = 0; i < parti.length - 1; i++) {
      const sotto = parti[i];
      if (sotto) {
        dir = await dir.getDirectoryHandle(sotto);
      }
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

/** Salva una copia del file nella cartella archivio configurata con sottocartelle. */
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
  try {
    let dir = root;
    if (sottocartella) {
      const parti = sottocartella
        .replace(/\\/g, "/")
        .split("/")
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of parti) {
        dir = await dir.getDirectoryHandle(p, { create: true });
      }
    }

    const nomeUnivoco = await trovaNomeDisponibile(dir, nomeFile);
    const fileHandle = await dir.getFileHandle(nomeUnivoco, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

async function trovaNomeDisponibile(
  dir: FileSystemDirectoryHandle,
  nomeIniziale: string,
): Promise<string> {
  const punto = nomeIniziale.lastIndexOf(".");
  const base = punto > 0 ? nomeIniziale.slice(0, punto) : nomeIniziale;
  const ext = punto > 0 ? nomeIniziale.slice(punto) : "";

  let nome = nomeIniziale;
  let contatore = 1;

  while (await fileEsiste(dir, nome)) {
    nome = `${base} (${contatore})${ext}`;
    contatore++;
  }

  return nome;
}

async function fileEsiste(dir: FileSystemDirectoryHandle, nome: string): Promise<boolean> {
  try {
    await dir.getFileHandle(nome);
    return true;
  } catch {
    return false;
  }
}

/* Alias di compatibilità per schermate storiche e test */
export const selezionaCartellaArchivio = scegliCartellaArchivio;
export const scollegaCartellaArchivio = disconnettiCartellaArchivio;
export const scegliCartellaLocale = scegliCartellaArchivio;
export const dimenticaCartellaLocale = disconnettiCartellaArchivio;

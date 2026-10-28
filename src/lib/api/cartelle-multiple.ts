/*
 * File:          cartelle-multiple.ts
 * Percorso:      src/lib/api/cartelle-multiple.ts
 * Data creazione: 2026-10-27
 * Revisioni:
 *   - Rev 1 (2026-10-27 21:05): Gestione di più cartelle archivio (principale + aggiuntive),
 *     ricerca su tutte, apertura da percorso su tutte, salvataggio con memoria dell'ultima cartella.
 *   - Rev 2 (2026-10-28 10:00): Aggiunte funzioni per il recupero diretto del file locale e
 *     risoluzione unificata del documento (Cloud / Locale) per la visualizzazione dell'attestato.
 *   - Rev 3 (2026-10-28 10:05): Riesportata verificaPermessi per chi la importa da questo modulo.
 *   - Rev 4 (2026-10-28 14:15): Aggiunta funzione rinominaFileNelPercorso per rinomina fisica
 *     del file direttamente nella cartella locale di provenienza del link.
 */
import {
  getCartellaArchivio,
  verificaPermessi,
  cercaFileRicorsivo,
  apriDaPercorsoRelativo,
  ottieniFileDaPercorso,
  scriviInCartella,
  type FileTrovato,
} from "./cartella-locale";
export { verificaPermessi };
import { supabase } from "@/integrations/supabase/client";

const DB_NOME = "app_archivio_cartelle";
const STORE = "cartelle";
const CHIAVE = "aggiuntive";
const CHIAVE_ULTIMA = "archivio_ultima_cartella_salvataggio";

export type CartellaCollegata = {
  nome: string;
  handle: FileSystemDirectoryHandle;
  principale: boolean;
};

function apriDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function leggiAggiuntive(): Promise<FileSystemDirectoryHandle[]> {
  try {
    const db = await apriDb();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(CHIAVE);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function scriviAggiuntive(lista: FileSystemDirectoryHandle[]): Promise<void> {
  const db = await apriDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(lista, CHIAVE);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Elenco di tutte le cartelle collegate: prima la principale, poi le aggiuntive. */
export async function elencoCartelle(): Promise<CartellaCollegata[]> {
  const out: CartellaCollegata[] = [];
  const principale = await getCartellaArchivio(false);
  if (principale) out.push({ nome: principale.name, handle: principale, principale: true });
  for (const h of await leggiAggiuntive()) {
    out.push({ nome: h.name, handle: h, principale: false });
  }
  return out;
}

/** Apre il selettore e aggiunge una cartella aggiuntiva (senza duplicati). */
export async function aggiungiCartella(): Promise<FileSystemDirectoryHandle | null> {
  const w = window as unknown as {
    showDirectoryPicker?: (o?: unknown) => Promise<FileSystemDirectoryHandle>;
  };
  if (!w.showDirectoryPicker) throw new Error("Browser non compatibile: usa Chrome o Edge.");
  const scelta = await w.showDirectoryPicker({ id: "archivio-attestati-extra", mode: "readwrite" });
  const tutte = await elencoCartelle();
  for (const c of tutte) {
    if (await c.handle.isSameEntry(scelta)) throw new Error(`La cartella "${scelta.name}" è già collegata`);
  }
  await scriviAggiuntive([...(await leggiAggiuntive()), scelta]);
  return scelta;
}

/** Scollega una cartella aggiuntiva (la principale si gestisce a parte). */
export async function rimuoviCartellaAggiuntiva(handle: FileSystemDirectoryHandle): Promise<void> {
  const lista = await leggiAggiuntive();
  const resto: FileSystemDirectoryHandle[] = [];
  for (const h of lista) if (!(await h.isSameEntry(handle))) resto.push(h);
  await scriviAggiuntive(resto);
}

/** Cerca in tutte le cartelle collegate (chiedendo i permessi se servono). */
export async function cercaInTutteLeCartelle(chiave: string): Promise<FileTrovato[]> {
  const risultati: FileTrovato[] = [];
  for (const c of await elencoCartelle()) {
    if (!(await verificaPermessi(c.handle, true))) continue;
    const trovati = await cercaFileRicorsivo(c.handle, chiave);
    for (const f of trovati) risultati.push({ ...f, cartella: c.nome });
  }
  return risultati.sort((a, b) => b.dataModifica.getTime() - a.dataModifica.getTime());
}

/** Prova ad aprire un percorso relativo in ciascuna cartella collegata. */
export async function apriDaPercorsoInTutte(percorso: string): Promise<boolean> {
  for (const c of await elencoCartelle()) {
    if (!(await verificaPermessi(c.handle, true))) continue;
    if (await apriDaPercorsoRelativo(c.handle, percorso)) return true;
  }
  return false;
}

/**
 * Cerca un file locale a partire dal suo percorso relativo in tutte le cartelle collegate.
 */
export async function recuperaFileDaPercorsoInTutte(percorso: string): Promise<File | null> {
  for (const c of await elencoCartelle()) {
    if (!(await verificaPermessi(c.handle, false))) continue;
    const file = await ottieniFileDaPercorso(c.handle, percorso);
    if (file) return file;
  }
  return null;
}

/**
 * Rinomina fisicamente un file nella cartella locale in cui si trova il percorso originale.
 * Crea il nuovo file con il nome specificato e rimuove il vecchio file.
 * Restituisce il nuovo percorso relativo aggiornato.
 */
export async function rinominaFileNelPercorso(
  percorsoRelativoOriginale: string,
  nuovoNomeFile: string,
): Promise<{ success: boolean; nuovoPercorso?: string; errore?: string }> {
  try {
    const parti = percorsoRelativoOriginale
      .replace(/^(\.\.\/|\.\/)+/, "")
      .split("/")
      .filter(Boolean);
    const vecchioNome = parti[parti.length - 1];
    if (!vecchioNome) return { success: false, errore: "Percorso non valido" };

    const cartelle = await elencoCartelle();

    for (const c of cartelle) {
      if (!(await verificaPermessi(c.handle, true))) continue;

      try {
        let dir = c.handle;
        for (let i = 0; i < parti.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parti[i]!);
        }

        // Trova il file originale
        const vecchioHandle = await dir.getFileHandle(vecchioNome);
        const file = await vecchioHandle.getFile();

        // Scrive il nuovo file rinominato nella stessa identica cartella
        const nuovoHandle = await dir.getFileHandle(nuovoNomeFile, { create: true });
        const writer = await nuovoHandle.createWritable();
        await writer.write(file);
        await writer.close();

        // Rimuove il vecchio file se ha un nome diverso
        if (vecchioNome !== nuovoNomeFile) {
          try {
            await dir.removeEntry(vecchioNome);
          } catch {
            /* Se fallisce la rimozione, il nuovo file è comunque pronto */
          }
        }

        const percorsoPadre = parti.slice(0, parti.length - 1).join("/");
        const nuovoPercorso = percorsoPadre ? `${percorsoPadre}/${nuovoNomeFile}` : nuovoNomeFile;

        return { success: true, nuovoPercorso };
      } catch {
        // Non trovato in questa cartella, tenta la successiva
        continue;
      }
    }

    return { success: false, errore: "File originario non trovato nelle cartelle collegate o permessi mancanti" };
  } catch (e) {
    return { success: false, errore: String(e) };
  }
}

export type RisoluzioneDocumento = {
  url: string | null;
  nomeFile: string;
  isPdf: boolean;
  sorgente: "cloud" | "locale" | "non_trovato";
  percorsoOriginale: string;
};

/**
 * Risolve la sorgente di un attestato (Cloud Supabase Storage o Archivio Locale su disco).
 */
export async function risolviDocumentoAttestato(
  percorso: string | null | undefined,
): Promise<RisoluzioneDocumento> {
  const percorsoPulito = (percorso || "").trim();
  const nomeFile = percorsoPulito.split("/").pop() || percorsoPulito;
  const isPdf = nomeFile.toLowerCase().endsWith(".pdf") || percorsoPulito.toLowerCase().includes(".pdf");

  if (!percorsoPulito) {
    return {
      url: null,
      nomeFile: "",
      isPdf: false,
      sorgente: "non_trovato",
      percorsoOriginale: "",
    };
  }

  // 1. Prova Cloud Storage
  if (
    percorsoPulito.startsWith("Archivio Attestati") ||
    percorsoPulito.startsWith("Coda/") ||
    !percorsoPulito.includes("/")
  ) {
    try {
      const { data } = await supabase.storage.from("attestati").createSignedUrl(percorsoPulito, 3600);
      if (data?.signedUrl) {
        return {
          url: data.signedUrl,
          nomeFile,
          isPdf,
          sorgente: "cloud",
          percorsoOriginale: percorsoPulito,
        };
      }
    } catch {
      /* Continua su archivio locale */
    }
  }

  // 2. Prova archivio locale su PC
  try {
    const fileLocale = await recuperaFileDaPercorsoInTutte(percorsoPulito);
    if (fileLocale) {
      return {
        url: URL.createObjectURL(fileLocale),
        nomeFile: fileLocale.name,
        isPdf: fileLocale.type === "application/pdf" || fileLocale.name.toLowerCase().endsWith(".pdf"),
        sorgente: "locale",
        percorsoOriginale: percorsoPulito,
      };
    }
  } catch {
    /* Fallback non trovato */
  }

  return {
    url: null,
    nomeFile,
    isPdf,
    sorgente: "non_trovato",
    percorsoOriginale: percorsoPulito,
  };
}

export function getUltimaCartella(): string | null {
  try {
    return localStorage.getItem(CHIAVE_ULTIMA);
  } catch {
    return null;
  }
}

export function setUltimaCartella(nome: string): void {
  try {
    localStorage.setItem(CHIAVE_ULTIMA, nome);
  } catch {
    /* ignora */
  }
}

/** Salva nella cartella scelta (per nome) e la ricorda come ultima usata. */
export async function salvaInCartellaScelta(
  nomeCartella: string | null,
  file: File,
  nomeFile: string,
  sottocartella?: string,
): Promise<string | null> {
  const tutte = await elencoCartelle();
  const c = tutte.find((x) => x.nome === nomeCartella) ?? tutte[0];
  if (!c) return null;
  if (!(await verificaPermessi(c.handle, true))) return null;
  await scriviInCartella(c.handle, file, nomeFile, sottocartella);
  setUltimaCartella(c.nome);
  return c.nome;
}

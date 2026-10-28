/*
 * File:          cartelle-multiple.ts
 * Percorso:      src/lib/api/cartelle-multiple.ts
 * Data creazione: 2026-10-27
 * Revisioni:
 *   - Rev 1 (2026-10-27 21:05): Gestione di più cartelle archivio (principale + aggiuntive),
 *     ricerca su tutte, apertura da percorso su tutte, salvataggio con memoria dell'ultima cartella.
 *   - Rev 2 (2026-10-28 10:00): Aggiunte funzioni per il recupero diretto del file locale e
 *     risoluzione unificata del documento (Cloud / Locale) per la visualizzazione dell'attestato.
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
 * Recupera l'oggetto File cercando prima per percorso relativo esatto,
 * e se non trovato cercando ricorsivamente per nome file in tutte le cartelle collegate.
 */
export async function recuperaFileDaPercorsoInTutte(percorso: string): Promise<File | null> {
  const cartelle = await elencoCartelle();
  if (cartelle.length === 0) return null;

  // 1. Tentativo con percorso relativo esatto
  for (const c of cartelle) {
    if (!(await verificaPermessi(c.handle, false))) continue;
    const file = await ottieniFileDaPercorso(c.handle, percorso);
    if (file) return file;
  }

  // 2. Tentativo per nome file ricorsivo
  const nomeFile = percorso.replace(/^.*[\\/]/, "").trim();
  if (!nomeFile) return null;

  for (const c of cartelle) {
    if (!(await verificaPermessi(c.handle, false))) continue;
    const trovati = await cercaFileRicorsivo(c.handle, nomeFile, "", [], 0, 5);
    const esatto = trovati.find((t) => t.nome.toLowerCase() === nomeFile.toLowerCase()) ?? trovati[0];
    if (esatto) {
      try {
        return await esatto.handle.getFile();
      } catch {
        /* ignora */
      }
    }
  }

  return null;
}

export type EsitoRisoluzioneDocumento = {
  url: string | null;
  nomeFile: string;
  isPdf: boolean;
  sorgente: "cloud" | "locale" | "non_trovato" | "mancante";
  percorsoOriginale: string;
};

/**
 * Risolve un percorso attestato provando prima lo storage Cloud,
 * e successivamente l'archivio locale su disco/rete del PC.
 */
export async function risolviDocumentoAttestato(percorso: string | null): Promise<EsitoRisoluzioneDocumento> {
  if (!percorso || !percorso.trim()) {
    return {
      url: null,
      nomeFile: "",
      isPdf: false,
      sorgente: "mancante",
      percorsoOriginale: "",
    };
  }

  const percorsoPulito = percorso.trim();
  const nomeFile = percorsoPulito.replace(/^.*[\\/]/, "");
  const isPdf = nomeFile.toLowerCase().endsWith(".pdf") || percorsoPulito.toLowerCase().includes(".pdf");

  // Se è già un URL completo http/https
  if (percorsoPulito.startsWith("http://") || percorsoPulito.startsWith("https://")) {
    return {
      url: percorsoPulito,
      nomeFile,
      isPdf,
      sorgente: "cloud",
      percorsoOriginale: percorsoPulito,
    };
  }

  // 1. Prova Cloud Storage (se il percorso punta allo storage Supabase)
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

/*
 * File:          cartelle-multiple.ts
 * Percorso:      src/lib/api/cartelle-multiple.ts
 * Data creazione: 2026-10-27
 * Revisioni:
 *   - Rev 1 (2026-10-27 21:05): Gestione cartelle archivio multiple, ricerca e apertura da percorso.
 *   - Rev 2 (2026-10-28 10:00): Risoluzione unificata del documento (Cloud / Disco locale).
 *   - Rev 3 (2026-10-28 10:05): Riesportata verificaPermessi per compatibilità import.
 *   - Rev 4 (2026-10-28 14:15): Funzione rinominaFileNelPercorso per rinomina fisica cartella origine.
 *   - Rev 5 (2026-10-28 14:35): Ripristino ricerca ricorsiva, rimozione prefisso radice e gestione percorso vuoto come «mancante».
 *   - Rev 6 (2026-10-29 13:25): Aggiunta duplicaFileNelPercorso (copia nella stessa cartella per «Sdoppia corso cumulativo»).
 *   - Rev 7 (2026-10-30 11:10): Apertura potenziata con fallback a ricerca ricorsiva per nome file ed esportazione apriFileLocale.
 */
import {
  getCartellaArchivio,
  verificaPermessi,
  cercaFileRicorsivo,
  apriDaPercorsoRelativo,
  ottieniFileDaPercorso,
  scriviInCartella,
  apriFileLocale,
  type FileTrovato,
} from "./cartella-locale";
export { verificaPermessi, apriFileLocale };
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

/** Scollega una cartella aggiuntiva. */
export async function rimuoviCartellaAggiuntiva(handle: FileSystemDirectoryHandle): Promise<void> {
  const lista = await leggiAggiuntive();
  const resto: FileSystemDirectoryHandle[] = [];
  for (const h of lista) if (!(await h.isSameEntry(handle))) resto.push(h);
  await scriviAggiuntive(resto);
}

/** Cerca in tutte le cartelle collegate. */
export async function cercaInTutteLeCartelle(chiave: string): Promise<FileTrovato[]> {
  const risultati: FileTrovato[] = [];
  for (const c of await elencoCartelle()) {
    if (!(await verificaPermessi(c.handle, true))) continue;
    const trovati = await cercaFileRicorsivo(c.handle, chiave);
    for (const f of trovati) risultati.push({ ...f, cartella: c.nome });
  }
  return risultati.sort((a, b) => b.dataModifica.getTime() - a.dataModifica.getTime());
}

/** Prova ad aprire un percorso relativo in ciascuna cartella collegata, con fallback a ricerca per nome file. */
export async function apriDaPercorsoInTutte(percorso: string): Promise<boolean> {
  const cartelle = await elencoCartelle();
  if (cartelle.length === 0) return false;

  const percorsoNorm = percorso.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "").trim();
  const nomeFile = percorsoNorm.split("/").pop()?.trim() || "";

  // 1. Prova percorso relativo esatto
  for (const c of cartelle) {
    if (!(await verificaPermessi(c.handle, true))) continue;
    if (await apriDaPercorsoRelativo(c.handle, percorsoNorm)) return true;
  }

  // 2. Fallback: cerca ricorsivamente il file per nome nella cartella
  if (nomeFile) {
    for (const c of cartelle) {
      if (!(await verificaPermessi(c.handle, true))) continue;
      const trovati = await cercaFileRicorsivo(c.handle, nomeFile, "", [], 0, 8);
      const corrispondenza = trovati.find((t) => t.nome.toLowerCase() === nomeFile.toLowerCase()) ?? trovati[0];
      if (corrispondenza) {
        await apriFileLocale(corrispondenza.handle);
        return true;
      }
    }
  }

  return false;
}

/**
 * Cerca un file locale:
 * 1. Prova percorso relativo esatto
 * 2. Prova togliendo il prefisso della cartella radice se coincide col nome della cartella
 * 3. Ricerca ricorsiva per nome file nelle sottocartelle
 */
export async function recuperaFileDaPercorsoInTutte(percorso: string): Promise<File | null> {
  const cartelle = await elencoCartelle();
  if (cartelle.length === 0) return null;

  const percorsoNorm = percorso.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "").trim();
  const nomeFile = percorsoNorm.split("/").pop()?.trim() || "";

  // 1 & 2. Tentativo con percorso relativo esatto (e senza prefisso nome cartella)
  for (const c of cartelle) {
    if (!(await verificaPermessi(c.handle, true))) continue;

    let f = await ottieniFileDaPercorso(c.handle, percorsoNorm);
    if (f) return f;

    if (percorsoNorm.toLowerCase().startsWith(c.nome.toLowerCase() + "/")) {
      const relativoSenzaRadice = percorsoNorm.slice(c.nome.length + 1);
      f = await ottieniFileDaPercorso(c.handle, relativoSenzaRadice);
      if (f) return f;
    }
  }

  // 3. Ricerca ricorsiva per nome file come recupero sicuro
  if (nomeFile) {
    for (const c of cartelle) {
      if (!(await verificaPermessi(c.handle, true))) continue;
      const trovati = await cercaFileRicorsivo(c.handle, nomeFile, "", [], 0, 8);
      const corrispondenza = trovati.find((t) => t.nome.toLowerCase() === nomeFile.toLowerCase()) ?? trovati[0];
      if (corrispondenza) {
        try {
          return await corrispondenza.handle.getFile();
        } catch {
          /* continua */
        }
      }
    }
  }

  return null;
}

/**
 * Crea una copia fisica del file nella stessa cartella di origine (l'originale resta intatto).
 */
export async function duplicaFileNelPercorso(
  percorsoRelativoOriginale: string,
  nuovoNomeFile: string,
): Promise<{ success: boolean; nuovoPercorso?: string; errore?: string }> {
  return rinominaFileNelPercorso(percorsoRelativoOriginale, nuovoNomeFile, true);
}

/**
 * Rinomina fisicamente un file nella cartella locale di origine.
 */
export async function rinominaFileNelPercorso(
  percorsoRelativoOriginale: string,
  nuovoNomeFile: string,
  mantieniOriginale = false,
): Promise<{ success: boolean; nuovoPercorso?: string; errore?: string }> {
  try {
    const percorsoNorm = percorsoRelativoOriginale.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "");
    const parti = percorsoNorm.split("/").filter(Boolean);
    const vecchioNome = parti[parti.length - 1];
    if (!vecchioNome) return { success: false, errore: "Percorso non valido" };

    const cartelle = await elencoCartelle();

    for (const c of cartelle) {
      if (!(await verificaPermessi(c.handle, true))) continue;

      let dir: FileSystemDirectoryHandle = c.handle;
      const sottocartelle = parti.slice(0, -1);

      if (sottocartelle.length > 0 && sottocartelle[0]?.toLowerCase() === c.nome.toLowerCase()) {
        sottocartelle.shift();
      }

      let trovata = true;
      for (const sotto of sottocartelle) {
        try {
          dir = await dir.getDirectoryHandle(sotto);
        } catch {
          trovata = false;
          break;
        }
      }

      if (!trovata) continue;

      try {
        const fileOrigHandle = await dir.getFileHandle(vecchioNome);
        const fileOrig = await fileOrigHandle.getFile();

        const nuovoHandle = await dir.getFileHandle(nuovoNomeFile, { create: true });
        const writable = await nuovoHandle.createWritable();
        await writable.write(fileOrig);
        await writable.close();

        if (!mantieniOriginale) {
          const dirQualsiasi = dir as unknown as { removeEntry?: (n: string) => Promise<void> };
          if (dirQualsiasi.removeEntry) {
            await dirQualsiasi.removeEntry(vecchioNome);
          }
        }

        const percorsoAggiornato = sottocartelle.length > 0
          ? `${sottocartelle.join("/")}/${nuovoNomeFile}`
          : nuovoNomeFile;

        return { success: true, nuovoPercorso: percorsoAggiornato };
      } catch {
        // Continua sulla cartella successiva
      }
    }

    return { success: false, errore: "File non trovato nella cartella locale collegata per la rinomina" };
  } catch (e) {
    return { success: false, errore: String(e) };
  }
}

export type RisoluzioneDocumento = {
  url: string | null;
  nomeFile: string;
  isPdf: boolean;
  sorgente: "cloud" | "locale" | "non_trovato" | "mancante";
  percorsoOriginale: string;
};

/**
 * Risolve la sorgente di un attestato (Cloud Supabase Storage, Archivio Locale o mancante).
 */
export async function risolviDocumentoAttestato(
  percorso: string | null | undefined,
): Promise<RisoluzioneDocumento> {
  const percorsoPulito = (percorso || "").trim();
  const nomeFile = percorsoPulito.replace(/\\/g, "/").split("/").pop() || percorsoPulito;
  const isPdf = nomeFile.toLowerCase().endsWith(".pdf") || percorsoPulito.toLowerCase().includes(".pdf");

  if (!percorsoPulito) {
    return {
      url: null,
      nomeFile: "",
      isPdf: false,
      sorgente: "mancante",
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

/** Salva il file nella cartella specificata o nella principale. */
export async function salvaInCartellaSpecifica(
  nomeCartella: string | undefined,
  file: File,
  nomeFile: string,
  sottocartella?: string,
): Promise<boolean> {
  const cartelle = await elencoCartelle();
  if (cartelle.length === 0) return false;

  const target = nomeCartella
    ? cartelle.find((c) => c.nome.toLowerCase() === nomeCartella.toLowerCase()) || cartelle[0]
    : cartelle[0];

  if (!target) return false;
  if (!(await verificaPermessi(target.handle, true))) return false;

  const salvato = await scriviInCartella(target.handle, file, nomeFile, sottocartella);
  if (salvato) {
    try {
      localStorage.setItem(CHIAVE_ULTIMA, target.nome);
    } catch {
      // Ignora errori di storage
    }
  }
  return salvato;
}

export function getUltimaCartellaSalvataggio(): string | null {
  try {
    return localStorage.getItem(CHIAVE_ULTIMA);
  } catch {
    return null;
  }
}

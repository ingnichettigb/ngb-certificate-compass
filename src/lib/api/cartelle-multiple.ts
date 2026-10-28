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

/** Prova ad aprire un percorso relativo in ciascuna cartella collegata. */
export async function apriDaPercorsoInTutte(percorso: string): Promise<boolean> {
  for (const c of await elencoCartelle()) {
    if (!(await verificaPermessi(c.handle, true))) continue;
    if (await apriDaPercorsoRelativo(c.handle, percorso)) return true;
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
    if (!(await verificaPermessi(c.handle, false))) continue;

    let f = await ottieniFileDaPercorso(c.handle, percorsoNorm);
    if (f) return f;

    // Se il percorso inizia con il nome della cartella collegata, rimuovilo
    if (percorsoNorm.toLowerCase().startsWith(c.nome.toLowerCase() + "/")) {
      const relativoSenzaRadice = percorsoNorm.slice(c.nome.length + 1);
      f = await ottieniFileDaPercorso(c.handle, relativoSenzaRadice);
      if (f) return f;
    }
  }

  // 3. Ricerca ricorsiva per nome file come recupero sicuro
  if (nomeFile) {
    for (const c of cartelle) {
      if (!(await verificaPermessi(c.handle, false))) continue;
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
 * Rinomina fisicamente un file nella cartella locale di origine.
 */
export async function rinominaFileNelPercorso(
  percorsoRelativoOriginale: string,
  nuovoNomeFile: string,
): Promise<{ success: boolean; nuovoPercorso?: string; errore?: string }> {
  try {
    const percorsoNorm = percorsoRelativoOriginale.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "");
    const parti = percorsoNorm.split("/").filter(Boolean);
    const vecchioNome = parti[parti.length - 1];
    if (!vecchioNome) return { success: false, errore: "Percorso non valido" };

    const cartelle = await elencoCartelle();

    for (const c of cartelle) {
      if (!(await verificaPermessi(c.handle, true))) continue;

      // Prova sia il percorso completo sia senza prefisso radice
      const percorsiDaProvare = [parti];
      if (parti[0] && parti[0].toLowerCase() === c.nome.toLowerCase()) {
        percorsiDaProvare.push(parti.slice(1));
      }

      for (const p of percorsiDaProvare) {
        try {
          let dir = c.handle;
          for (let i = 0; i < p.length - 1; i++) {
            dir = await dir.getDirectoryHandle(p[i]!);
          }

          const vecchioHandle = await dir.getFileHandle(vecchioNome);
          const file = await vecchioHandle.getFile();

          const nuovoHandle = await dir.getFileHandle(nuovoNomeFile, { create: true });
          const writer = await nuovoHandle.createWritable();
          await writer.write(file);
          await writer.close();

          if (vecchioNome !== nuovoNomeFile) {
            try {
              await dir.removeEntry(vecchioNome);
            } catch {
              /* ignora */
            }
          }

          const padre = p.slice(0, p.length - 1).join("/");
          const nuovoPercorso = padre ? `${padre}/${nuovoNomeFile}` : nuovoNomeFile;
          return { success: true, nuovoPercorso };
        } catch {
          continue;
        }
      }
    }

    return { success: false, errore: "File originario non trovato o permessi cartella mancanti" };
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
  const nomeFile = percorsoPulito.split("/").pop() || percorsoPulito;
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

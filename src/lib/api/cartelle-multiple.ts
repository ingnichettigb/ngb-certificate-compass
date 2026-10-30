/*
 * File:          cartelle-multiple.ts
 * Percorso:      src/lib/api/cartelle-multiple.ts
 * Data creazione: 2026-10-27
 * Revisioni:
 *   - Rev 1 (2026-10-27 21:00): Creazione modulo gestione multi-cartella archivio attestati.
 *   - Rev 2 (2026-10-27 22:30): Funzioni elencoCartelle, aggiungiCartella, rimuoviCartella, rinominaCartella.
 *   - Rev 3 (2026-10-27 22:45): Cerca in tutte le cartelle con ordinamento decrescente data modifica.
 *   - Rev 4 (2026-10-28 14:15): Funzione rinominaFileNelPercorso per rinomina fisica cartella origine.
 *   - Rev 5 (2026-10-28 14:35): Ripristino ricerca ricorsiva, rimozione prefisso radice e gestione percorso vuoto come «mancante».
 *   - Rev 6 (2026-10-29 13:25): Aggiunta duplicaFileNelPercorso (copia nella stessa cartella per «Sdoppia corso cumulativo»).
 *   - Rev 7 (2026-10-30 11:10): Apertura potenziata con fallback a ricerca ricorsiva per nome file ed esportazione apriFileLocale.
 *   - Rev 8 (2026-10-30 11:35): Ripristinati getUltimaCartella, setUltimaCartella e salvaInCartellaScelta.
 *   - Rev 9 (2026-10-30 19:30): apriDaPercorsoInTutte restituisce l'esito dettagliato (nessuna cartella, permesso,
 *     non trovato, bloccato); permesso in sola lettura; apertura solo del file con nome identico, file simili
 *     restituiti a parte; rilevamento blocco popup (apriFileConControllo).
 *   - Rev 10 (2026-10-30 20:30): Esiti con motivo per rinomina/copia (EsitoRinomina) e per il salvataggio locale
 *     (salvaInCartellaSceltaEsito); ricerca in sola lettura; evento di cambio cartelle.
 */
import {
  getCartellaArchivio,
  cercaFileRicorsivo,
  verificaPermessi,
  ottieniFileDaPercorso,
  scriviInCartella,
  apriFileLocale,
  notificaCartelleCambiate,
  type FileTrovato,
} from "./cartella-locale";
export { verificaPermessi, apriFileLocale };
import { supabase } from "@/integrations/supabase/client";

const DB_NOME = "app_archivio_cartelle";
const STORE_NOME = "cartelle_collegate";
const CHIAVE_ULTIMA = "ultima_cartella_salvataggio";

export type CartellaCollegata = {
  id: string;
  nome: string;
  /** Alias di nome (compatibilità) */
  name: string;
  principale?: boolean;
  handle: FileSystemDirectoryHandle;
  dataAggiunta: Date;
};

type RecordCartellaDb = {
  id: string;
  nome: string;
  handle: FileSystemDirectoryHandle;
  dataAggiunta: string;
};

function apriDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NOME)) {
        db.createObjectStore(STORE_NOME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function elencoCartelle(): Promise<CartellaCollegata[]> {
  const lista: CartellaCollegata[] = [];

  const base = await getCartellaArchivio(false);
  if (base) {
    lista.push({
      id: "principale",
      nome: base.name,
      name: base.name,
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
        handle: r.handle,
        dataAggiunta: new Date(r.dataAggiunta),
      });
    }
  } catch {
    /* fallback alla sola cartella base */
  }

  return lista;
}

export async function aggiungiCartella(handleIn?: FileSystemDirectoryHandle, nomePersonalizzato?: string): Promise<CartellaCollegata> {
  const handle =
    handleIn ??
    (await (window as unknown as { showDirectoryPicker: (o?: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ mode: "readwrite" }));
  const db = await apriDb();
  const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: RecordCartellaDb = {
    id,
    nome: nomePersonalizzato?.trim() || handle.name,
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
    handle: record.handle,
    dataAggiunta: new Date(record.dataAggiunta),
  };
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

export type MotivoApertura = "ok" | "nessuna_cartella" | "permesso" | "non_trovato" | "bloccato";

export type EsitoApertura = {
  motivo: MotivoApertura;
  nomeFile: string;
  /** Nomi delle cartelle in cui la ricerca è stata effettivamente eseguita. */
  cartelleControllate: string[];
  /** Nomi delle cartelle per cui il browser non ha concesso l'accesso. */
  cartelleSenzaPermesso: string[];
  /** File con nome simile (non identico): mai aperti automaticamente. */
  simili: FileTrovato[];
};

function nomeConfrontabile(n: string): string {
  return n.normalize("NFC").trim().toLowerCase();
}

/** Apre un file in una nuova scheda. Restituisce false se il browser blocca la finestra. */
export async function apriFileConControllo(handle: FileSystemFileHandle): Promise<boolean> {
  const file = await handle.getFile();
  const url = URL.createObjectURL(file);
  // Senza "noopener" window.open restituisce il riferimento: serve per rilevare il blocco popup.
  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    return false;
  }
  try {
    w.opener = null;
  } catch {
    /* ignora */
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

/**
 * Prova ad aprire un percorso relativo in ciascuna cartella collegata, con fallback a ricerca per nome file.
 * Apre solo il file con nome identico; eventuali file simili vengono restituiti in `simili`.
 */
export async function apriDaPercorsoInTutte(percorso: string): Promise<EsitoApertura> {
  const percorsoNorm = percorso.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "").trim();
  const nomeFile = percorsoNorm.split("/").pop()?.trim() || "";
  const esito: EsitoApertura = {
    motivo: "non_trovato",
    nomeFile,
    cartelleControllate: [],
    cartelleSenzaPermesso: [],
    simili: [],
  };

  const cartelle = await elencoCartelle();
  if (cartelle.length === 0) return { ...esito, motivo: "nessuna_cartella" };

  // Permessi richiesti subito (in sola lettura), così il prompt del browser parte dal clic dell'utente.
  const autorizzate: CartellaCollegata[] = [];
  for (const c of cartelle) {
    if (await verificaPermessi(c.handle, true, "read")) autorizzate.push(c);
    else esito.cartelleSenzaPermesso.push(c.nome);
  }
  esito.cartelleControllate = autorizzate.map((c) => c.nome);
  if (autorizzate.length === 0) return { ...esito, motivo: "permesso" };

  // 1. Percorso relativo esatto
  for (const c of autorizzate) {
    const h = await trovaHandleDaPercorso(c.handle, percorsoNorm);
    if (h) return { ...esito, motivo: (await apriFileConControllo(h)) ? "ok" : "bloccato" };
  }

  // 2. Fallback: stesso nome file in qualunque sottocartella
  if (nomeFile) {
    const cercato = nomeConfrontabile(nomeFile);
    for (const c of autorizzate) {
      const trovati = await cercaFileRicorsivo(c.handle, nomeFile, "", [], 0, 8);
      const identico = trovati.find((t) => nomeConfrontabile(t.nome) === cercato);
      if (identico) return { ...esito, motivo: (await apriFileConControllo(identico.handle)) ? "ok" : "bloccato" };
      for (const t of trovati) if (esito.simili.length < 5) esito.simili.push({ ...t, cartella: c.nome });
    }
  }

  return esito;
}

/** Restituisce l'handle del file dato un percorso relativo (con gli stessi accorgimenti di ottieniFileDaPercorso). */
async function trovaHandleDaPercorso(
  root: FileSystemDirectoryHandle,
  percorsoRelativo: string,
): Promise<FileSystemFileHandle | null> {
  try {
    let parti = percorsoRelativo.split("/").filter(Boolean);
    if (parti.length > 0 && parti[0]?.toLowerCase() === root.name.toLowerCase()) parti = parti.slice(1);
    let dir = root;
    for (let i = 0; i < parti.length - 1; i++) {
      const sotto = parti[i];
      if (sotto) dir = await dir.getDirectoryHandle(sotto);
    }
    const nome = parti[parti.length - 1];
    return nome ? await dir.getFileHandle(nome) : null;
  } catch {
    return null;
  }
}

/** Restituisce il File locale cercando il percorso o il nome file in tutte le cartelle. */
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
      const corrispondenza = trovati.find((t) => nomeConfrontabile(t.nome) === nomeConfrontabile(nomeFile));
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

export type MotivoRinomina = "nessuna_cartella" | "permesso" | "non_trovato" | "scrittura" | "percorso";

export type EsitoRinomina = {
  success: boolean;
  nuovoPercorso?: string;
  /** Testo già pronto da mostrare all'utente. */
  errore?: string;
  /** Causa dell'insuccesso (assente se success). */
  motivo?: MotivoRinomina;
  /** Cartelle per cui il browser non ha concesso il permesso di scrittura. */
  cartelleSenzaPermesso?: string[];
};

/** Rinomina o copia un file nella cartella locale di origine. */
export async function rinominaFileNelPercorso(
  percorsoVecchio: string,
  nuovoNomeFile: string,
  mantieniOriginale = false,
): Promise<EsitoRinomina> {
  try {
    const percorsoNorm = percorsoVecchio.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "").trim();
    const parti = percorsoNorm.split("/").filter(Boolean);
    if (parti.length === 0) {
      return { success: false, motivo: "percorso", errore: "Percorso non specificato" };
    }

    const vecchioNome = parti[parti.length - 1];
    if (!vecchioNome) {
      return { success: false, motivo: "percorso", errore: "Nome file originario non valido" };
    }

    const cartelle = await elencoCartelle();
    if (cartelle.length === 0) {
      return {
        success: false,
        motivo: "nessuna_cartella",
        errore: "Nessuna cartella collegata per la rinomina fisica del file: collegala e riprova.",
      };
    }

    const senzaPermesso: string[] = [];
    const controllate: string[] = [];
    let erroreScrittura: string | null = null;

    for (const c of cartelle) {
      if (!(await verificaPermessi(c.handle, true))) {
        senzaPermesso.push(c.nome);
        continue;
      }
      controllate.push(c.nome);

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

      let fileOrigHandle: FileSystemFileHandle;
      try {
        fileOrigHandle = await dir.getFileHandle(vecchioNome);
      } catch {
        continue; // il file non è in questa cartella
      }

      try {
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
      } catch (e) {
        erroreScrittura = (e as Error)?.message || String(e);
      }
    }

    if (erroreScrittura) {
      return {
        success: false,
        motivo: "scrittura",
        errore: `Il file è stato trovato ma la scrittura non è riuscita: ${erroreScrittura}`,
      };
    }
    if (senzaPermesso.length > 0) {
      const elenco = senzaPermesso.join(", ");
      return {
        success: false,
        motivo: "permesso",
        cartelleSenzaPermesso: senzaPermesso,
        errore:
          controllate.length === 0
            ? `Permesso di scrittura negato per la cartella: ${elenco}. Autorizza e riprova.`
            : `File non trovato nelle cartelle autorizzate e manca il permesso di scrittura per: ${elenco}. Autorizza e riprova.`,
      };
    }
    return {
      success: false,
      motivo: "non_trovato",
      errore: `File «${vecchioNome}» non trovato nelle cartelle collegate (${controllate.join(", ")}).`,
    };
  } catch (e) {
    return { success: false, motivo: "scrittura", errore: String(e) };
  }
}

export async function duplicaFileNelPercorso(
  percorsoVecchio: string,
  nuovoNomeFile: string,
): Promise<EsitoRinomina> {
  return rinominaFileNelPercorso(percorsoVecchio, nuovoNomeFile, true);
}

export type RisoluzioneDocumento = {
  url: string | null;
  tipo: "locale" | "storage" | "mancante";
  isPdf: boolean;
  nomeFile: string;
  percorsoOriginale: string;
  /** Alias compatibilità: "locale" | "storage" | "non_trovato" */
  sorgente?: "locale" | "storage" | "non_trovato";
};

export async function risolviDocumentoAttestato(
  percorso: string | null | undefined,
): Promise<RisoluzioneDocumento> {
  const r = await risolviInterno(percorso);
  return { ...r, sorgente: r.tipo === "mancante" ? "non_trovato" : r.tipo };
}

async function risolviInterno(
  percorso: string | null | undefined,
): Promise<RisoluzioneDocumento> {
  const percorsoPulito = (percorso || "").trim();
  const nomeFile = percorsoPulito.replace(/\\/g, "/").split("/").pop() || percorsoPulito;
  const isPdf = nomeFile.toLowerCase().endsWith(".pdf") || percorsoPulito.toLowerCase().includes(".pdf");

  if (!percorsoPulito) {
    return {
      url: null,
      tipo: "mancante",
      isPdf: false,
      nomeFile: "",
      percorsoOriginale: "",
    };
  }

  if (percorsoPulito.startsWith("Archivio Attestati/") || percorsoPulito.startsWith("Coda/")) {
    try {
      const { data } = await supabase.storage.from("attestati").createSignedUrl(percorsoPulito, 3600);
      if (data?.signedUrl) {
        return {
          url: data.signedUrl,
          tipo: "storage",
          isPdf,
          nomeFile,
          percorsoOriginale: percorsoPulito,
        };
      }
    } catch {
      /* Continua con il fallback locale */
    }
  }

  const fileLocale = await recuperaFileDaPercorsoInTutte(percorsoPulito);
  if (fileLocale) {
    const urlBlob = URL.createObjectURL(fileLocale);
    return {
      url: urlBlob,
      tipo: "locale",
      isPdf,
      nomeFile,
      percorsoOriginale: percorsoPulito,
    };
  }

  return {
    url: null,
    tipo: "mancante",
    isPdf,
    nomeFile,
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

export const getUltimaCartellaSalvataggio = getUltimaCartella;

export type EsitoSalvataggioLocale =
  | { esito: "ok"; cartella: string }
  | { esito: "nessuna_cartella" }
  | { esito: "permesso"; cartelle: string[] };

/** Salva il file nella cartella scelta e dice esplicitamente perché, se non ci riesce. */
export async function salvaInCartellaSceltaEsito(
  nomeCartella: string | null | undefined,
  file: File,
  nomeFile: string,
  sottocartella?: string,
): Promise<EsitoSalvataggioLocale> {
  const tutte = await elencoCartelle();
  const c = tutte.find((x) => x.nome.toLowerCase() === (nomeCartella || "").toLowerCase()) ?? tutte[0];
  if (!c) return { esito: "nessuna_cartella" };
  if (!(await verificaPermessi(c.handle, true))) return { esito: "permesso", cartelle: [c.nome] };
  await scriviInCartella(c.handle, file, nomeFile, sottocartella);
  setUltimaCartella(c.nome);
  return { esito: "ok", cartella: c.nome };
}

/**
 * Chiede subito il permesso di scrittura per la cartella di destinazione (stessa scelta di salvaInCartellaSceltaEsito).
 * Va chiamata da un clic, PRIMA di operazioni lunghe (es. il caricamento online): dopo qualche secondo il browser
 * non accetta più la richiesta e il salvataggio locale fallirebbe anche se l'utente avrebbe acconsentito.
 */
export async function preautorizzaCartellaScelta(nomeCartella: string | null | undefined): Promise<boolean> {
  const tutte = await elencoCartelle();
  const c = tutte.find((x) => x.nome.toLowerCase() === (nomeCartella || "").toLowerCase()) ?? tutte[0];
  if (!c) return false;
  return verificaPermessi(c.handle, true);
}

/** Versione storica: restituisce il nome cartella oppure null se non è stato possibile salvare. */
export async function salvaInCartellaScelta(
  nomeCartella: string | null | undefined,
  file: File,
  nomeFile: string,
  sottocartella?: string,
): Promise<string | null> {
  const r = await salvaInCartellaSceltaEsito(nomeCartella, file, nomeFile, sottocartella);
  return r.esito === "ok" ? r.cartella : null;
}

export async function salvaInCartellaSpecifica(
  nomeCartella: string | undefined,
  file: File,
  nomeFile: string,
  sottocartella?: string,
): Promise<boolean> {
  const res = await salvaInCartellaScelta(nomeCartella, file, nomeFile, sottocartella);
  return Boolean(res);
}

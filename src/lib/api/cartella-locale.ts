/*
 * File:      cartella-locale.ts
 * Percorso:  src/lib/api/cartella-locale.ts
 * Copia locale tramite File System Access API.
 */
import { CARTELLA_ARCHIVIO } from "./documenti";

type DirHandle = {
  getDirectoryHandle: (n: string, o?: { create?: boolean }) => Promise<DirHandle>;
  getFileHandle: (
    n: string,
    o?: { create?: boolean },
  ) => Promise<{
    createWritable: () => Promise<{
      write: (b: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

let cartellaLocale: DirHandle | null = null;

export function supportaCartellaLocale() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function scegliCartellaLocale(): Promise<DirHandle | null> {
  if (cartellaLocale) return cartellaLocale;
  const w = window as unknown as {
    showDirectoryPicker?: (o?: unknown) => Promise<DirHandle>;
  };
  if (!w.showDirectoryPicker) return null;
  const scelta = await w.showDirectoryPicker({
    id: "archivio-attestati",
    mode: "readwrite",
    startIn: "documents",
  });
  // Se l'utente sceglie la cartella Documenti, usa/crea la sottocartella dedicata.
  const nomeScelta = (scelta as unknown as { name?: string }).name ?? "";
  cartellaLocale =
    nomeScelta === CARTELLA_ARCHIVIO
      ? scelta
      : await scelta.getDirectoryHandle(CARTELLA_ARCHIVIO, { create: true });
  return cartellaLocale;
}

/** Scrive il PDF nella cartella locale; chiede conferma se il file esiste già. */
export async function salvaInLocale(file: File, nomeFile: string, sottocartella: string) {
  const root = await scegliCartellaLocale();
  if (!root) throw new Error("Cartella non disponibile");
  const dir = await root.getDirectoryHandle(sottocartella, { create: true });
  let esiste = false;
  try {
    await dir.getFileHandle(nomeFile);
    esiste = true;
  } catch {
    esiste = false;
  }
  if (esiste && !window.confirm(`"${nomeFile}" esiste già nella cartella locale. Sovrascrivere?`))
    return false;
  const handle = await dir.getFileHandle(nomeFile, { create: true });
  const w = await handle.createWritable();
  await w.write(file);
  await w.close();
  return true;
}

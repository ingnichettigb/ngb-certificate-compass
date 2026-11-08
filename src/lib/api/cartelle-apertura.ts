/*
 * File:      cartelle-apertura.ts
 * Percorso:  src/lib/api/cartelle-apertura.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da cartelle-multiple.ts: apertura e recupero dei file dal percorso registrato. Nessun cambio di comportamento.
 */
import { cercaFileRicorsivo, verificaPermessi, ottieniFileDaPercorso } from "./cartella-locale";
import type { FileTrovato } from "./cartella-locale";
import { elencoCartelle } from "./cartelle-archivio";
import type { CartellaCollegata } from "./cartelle-archivio";

export type MotivoApertura = "ok" | "nessuna_cartella" | "permesso" | "non_trovato" | "bloccato";

export type EsitoApertura = {
  motivo: MotivoApertura;
  nomeFile: string;
  cartelleControllate: string[];
  cartelleSenzaPermesso: string[];
  simili: FileTrovato[];
};

function nomeConfrontabile(n: string): string {
  return n.normalize("NFC").trim().toLowerCase();
}

/** Apre un file in una nuova scheda. Restituisce false se il browser blocca la finestra. */
export async function apriFileConControllo(handle: FileSystemFileHandle): Promise<boolean> {
  const file = await handle.getFile();
  const url = URL.createObjectURL(file);
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

export async function recuperaFileDaPercorsoInTutte(percorso: string): Promise<File | null> {
  const cartelle = await elencoCartelle();
  if (cartelle.length === 0) return null;

  const percorsoNorm = percorso.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "").trim();
  const nomeFile = percorsoNorm.split("/").pop()?.trim() || "";

  for (const c of cartelle) {
    if (!(await verificaPermessi(c.handle, false, "read"))) continue;

    let f = await ottieniFileDaPercorso(c.handle, percorsoNorm);
    if (f) return f;

    if (percorsoNorm.toLowerCase().startsWith(c.nome.toLowerCase() + "/")) {
      const relativoSenzaRadice = percorsoNorm.slice(c.nome.length + 1);
      f = await ottieniFileDaPercorso(c.handle, relativoSenzaRadice);
      if (f) return f;
    }
  }

  if (nomeFile) {
    for (const c of cartelle) {
      if (!(await verificaPermessi(c.handle, false, "read"))) continue;
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

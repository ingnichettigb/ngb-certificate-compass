/*
 * File:      cartelle-salvataggio.ts
 * Percorso:  src/lib/api/cartelle-salvataggio.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da cartelle-multiple.ts: ultima cartella usata e salvataggio nella cartella scelta. Nessun cambio di comportamento.
 */
import { verificaPermessi, scriviInCartella } from "./cartella-locale";
import { CHIAVE_ULTIMA, elencoCartelle } from "./cartelle-archivio";

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

export async function preautorizzaCartellaScelta(nomeCartella: string | null | undefined): Promise<boolean> {
  const tutte = await elencoCartelle();
  const c = tutte.find((x) => x.nome.toLowerCase() === (nomeCartella || "").toLowerCase()) ?? tutte[0];
  if (!c) return false;
  return verificaPermessi(c.handle, true);
}

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

/*
 * File: identita-ditta.ts
 * Percorso: src/lib/identita-ditta.ts
 * Data creazione: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 06:53 — Identità aziendale condivisa e copyright delle stampe.
 */
import type { DittaRecord } from "./api/ditta";

export const COPYRIGHT_STAMPE = "© corporateboostservice.eu";
export function nomeDitta(d?: Partial<DittaRecord> | null): string {
  return d?.ragione_sociale?.trim() || "Anagrafica ditta";
}
export function indirizzoDitta(d?: Partial<DittaRecord> | null): string {
  return [d?.indirizzo, [d?.cap, d?.comune].filter(Boolean).join(" "), d?.provincia && `(${d.provincia})`].filter(Boolean).join(" ");
}
export function logoDitta(d?: Partial<DittaRecord> | null): string | null {
  const logo = d?.logo_data_url;
  return typeof logo === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(logo) ? logo : null;
}
export function byteLogoDitta(d?: Partial<DittaRecord> | null): Uint8Array | null {
  const logo = logoDitta(d);
  if (!logo) return null;
  const base64 = logo.slice(logo.indexOf(",") + 1);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
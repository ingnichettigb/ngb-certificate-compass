/*
 * File:      ruoli-organigramma.ts
 * Percorso:  src/features/stampe/ruoli-organigramma.ts
 * Data creaz: 16/11/2026
 * Revisioni:
 *   rev 1 — 16/11/2026 — Registro antincendio, distribuzione DPI e custodia SDS sono ruoli del DB (ruoli_sicurezza):
 *            nomi fissi dei ruoli e collegamento delle voci dell'organigramma al ruolo (ruolo_id). Modulo senza dipendenze
 *            dal database: lo usano sia l'Organigramma A3 sia le Nomine.
 *
 * ATTENZIONE: i nomi dei ruoli NON devono contenere parole dei gruppi corsi (antincendio, preposto, primo soccorso,
 * defibrillatore, evacuazione, privacy…), altrimenti ruoliDelGruppo() li metterebbe in quei riquadri della tavola.
 */
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import type { VoceOrganigramma } from "@/lib/api/ditta";

export type ChiaveRuoloOrganigramma = "registro" | "dpi" | "sds";

export const RUOLI_ORGANIGRAMMA: Record<
  ChiaveRuoloOrganigramma,
  { nome: string; titolo: string; riconosce: RegExp }
> = {
  registro: {
    nome: "Incaricato registro controlli",
    titolo: "Addetti registro antincendio",
    riconosce: /registro\s+antincendio/i,
  },
  dpi: {
    nome: "Incaricato distribuzione DPI",
    titolo: "Responsabile distribuzione D.P.I.",
    riconosce: /\bd\.?\s?p\.?\s?i\b/i,
  },
  sds: {
    nome: "Incaricato custodia SDS",
    titolo: "Responsabile custodia SDS",
    riconosce: /\bsds\b/i,
  },
};

export const NOME_RUOLO_REGISTRO = RUOLI_ORGANIGRAMMA.registro.nome;
export const NOME_RUOLO_DPI = RUOLI_ORGANIGRAMMA.dpi.nome;
export const NOME_RUOLO_SDS = RUOLI_ORGANIGRAMMA.sds.nome;

/** Quale dei tre ruoli corrisponde al titolo di una voce (null = nessuno). */
export function chiaveRuoloDaTitolo(titolo: string): ChiaveRuoloOrganigramma | null {
  for (const chiave of ["registro", "dpi", "sds"] as const) {
    if (RUOLI_ORGANIGRAMMA[chiave].riconosce.test(titolo)) return chiave;
  }
  return null;
}

/** Una voce è «da DB» quando è azzurra (tipo ruolo, o senza tipo) ed è collegata a un ruolo. */
export const eVoceDaDb = (v: Pick<VoceOrganigramma, "tipo" | "ruolo_id">): boolean =>
  (v.tipo ?? "ruolo") === "ruolo" && !!v.ruolo_id;

/**
 * Collega ai ruoli del DB le tre voci fisse che non hanno ancora il ruolo_id (voci salvate prima della migrazione 0016).
 * Non tocca le voci già collegate né le note.
 */
export function collegaRuoliFissi(voci: VoceOrganigramma[], ruoli: RuoloSicurezza[]): VoceOrganigramma[] {
  if (!ruoli.length) return voci;
  return voci.map((v) => {
    if (v.ruolo_id || v.tipo === "nota") return v;
    const chiave = chiaveRuoloDaTitolo(v.titolo);
    if (!chiave) return v;
    const ruolo = ruoli.find((r) => r.nome === RUOLI_ORGANIGRAMMA[chiave].nome);
    return ruolo ? { ...v, tipo: "ruolo", ruolo_id: ruolo.id } : v;
  });
}

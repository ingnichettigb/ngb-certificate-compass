/*
 * File:      catalogo-ateco.ts
 * Percorso:  src/features/ditta/catalogo-ateco.ts
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 12:45 — Modulo condiviso per lettura catalogo ATECO, lookup per prefisso a 2 cifre e calcolo rischio aziendale per massima gravità.
 */
import { useQuery } from "@tanstack/react-query";
import { leggiTutto, sb } from "@/lib/api/client";
import type { LivelloRischio, CodiceAteco } from "./regole-ditta";

/** Chiave TanStack Query unica per il catalogo ATECO: impedisce collisioni tra schermate diverse. */
export const CHIAVE_CATALOGO_ATECO = ["catalogo_ateco"] as const;

export type VoceCatalogoAteco = {
  id: string;
  codice: string;
  descrizione: string;
  rischio: LivelloRischio;
  versione_ateco?: string;
  ordine?: number;
};

export const GRAVITA_RISCHIO: Record<LivelloRischio, number> = {
  basso: 1,
  medio: 2,
  alto: 3,
};

/** Caricamento del catalogo ATECO con cache condivisa tra la scheda Ditta e le Tabelle di raccordo. */
export function useCatalogoAteco() {
  return useQuery({
    queryKey: CHIAVE_CATALOGO_ATECO,
    staleTime: 1000 * 60 * 30, // 30 minuti: il catalogo normativo è stabile
    queryFn: () =>
      leggiTutto<VoceCatalogoAteco>(() =>
        sb
          .from("rischio_ateco")
          .select("id, codice, descrizione, rischio, versione_ateco, ordine")
          .order("ordine", { ascending: true })
          .order("codice", { ascending: true }),
      ),
  });
}

/**
 * Cerca il rischio associato a un codice ATECO nel catalogo normativo.
 * Prova prima la corrispondenza esatta, poi risale al prefisso a 2 cifre della divisione.
 */
export function trovaRischioInCatalogo(
  codice: string,
  catalogo: VoceCatalogoAteco[],
): LivelloRischio | null {
  const pulito = codice.trim().replace(/\s+/g, "");
  if (!pulito) return null;
  // 1. Corrispondenza esatta
  const esatto = catalogo.find((v) => v.codice === pulito);
  if (esatto) return esatto.rischio;
  // 2. Prefisso della divisione (es. "85" da "85.31.20")
  const divisione = pulito.split(".")[0]?.slice(0, 2);
  if (divisione) {
    const perDiv = catalogo.find((v) => v.codice === divisione);
    if (perDiv) return perDiv.rischio;
  }
  return null;
}

/**
 * Calcola il rischio aziendale massimo tra i codici ATECO associati (principio di massima gravità D.Lgs. 81/08).
 * Restituisce null se non ci sono codici o rischi associati.
 */
export function calcolaRischioMassimo(codici: CodiceAteco[]): LivelloRischio | null {
  if (!codici || codici.length === 0) return null;
  let maxGravita = 0;
  let maxRischio: LivelloRischio | null = null;
  for (const c of codici) {
    if (!c.rischio) continue;
    const g = GRAVITA_RISCHIO[c.rischio] ?? 0;
    if (g > maxGravita) {
      maxGravita = g;
      maxRischio = c.rischio;
    }
  }
  return maxRischio;
}

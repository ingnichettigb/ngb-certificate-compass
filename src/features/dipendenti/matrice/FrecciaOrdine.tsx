/*
 * File:      FrecciaOrdine.tsx
 * Percorso:  src/features/dipendenti/matrice/FrecciaOrdine.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: icona della freccia di ordinamento di una colonna. Nessun cambio di comportamento.
 */
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { TipoOrdinamento } from "./matrice-costanti";

interface Props {
  colKey: string;
  colonnaOrd: string;
  direzioneOrd: TipoOrdinamento;
}

export function FrecciaOrdine({ colKey, colonnaOrd, direzioneOrd }: Props) {
  if (colonnaOrd !== colKey || direzioneOrd === "none") {
    return <ArrowUpDown className="size-3 text-muted-foreground/40 ml-1 inline" />;
  }
  return direzioneOrd === "asc" ? (
    <ArrowUp className="size-3 text-primary ml-1 inline" />
  ) : (
    <ArrowDown className="size-3 text-primary ml-1 inline" />
  );
}

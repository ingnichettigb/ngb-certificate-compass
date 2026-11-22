/*
 * File:          useContestoRegole.ts
 * Percorso:      src/features/dipendenti/matrice/useContestoRegole.ts
 * Data creazione: 2026-11-21
 * Dati della ditta che decidono quali regole della Tabella 02 valgono (oggi il grado di rischio aziendale), con la cache condivisa
 * dell'anagrafica ditta. Se la lettura non è ancora arrivata o fallisce, il rischio è «non impostato»: valgono tutte le regole.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 4).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CHIAVE_DITTA, getDitta } from "@/lib/api/ditta";
import type { ContestoRegole } from "./condizioni-regole";

export function useContestoRegole(): ContestoRegole {
  const { data: ditta } = useQuery({ queryKey: CHIAVE_DITTA, queryFn: getDitta, staleTime: 60_000, retry: 1 });
  const rischio = ditta?.rischio_ditta ?? null;
  return useMemo(() => ({ rischioDitta: rischio }), [rischio]);
}

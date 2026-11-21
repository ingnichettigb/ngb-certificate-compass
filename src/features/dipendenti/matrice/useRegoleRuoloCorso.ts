/*
 * File:          useRegoleRuoloCorso.ts
 * Percorso:      src/features/dipendenti/matrice/useRegoleRuoloCorso.ts
 * Data creazione: 2026-11-21
 * Legge la Tabella 02 (regole ruolo -> corso) con la cache condivisa. Restituisce undefined finché non è caricata o se la
 * lettura fallisce: in quel caso le funzioni di mappatura usano il vecchio riconoscimento, così la schermata non si rompe.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 2).
 */
import { useQuery } from "@tanstack/react-query";
import { CHIAVE_REGOLE_RUOLO_CORSO, getRegoleRuoloCorso, type RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";

export function useRegoleRuoloCorso(): RegolaRuoloCorso[] | undefined {
  const { data } = useQuery({
    queryKey: CHIAVE_REGOLE_RUOLO_CORSO,
    queryFn: getRegoleRuoloCorso,
    staleTime: 60_000,
    retry: 1,
  });
  return data;
}

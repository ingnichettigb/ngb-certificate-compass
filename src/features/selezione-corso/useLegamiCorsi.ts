/*
 * File:           useLegamiCorsi.ts
 * Percorso:       src/features/selezione-corso/useLegamiCorsi.ts
 * Data creazione: 22/11/2026
 * Scopo:          legge dal database i ruoli (ruoli_sicurezza) e la Tabella 02 (regole_ruolo_corso) e ne ricava i legami
 *                 corso → ruoli usati per categoria e abilitazione. Stesse chiavi di cache delle altre schermate.
 *                 Se la lettura fallisce restituisce null: l'elenco usa allora la categoria scritta sul corso e li mostra tutti.
 * Revisioni:
 *   rev 1 — 22/11/2026 — Prima versione.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CHIAVE_REGOLE_RUOLO_CORSO,
  CHIAVE_RUOLI,
  getRegoleRuoloCorso,
  getRuoliSicurezza,
} from "@/lib/api";
import { costruisciLegami, type LegamiCorsi } from "./categorie-corso";

export function useLegamiCorsi(attivo = true): LegamiCorsi | null {
  const ruoli = useQuery({
    queryKey: CHIAVE_RUOLI,
    queryFn: getRuoliSicurezza,
    enabled: attivo,
    retry: false,
  });
  const regole = useQuery({
    queryKey: CHIAVE_REGOLE_RUOLO_CORSO,
    queryFn: getRegoleRuoloCorso,
    enabled: attivo,
    retry: false,
  });
  return useMemo(
    () => (ruoli.data && regole.data ? costruisciLegami(regole.data, ruoli.data) : null),
    [ruoli.data, regole.data],
  );
}

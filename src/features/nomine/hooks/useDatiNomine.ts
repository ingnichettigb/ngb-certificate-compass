/*
 * File:      useDatiNomine.ts
 * Percorso:  src/features/nomine/hooks/useDatiNomine.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Carica ditta, lavoratori, ruoli, assegnazioni e modelli con le stesse chiavi di cache delle altre pagine,
 *            così una modifica fatta altrove (ruoli, logo, organigramma) si vede subito qui.
 */
import { useQuery } from "@tanstack/react-query";
import { getDipendenti } from "@/lib/api";
import { CHIAVE_DITTA, getDitta } from "@/lib/api/ditta";
import {
  CHIAVE_ASSEGNAZIONI_RUOLI,
  CHIAVE_RUOLI,
  getAssegnazioniRuoli,
  getRuoliSicurezza,
} from "@/lib/api/ruoli";
import { CHIAVE_MODELLI_NOMINA, getModelliNomina } from "@/lib/api/modelli-nomina";
import type { DatiOrganigramma } from "../nominativi";

export function useDatiNomine() {
  const ditta = useQuery({ queryKey: CHIAVE_DITTA, queryFn: getDitta });
  const dipendenti = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti });
  const ruoli = useQuery({ queryKey: CHIAVE_RUOLI, queryFn: getRuoliSicurezza });
  const assegnazioni = useQuery({
    queryKey: CHIAVE_ASSEGNAZIONI_RUOLI,
    queryFn: getAssegnazioniRuoli,
  });
  const modelli = useQuery({ queryKey: CHIAVE_MODELLI_NOMINA, queryFn: getModelliNomina });

  const organigramma: DatiOrganigramma = {
    dipendenti: dipendenti.data ?? [],
    ruoli: ruoli.data ?? [],
    assegnazioni: assegnazioni.data ?? [],
    voci: ditta.data?.organigramma_voci ?? [],
  };
  return {
    ditta: ditta.data,
    organigramma,
    modelli: modelli.data,
    caricamento:
      ditta.isLoading ||
      dipendenti.isLoading ||
      ruoli.isLoading ||
      assegnazioni.isLoading ||
      modelli.isLoading,
    errore: ditta.error ?? dipendenti.error ?? ruoli.error ?? assegnazioni.error,
  };
}

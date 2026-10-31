/*
 * File:      useDatiDipendenti.ts
 * Percorso:  src/features/dipendenti/hooks/useDatiDipendenti.ts
 * Lettura dei dati della pagina: reparti, dipendenti, attestati, ruoli, assegnazioni, integrazioni DVR.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getAttestati,
  getDipendenti,
  getIntegrazioniDvr,
  getReparti,
  getRuoliSicurezza,
  getAssegnazioniRuoli,
  CHIAVE_RUOLI,
  CHIAVE_ASSEGNAZIONI_RUOLI,
} from "@/lib/api";

export function useDatiDipendenti() {
  const { data: repartiElenco = [] } = useQuery({
    queryKey: ["reparti"],
    queryFn: getReparti,
    retry: false,
  });
  const { data: dipendenti = [], isLoading } = useQuery({
    queryKey: ["dipendenti"],
    queryFn: getDipendenti,
  });
  const { data: attestati = [] } = useQuery({
    queryKey: ["attestati", "Tutti"],
    queryFn: () => getAttestati("Tutti"),
  });
  const { data: ruoliCatalogo = [] } = useQuery({
    queryKey: CHIAVE_RUOLI,
    queryFn: getRuoliSicurezza,
    retry: false,
  });
  const { data: assegnazioni = [] } = useQuery({
    queryKey: CHIAVE_ASSEGNAZIONI_RUOLI,
    queryFn: getAssegnazioniRuoli,
    retry: false,
  });
  const { data: integrazioni = [] } = useQuery({
    queryKey: ["integrazioni-dvr"],
    queryFn: getIntegrazioniDvr,
    retry: false,
  });

  return { repartiElenco, dipendenti, isLoading, attestati, ruoliCatalogo, assegnazioni, integrazioni };
}

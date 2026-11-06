/*
 * File:      useScadenze.ts
 * Percorso:  src/features/scadenze/hooks/useScadenze.ts
 * Dati, filtri e ordinamento della pagina Scadenze.
 * Revisioni:
 * - Rev 2 (2026-11-06 18:30): Integrazione ruoli/assegnazioni e filtro «Solo incarichi attualmente assegnati».
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CHIAVE_ASSEGNAZIONI_RUOLI,
  CHIAVE_RUOLI,
  getAssegnazioniRuoli,
  getAttestati,
  getRuoliSicurezza,
} from "@/lib/api";
import { TUTTI, type Vista, type ColonnaSort, type DirezioneSort } from "../types";
import { elencoReparti, elencoCorsi, filtraScadenze } from "../filtri";

export function useScadenze() {
  const [vista, setVista] = useState<Vista>("Scaduti");
  const [q, setQ] = useState("");
  const [reparto, setReparto] = useState(TUTTI);
  const [corsoSelezionato, setCorsoSelezionato] = useState(TUTTI);
  const [sortCol, setSortCol] = useState<ColonnaSort>("scadenza");
  const [sortDir, setSortDir] = useState<DirezioneSort>("asc");
  const [soloIncarichiAssegnati, setSoloIncarichiAssegnati] = useState(true);

  const { data: attestati = [], isLoading: loadingAttestati } = useQuery({
    queryKey: ["attestati", "Tutti"],
    queryFn: () => getAttestati("Tutti"),
  });

  const { data: ruoliCatalogo = [], isLoading: loadingRuoli } = useQuery({
    queryKey: CHIAVE_RUOLI,
    queryFn: getRuoliSicurezza,
  });

  const { data: assegnazioni = [], isLoading: loadingAssegnazioni } = useQuery({
    queryKey: CHIAVE_ASSEGNAZIONI_RUOLI,
    queryFn: getAssegnazioniRuoli,
  });

  const reparti = useMemo(() => elencoReparti(attestati), [attestati]);
  const corsi = useMemo(() => elencoCorsi(attestati), [attestati]);

  function cambiaOrdinamento(colonna: ColonnaSort) {
    if (sortCol === colonna) {
      setSortDir((prec) => (prec === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colonna);
      setSortDir("asc");
    }
  }

  const righe = useMemo(
    () =>
      filtraScadenze({
        attestati,
        vista,
        q,
        reparto,
        corsoSelezionato,
        sortCol,
        sortDir,
        oggi: new Date(),
        soloIncarichiAssegnati,
        ruoliCatalogo,
        assegnazioni,
      }),
    [attestati, vista, q, reparto, corsoSelezionato, sortCol, sortDir, soloIncarichiAssegnati, ruoliCatalogo, assegnazioni],
  );

  return {
    vista,
    setVista,
    q,
    setQ,
    reparto,
    setReparto,
    corsoSelezionato,
    setCorsoSelezionato,
    sortCol,
    sortDir,
    isLoading: loadingAttestati || loadingRuoli || loadingAssegnazioni,
    reparti,
    corsi,
    righe,
    cambiaOrdinamento,
    soloIncarichiAssegnati,
    setSoloIncarichiAssegnati,
  };
}

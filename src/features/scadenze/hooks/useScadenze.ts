/*
 * File:      useScadenze.ts
 * Percorso:  src/features/scadenze/hooks/useScadenze.ts
 * Dati, filtri e ordinamento della pagina Scadenze.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAttestati } from "@/lib/api";
import { TUTTI, type Vista, type ColonnaSort, type DirezioneSort } from "../types";
import { elencoReparti, elencoCorsi, filtraScadenze } from "../filtri";

export function useScadenze() {
  const [vista, setVista] = useState<Vista>("Scaduti");
  const [q, setQ] = useState("");
  const [reparto, setReparto] = useState(TUTTI);
  const [corsoSelezionato, setCorsoSelezionato] = useState(TUTTI);
  const [sortCol, setSortCol] = useState<ColonnaSort>("scadenza");
  const [sortDir, setSortDir] = useState<DirezioneSort>("asc");

  const { data: attestati = [], isLoading } = useQuery({
    queryKey: ["attestati", "Tutti"],
    queryFn: () => getAttestati("Tutti"),
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
      }),
    [attestati, vista, q, reparto, corsoSelezionato, sortCol, sortDir],
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
    isLoading,
    reparti,
    corsi,
    righe,
    cambiaOrdinamento,
  };
}

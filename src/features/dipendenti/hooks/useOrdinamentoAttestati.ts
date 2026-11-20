/*
 * File:      useOrdinamentoAttestati.ts
 * Percorso:  src/features/dipendenti/hooks/useOrdinamentoAttestati.ts
 * Colonna e direzione di ordinamento della tabella attestati.
 * Rev 1 (2026-11-20): ordine predefinito «per gruppo» (base e aggiornamenti per argomento).
 */
import { useState } from "react";
import { type ColonnaSortAttestati, type DirezioneSort } from "../types";

export function useOrdinamentoAttestati() {
  const [attestatiSortCol, setAttestatiSortCol] = useState<ColonnaSortAttestati>("gruppo");
  const [attestatiSortDir, setAttestatiSortDir] = useState<DirezioneSort>("asc");

  function cambiaOrdinamentoAttestati(colonna: ColonnaSortAttestati) {
    if (attestatiSortCol === colonna) {
      setAttestatiSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setAttestatiSortCol(colonna);
      setAttestatiSortDir("asc");
    }
  }

  return { attestatiSortCol, attestatiSortDir, cambiaOrdinamentoAttestati };
}

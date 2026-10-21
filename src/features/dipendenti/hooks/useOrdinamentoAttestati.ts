/*
 * File:      useOrdinamentoAttestati.ts
 * Percorso:  src/features/dipendenti/hooks/useOrdinamentoAttestati.ts
 * Colonna e direzione di ordinamento della tabella attestati.
 */
import { useState } from "react";
import { type ColonnaSortAttestati, type DirezioneSort } from "../types";

export function useOrdinamentoAttestati() {
  const [attestatiSortCol, setAttestatiSortCol] = useState<ColonnaSortAttestati>("data");
  const [attestatiSortDir, setAttestatiSortDir] = useState<DirezioneSort>("desc");

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

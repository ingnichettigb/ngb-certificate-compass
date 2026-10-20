/*
 * File:      useDocumento.ts
 * Percorso:  src/features/operatore/hooks/useDocumento.ts
 * Documento caricato: file, anteprima, pagine.
 */
import { useState, useEffect } from "react";

export function useDocumento() {
  const [file, setFile] = useState<File | null>(null);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [anteprimaMime, setAnteprimaMime] = useState<string | null>(null);
  const [totPagine, setTotPagine] = useState(0);
  const [pagine, setPagine] = useState("");

  useEffect(() => () => {
    if (anteprima?.startsWith("blob:")) URL.revokeObjectURL(anteprima);
  }, [anteprima]);

  /** Toglie il documento caricato. */
  function resetDocumento() {
    setFile(null);
    setAnteprima(null);
    setAnteprimaMime(null);
    setPagine("");
    setTotPagine(0);
  }

  return { file, setFile, anteprima, setAnteprima, anteprimaMime, setAnteprimaMime, totPagine, setTotPagine, pagine, setPagine, resetDocumento };
}

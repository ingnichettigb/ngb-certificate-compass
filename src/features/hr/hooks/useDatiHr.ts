/*
 * File:      useDatiHr.ts
 * Percorso:  src/features/hr/hooks/useDatiHr.ts
 * Dati della dashboard HR: filtro per stato, attestati, corsi, selezione e ricarica.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttestati, getTipiCorso, type Stato } from "@/lib/api";

export function useDatiHr() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Stato | "Tutti">("In attesa");
  const [sel, setSel] = useState<string | null>(null);

  const { data: attestati = [], isLoading } = useQuery({
    queryKey: ["attestati", filtro],
    queryFn: () => getAttestati(filtro),
  });
  const { data: corsi = [] } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
  });

  const corrente = attestati.find((a) => a.id === sel) ?? null;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["attestati"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

  /** Cambia il filtro per stato e toglie la selezione. */
  function cambiaFiltro(f: Stato | "Tutti") {
    setFiltro(f);
    setSel(null);
  }

  return { filtro, cambiaFiltro, sel, setSel, attestati, isLoading, corsi, corrente, refresh };
}

/*
 * File:      useDatiCarica.ts
 * Percorso:  src/features/carica/hooks/useDatiCarica.ts
 * Lettura dei dati del modulo: corsi, reparti, sottoreparti, classi, materie, categorie nascoste.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCategorieNascoste,
  getClassiConcorso,
  getMaterie,
  getReparti,
  getSottoreparti,
  getTipiCorso,
} from "@/lib/api";

export function useDatiCarica() {
  const { data: corsi = [] } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
  });
  // Se le tabelle nuove non esistono ancora, il modulo funziona come prima.
  const { data: repartiElenco = [] } = useQuery({
    queryKey: ["reparti"],
    queryFn: getReparti,
    retry: false,
  });
  const { data: sottorepartiElenco = [] } = useQuery({
    queryKey: ["sottoreparti"],
    queryFn: getSottoreparti,
    retry: false,
  });
  const { data: classi = [] } = useQuery({
    queryKey: ["classi_concorso"],
    queryFn: getClassiConcorso,
    retry: false,
  });
  const { data: materie = [] } = useQuery({
    queryKey: ["materie"],
    queryFn: getMaterie,
    retry: false,
  });
  const { data: nascoste = [] } = useQuery({
    queryKey: ["categorie_nascoste"],
    queryFn: getCategorieNascoste,
    retry: false,
  });
  const reparti = useMemo(() => repartiElenco.filter((r) => r.attivo), [repartiElenco]);

  return { corsi, repartiElenco, sottorepartiElenco, classi, materie, nascoste, reparti };
}

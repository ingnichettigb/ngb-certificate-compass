/*
 * File:      useStatistiche.ts
 * Percorso:  src/features/home/hooks/useStatistiche.ts
 * Lettura dei contatori della pagina iniziale.
 */
import { useQuery } from "@tanstack/react-query";
import { caricaStatistiche } from "../statistiche";

export function useStatistiche() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: caricaStatistiche,
  });
  return stats;
}

/*
 * File:      useTipiCorso.ts
 * Percorso:  src/features/operatore/hooks/useTipiCorso.ts
 * Elenco dei tipi di corso.
 */
import { useQuery } from "@tanstack/react-query";
import type { TipoCorso } from "../types";
import { supabase as sb } from "@/integrations/supabase/client";

export function useTipiCorso() {
  const { data: tipi = [] } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: async () => {
      const { data, error } = await sb.from("tipi_corso").select("*").order("nome_corso");
      if (error) throw error;
      return (data ?? []) as TipoCorso[];
    },
  });
  return tipi;
}

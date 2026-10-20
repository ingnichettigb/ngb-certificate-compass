/*
 * File:      useCodaLavoro.ts
 * Percorso:  src/features/operatore/hooks/useCodaLavoro.ts
 * Coda di lavoro: lettura, ricarica e selezione delle righe.
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CodaRiga } from "../types";
import { supabase as sb } from "@/integrations/supabase/client";

export function useCodaLavoro() {
  const qc = useQueryClient();
  const { data: coda = [] } = useQuery({
    queryKey: ["coda"],
    queryFn: async () => {
      const { data, error } = await sb.from("coda_valutazioni").select("*").order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set());
  const righeCoda = coda as CodaRiga[];
  const ricarica = () => qc.invalidateQueries({ queryKey: ["coda"] });
  const selezione = useMemo(() => righeCoda.filter((r) => selezionati.has(r.id)), [righeCoda, selezionati]);
  const daArchiviare = useMemo(() => selezione.filter((r) => !r.archiviato), [selezione]);
  const toggleSel = (id: string) =>
    setSelezionati((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return { righeCoda, ricarica, selezionati, setSelezionati, toggleSel, selezione, daArchiviare };
}

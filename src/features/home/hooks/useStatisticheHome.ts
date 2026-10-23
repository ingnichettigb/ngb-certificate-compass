/*
 * File:      useStatisticheHome.ts
 * Percorso:  src/features/home/hooks/useStatisticheHome.ts
 * Contatori della home: dipendenti, attestati, in attesa, in scadenza (6 mesi) e scaduti.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StatisticheHome {
  dipendenti: number;
  attesa: number;
  scaduti: number;
  inScadenza6m: number;
  attestati: number;
}

export function useStatisticheHome() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async (): Promise<StatisticheHome> => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const in6m = new Date();
      in6m.setMonth(in6m.getMonth() + 6);
      const in6mStr = in6m.toISOString().slice(0, 10);

      const [dip, attesa, scaduti, inScadenza6m, tot] = await Promise.all([
        supabase.from("dipendenti").select("id", { count: "exact", head: true }),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .eq("stato_validazione", "In attesa"),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .lt("data_scadenza_calcolata", todayStr),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .gte("data_scadenza_calcolata", todayStr)
          .lte("data_scadenza_calcolata", in6mStr),
        supabase.from("attestati_caricati").select("id", { count: "exact", head: true }),
      ]);

      return {
        dipendenti: dip.count ?? 0,
        attesa: attesa.count ?? 0,
        scaduti: scaduti.count ?? 0,
        inScadenza6m: inScadenza6m.count ?? 0,
        attestati: tot.count ?? 0,
      };
    },
  });
}

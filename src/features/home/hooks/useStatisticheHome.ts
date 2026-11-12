/*
 * File:      useStatisticheHome.ts
 * Percorso:  src/features/home/hooks/useStatisticheHome.ts
 * Contatori della home: dipendenti, attestati, in attesa, in scadenza (6 mesi) e scaduti.
 * Revisioni:
 *   rev 3 — 12/11/2026 — «Scaduti» e «In scadenza» contano i corsi per lavoratore (ciclo Base + aggiornamenti, stesso calcolo della
 *            pagina Scadenze), non più ogni singolo attestato: un Base scaduto con un aggiornamento valido non è uno scaduto.
 *            Primo Soccorso oltre la tolleranza = scaduto. Esclusi i lavoratori cessati e gli attestati non approvati.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAttestati } from "@/lib/api";
import { costruisciRighe } from "@/features/scadenze/raggruppa";

export interface StatisticheHome {
  dipendenti: number;
  attesa: number;
  scaduti: number;
  inScadenza6m: number;
  attestati: number;
  /** Rev 2 (2026-10-28 10:55): attestati senza file collegato. */
  senzaPdf: number;
}

export function useStatisticheHome() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async (): Promise<StatisticheHome> => {
      const oggi = new Date();
      const todayStr = oggi.toISOString().slice(0, 10);
      const in6m = new Date();
      in6m.setMonth(in6m.getMonth() + 6);
      const in6mStr = in6m.toISOString().slice(0, 10);

      const [dip, attesa, tot, senzaPdf, attestati] = await Promise.all([
        supabase.from("dipendenti").select("id", { count: "exact", head: true }),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .eq("stato_validazione", "In attesa"),
        supabase.from("attestati_caricati").select("id", { count: "exact", head: true }),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .or("url_foto_fronte.is.null,url_foto_fronte.eq."),
        getAttestati(),
      ]);

      // Un conteggio per lavoratore + corso (gruppo Base/aggiornamenti), con la scadenza del ciclo.
      const attivi = attestati.filter(
        (a) => a.stato_validazione === "Approvato" && a.dipendenti?.stato_lavoratore !== "cessato",
      );
      let scaduti = 0;
      let inScadenza6m = 0;
      for (const r of costruisciRighe(attivi, oggi)) {
        const { stato, scadenzaEffettiva } = r.ciclo;
        if (stato === "scaduto_sanabile" || stato === "decaduto") scaduti++;
        else if (scadenzaEffettiva && scadenzaEffettiva >= todayStr && scadenzaEffettiva <= in6mStr) inScadenza6m++;
      }

      return {
        dipendenti: dip.count ?? 0,
        attesa: attesa.count ?? 0,
        scaduti,
        inScadenza6m,
        attestati: tot.count ?? 0,
        senzaPdf: senzaPdf.count ?? 0,
      };
    },
  });
}

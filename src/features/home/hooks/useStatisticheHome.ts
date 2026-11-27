/*
 * File:      useStatisticheHome.ts
 * Percorso:  src/features/home/hooks/useStatisticheHome.ts
 * Contatori della home: dipendenti, attestati, in attesa, in scadenza (6 mesi) e scaduti.
 * Revisioni:
 *   rev 3 — 12/11/2026 — «Scaduti» e «In scadenza» contano i corsi per lavoratore (ciclo Base + aggiornamenti, stesso calcolo della
 *            pagina Scadenze), non più ogni singolo attestato: un Base scaduto con un aggiornamento valido non è uno scaduto.
 *            Primo Soccorso oltre la tolleranza = scaduto. Esclusi i lavoratori cessati e gli attestati non approvati.
 *   rev 4 — 27/11/2026 — «Senza PDF» conta i lavoratori in forza (non più i singoli attestati), con la stessa regola del filtro
 *            «Senza PDF» dell'elenco Dipendenti (lavoratoriSenzaPdf): attestato registrato senza file oppure nessun attestato.
 */
import { statoRegistrato } from "@/lib/api/attestati";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAttestati, getDipendenti } from "@/lib/api";
import { lavoratoriSenzaPdf } from "@/features/contratti/contratto";
import { costruisciRighe } from "@/features/scadenze/raggruppa";

export interface StatisticheHome {
  dipendenti: number;
  attesa: number;
  scaduti: number;
  inScadenza6m: number;
  attestati: number;
  /** Rev 4 (2026-11-27): lavoratori in forza senza PDF (con attestati senza file, o senza alcun attestato). */
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

      const [dip, attesa, tot, attestati, elencoDipendenti] = await Promise.all([
        supabase.from("dipendenti").select("id", { count: "exact", head: true }),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .eq("stato_validazione", "In attesa"),
        supabase.from("attestati_caricati").select("id", { count: "exact", head: true }),
        getAttestati(),
        getDipendenti(),
      ]);

      // Un conteggio per lavoratore + corso (gruppo Base/aggiornamenti), con la scadenza del ciclo.
      const attivi = attestati.filter(
        (a) => statoRegistrato(a.stato_validazione) && a.dipendenti?.stato_lavoratore !== "cessato",
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
        senzaPdf: lavoratoriSenzaPdf(elencoDipendenti, attestati).length,
      };
    },
  });
}

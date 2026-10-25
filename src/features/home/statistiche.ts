/*
 * File:      statistiche.ts
 * Percorso:  src/features/home/statistiche.ts
 * Conteggi della pagina iniziale (dipendenti e attestati).
 */
import { supabase } from "@/integrations/supabase/client";

/** Numeri mostrati nei contatori della pagina iniziale. */
export interface Statistiche {
  dipendenti: number;
  attesa: number;
  scaduti: number;
  inScadenza6m: number;
  attestati: number;
}

/** Date (AAAA-MM-GG) usate dai contatori: oggi e oggi + 6 mesi. */
export function intervalliStatistiche(oggi: Date = new Date()): { oggiStr: string; tra6MesiStr: string } {
  const tra6Mesi = new Date(oggi);
  tra6Mesi.setMonth(tra6Mesi.getMonth() + 6);
  return { oggiStr: oggi.toISOString().slice(0, 10), tra6MesiStr: tra6Mesi.toISOString().slice(0, 10) };
}

/** Conta dipendenti e attestati (in totale, in attesa, scaduti, in scadenza entro 6 mesi). */
export async function caricaStatistiche(): Promise<Statistiche> {
  const { oggiStr: todayStr, tra6MesiStr: in6mStr } = intervalliStatistiche();

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
      supabase
        .from("attestati_caricati")
        .select("id", { count: "exact", head: true }),
    ]);

    return {
      dipendenti: dip.count ?? 0,
      attesa: attesa.count ?? 0,
      scaduti: scaduti.count ?? 0,
      inScadenza6m: inScadenza6m.count ?? 0,
      attestati: tot.count ?? 0,
    };
}

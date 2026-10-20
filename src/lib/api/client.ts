/*
 * File:      client.ts
 * Percorso:  src/lib/api/client.ts
 * Client Supabase non tipizzato e lettura a blocchi.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client senza tipi generati: serve per le tabelle nuove (reparti, categorie_corso)
 * finché il file types.ts non viene rigenerato da Lovable dopo la migrazione.
 */
export const sb = supabase as unknown as SupabaseClient;

/** Legge tutte le righe a blocchi da 1000, senza tagliare gli elenchi lunghi. */
export async function leggiTutto<T>(
  crea: () => { range: (da: number, a: number) => PromiseLike<{ data: unknown; error: unknown }> },
): Promise<T[]> {
  const out: T[] = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await crea().range(da, da + 999);
    if (error) throw error;
    const righe = (data ?? []) as T[];
    out.push(...righe);
    if (righe.length < 1000) return out;
  }
}

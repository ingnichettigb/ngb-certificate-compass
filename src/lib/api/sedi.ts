/*
 * File:      sedi.ts
 * Percorso:  src/lib/api/sedi.ts
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 — Sedi aziendali: una principale unica + plessi secondari (stessa Ditta, stesso RSPP).
 */
import { sb } from "./client";

export const CHIAVE_SEDI = ["sedi-aziendali"] as const;

export type Sede = {
  id: string;
  nome: string;
  indirizzo: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  is_principale: boolean;
  ordine: number;
  attiva: boolean;
};

export async function getSedi(): Promise<Sede[]> {
  const { data, error } = await sb
    .from("sedi")
    .select("*")
    .order("is_principale", { ascending: false })
    .order("ordine")
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Sede[];
}

export async function aggiungiSede(input: {
  nome: string;
  indirizzo?: string | null;
  cap?: string | null;
  comune?: string | null;
  provincia?: string | null;
  ordine?: number;
}): Promise<Sede> {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Inserisci il nome della sede");
  const { data, error } = await sb
    .from("sedi")
    .insert({
      nome,
      indirizzo: input.indirizzo?.trim() || null,
      cap: input.cap?.trim() || null,
      comune: input.comune?.trim() || null,
      provincia: input.provincia?.trim().toUpperCase() || null,
      is_principale: false,
      ordine: input.ordine ?? 10,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Sede;
}

export async function aggiornaSede(
  id: string,
  patch: Partial<Pick<Sede, "nome" | "indirizzo" | "cap" | "comune" | "provincia" | "attiva" | "ordine">>,
) {
  const { error } = await sb.from("sedi").update(patch).eq("id", id);
  if (error) throw error;
}

/** Elimina un plesso (mai la principale). I dipendenti tornano alla principale; gli incarichi del plesso decadono. */
export async function eliminaSede(id: string) {
  const { error } = await sb.from("sedi").delete().eq("id", id).eq("is_principale", false);
  if (error) throw error;
}

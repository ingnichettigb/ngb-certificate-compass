/*
 * File:      sedi.ts
 * Percorso:  src/lib/api/sedi.ts
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 — Sedi aziendali: una principale unica + plessi secondari (stessa Ditta, stesso RSPP).
 *   rev 2 — 15/11/2026 — persone_max: massimo numero di presenti per sede (obbligatorio e > 0 per i nuovi plessi).
 *   rev 3 — 15/11/2026 — aggiornaSede pulisce i testi (trim, provincia maiuscola, vuoto = null) e vieta il nome vuoto; contaLavoratoriPerSede (solo in_forza) per il riepilogo della sede.
 */
import { leggiTutto, sb } from "./client";

export const CHIAVE_LAVORATORI_PER_SEDE = ["lavoratori-per-sede"] as const;

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
  /** Massimo numero di presenti contemporanei (lavoratori, studenti, ospiti e utenza). null = ancora da compilare. */
  persone_max: number | null;
  /** Data dell'ultima modifica, impostata dal database. */
  updated_at?: string;
};

/** Valida un numero di presenti: intero maggiore di zero. */
export function validaPersoneMax(valore: unknown): number {
  const n = typeof valore === "number" ? valore : Number(valore);
  if (valore === null || valore === undefined || valore === "" || !Number.isInteger(n) || n <= 0) {
    throw new Error("Indica il massimo numero di presenti (intero maggiore di zero)");
  }
  return n;
}

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
  persone_max: number;
}): Promise<Sede> {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Inserisci il nome della sede");
  const persone_max = validaPersoneMax(input.persone_max);
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
      persone_max,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Sede;
}

export async function aggiornaSede(
  id: string,
  patch: Partial<
    Pick<Sede, "nome" | "indirizzo" | "cap" | "comune" | "provincia" | "attiva" | "ordine" | "persone_max">
  >,
) {
  const pulito: typeof patch = { ...patch };
  if (patch.persone_max !== undefined && patch.persone_max !== null) validaPersoneMax(patch.persone_max);
  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw new Error("Inserisci il nome della sede");
    pulito.nome = nome;
  }
  for (const k of ["indirizzo", "cap", "comune"] as const) {
    if (patch[k] !== undefined) pulito[k] = patch[k]?.trim() || null;
  }
  if (patch.provincia !== undefined) pulito.provincia = patch.provincia?.trim().toUpperCase() || null;
  const { error } = await sb.from("sedi").update(pulito).eq("id", id);
  if (error) throw error;
}

/** Lavoratori attivi (stato «in_forza», cessati esclusi) per sede: { sede_id: numero }. */
export async function contaLavoratoriPerSede(): Promise<Record<string, number>> {
  const righe = await leggiTutto<{ sede_id: string | null }>(() =>
    sb.from("dipendenti").select("sede_id").eq("stato_lavoratore", "in_forza").order("id"),
  );
  const conteggio: Record<string, number> = {};
  for (const r of righe) if (r.sede_id) conteggio[r.sede_id] = (conteggio[r.sede_id] ?? 0) + 1;
  return conteggio;
}

/** Elimina un plesso (mai la principale). I dipendenti tornano alla principale; gli incarichi del plesso decadono. */
export async function eliminaSede(id: string) {
  const { error } = await sb.from("sedi").delete().eq("id", id).eq("is_principale", false);
  if (error) throw error;
}

/*
 * File:      categorie.ts
 * Percorso:  src/lib/api/categorie.ts
 * Categorie di corso mostrate al lavoratore.
 */
import { supabase } from "@/integrations/supabase/client";
import { sb } from "./client";

export type CategoriaCorso = {
  macro_categoria: string;
  visibile_lavoratore: boolean;
  corsi: number;
};

/**
 * Elenco unico delle categorie: ricavato da tipi_corso (quindi è lo stesso
 * elenco dei corsi per tutti) + la scelta di visibilità salvata in categorie_corso.
 * Una categoria senza riga in categorie_corso è considerata visibile.
 */
export async function getCategorieCorso(): Promise<CategoriaCorso[]> {
  const [corsi, vis] = await Promise.all([
    supabase.from("tipi_corso").select("macro_categoria"),
    sb.from("categorie_corso").select("macro_categoria, visibile_lavoratore"),
  ]);
  if (corsi.error) throw corsi.error;
  if (vis.error) throw vis.error;
  const stato = new Map<string, boolean>(
    (vis.data ?? []).map((r: { macro_categoria: string; visibile_lavoratore: boolean }) => [
      r.macro_categoria,
      r.visibile_lavoratore,
    ]),
  );
  const conteggio = new Map<string, number>();
  for (const c of corsi.data ?? []) {
    conteggio.set(c.macro_categoria, (conteggio.get(c.macro_categoria) ?? 0) + 1);
  }
  return Array.from(conteggio.keys())
    .sort((a, b) => a.localeCompare(b, "it"))
    .map((nome) => ({
      macro_categoria: nome,
      visibile_lavoratore: stato.get(nome) ?? true,
      corsi: conteggio.get(nome) ?? 0,
    }));
}

export async function impostaCategoriaVisibile(macro: string, visibile: boolean) {
  const { error } = await sb
    .from("categorie_corso")
    .upsert(
      { macro_categoria: macro, visibile_lavoratore: visibile },
      { onConflict: "macro_categoria" },
    );
  if (error) throw error;
}

/**
 * Nomi delle categorie NASCOSTE al lavoratore.
 * Se la tabella non esiste ancora (migrazione non eseguita) non nasconde nulla.
 */
export async function getCategorieNascoste(): Promise<string[]> {
  const { data, error } = await sb
    .from("categorie_corso")
    .select("macro_categoria")
    .eq("visibile_lavoratore", false);
  if (error) return [];
  return (data ?? []).map((r: { macro_categoria: string }) => r.macro_categoria);
}

/*
 * File:      tipi-corso.ts
 * Percorso:  src/lib/api/tipi-corso.ts
 * Tipi di corso (catalogo, ordinamento, visibilità).
 */
import { sb } from "./client";
import { getCategorieNascoste } from "./categorie";

export type TipoCorso = {
  id: string;
  nome_corso: string;
  macro_categoria: string;
  livello_specifico: string;
  ore_minime_legge: number | null;
  durata_validita_anni: number | null;
  /** Codice ufficiale del corso (es. FSL4, A+FSL6). Non è univoco da solo. */
  codice: string | null;
  /** Posizione nell'elenco, usata per il trascinamento nella tabella. */
  ordine: number;
  /** Ogni quanti anni va rifatto l'aggiornamento collegato. */
  anni_aggiornamento: number | null;
  /** Ore dell'aggiornamento collegato. */
  ore_aggiornamento: number | null;
  /** Codice del tipo di corso (in questa stessa tabella) da fare per rinnovare. */
  codice_corso_aggiornamento: string | null;
  /** Se falso, il lavoratore non vede questo corso specifico nel modulo di invio. */
  visibile_lavoratore: boolean;
};

export async function getTipiCorso(): Promise<TipoCorso[]> {
  const { data, error } = await sb
    .from("tipi_corso")
    .select("*")
    .order("ordine")
    .order("nome_corso");
  if (error) throw error;
  return (data ?? []) as TipoCorso[];
}

/** Solo i corsi che il lavoratore può scegliere nel modulo (rispetta anche il nascondimento per macro-categoria). */
export async function getTipiCorsoVisibili(): Promise<TipoCorso[]> {
  const [tutti, nascoste] = await Promise.all([getTipiCorso(), getCategorieNascoste()]);
  const nasc = new Set(nascoste);
  return tutti.filter((t) => t.visibile_lavoratore && !nasc.has(t.macro_categoria));
}

export async function aggiornaTipoCorso(
  id: string,
  patch: Partial<
    Pick<
      TipoCorso,
      | "codice"
      | "nome_corso"
      | "macro_categoria"
      | "livello_specifico"
      | "ore_minime_legge"
      | "durata_validita_anni"
      | "anni_aggiornamento"
      | "ore_aggiornamento"
      | "codice_corso_aggiornamento"
      | "visibile_lavoratore"
      | "ordine"
    >
  >,
) {
  const pulito = { ...patch };
  if (typeof pulito.nome_corso === "string") {
    pulito.nome_corso = pulito.nome_corso.trim();
    if (!pulito.nome_corso) throw new Error("Il nome del corso non può essere vuoto");
  }
  const { error } = await sb.from("tipi_corso").update(pulito).eq("id", id);
  if (error) throw error;
}

export async function aggiungiTipoCorso(input: {
  nome_corso: string;
  macro_categoria: string;
  livello_specifico: string;
  ordine: number;
  codice?: string;
  ore?: string;
}) {
  const nome = input.nome_corso.trim();
  if (!nome) throw new Error("Scrivi il nome del corso");
  const ore = Number(String(input.ore ?? "").replace(",", "."));
  const { error } = await sb.from("tipi_corso").insert({
    nome_corso: nome,
    macro_categoria: input.macro_categoria.trim() || "Altro",
    livello_specifico: input.livello_specifico.trim() || "Base",
    codice: input.codice?.trim().toUpperCase() || null,
    ore_minime_legge: input.ore?.trim() && Number.isFinite(ore) ? ore : null,
    ordine: input.ordine,
  });
  if (error) throw error;
}

export async function eliminaTipoCorso(id: string) {
  const { error } = await sb.from("tipi_corso").delete().eq("id", id);
  if (error) {
    // vincolo di chiave esterna: ci sono attestati caricati che usano questo corso
    if (error.code === "23503") {
      throw new Error(
        "Non si può eliminare: ci sono attestati caricati con questo corso. Puoi nasconderlo invece di cancellarlo.",
      );
    }
    throw error;
  }
}

/** Riassegna l'ordine ai corsi secondo la sequenza data (dopo un trascinamento). */
export async function riordinaTipiCorso(idsInOrdine: string[]) {
  await Promise.all(
    idsInOrdine.map((id, i) =>
      sb
        .from("tipi_corso")
        .update({ ordine: i + 1 })
        .eq("id", id),
    ),
  );
}

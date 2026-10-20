/*
 * File:      integrazioni-dvr.ts
 * Percorso:  src/lib/api/integrazioni-dvr.ts
 * Integrazioni DVR (debito formativo).
 */
import { sb } from "./client";

export type StatoIntegrazione = "Da completare" | "Completata";

export type IntegrazioneDvr = {
  id: string;
  dipendente_id: string;
  attestato_origine_id: string | null;
  tipo_corso_nome: string | null;
  /** Etichetta scelta dall'operatore, es. "Integrazione 4 ore". */
  descrizione: string;
  ore: number | null;
  argomenti_mancanti: string[];
  stato: StatoIntegrazione;
  data_richiesta: string;
  attestato_chiusura_id: string | null;
  data_chiusura: string | null;
  created_at: string;
};

/** Tutte le integrazioni (aperte e chiuse). Se la tabella non esiste ancora: elenco vuoto. */
export async function getIntegrazioniDvr(): Promise<IntegrazioneDvr[]> {
  const { data, error } = await sb
    .from("integrazioni_dvr")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("integrazioni_dvr non disponibile:", error.message);
    return [];
  }
  return (data ?? []) as IntegrazioneDvr[];
}

/** Integrazioni ancora "Da completare" di un lavoratore. */
export async function getIntegrazioniDvrAperte(dipendenteId: string): Promise<IntegrazioneDvr[]> {
  const { data, error } = await sb
    .from("integrazioni_dvr")
    .select("*")
    .eq("dipendente_id", dipendenteId)
    .eq("stato", "Da completare")
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as IntegrazioneDvr[];
}

export async function creaIntegrazioneDvr(input: {
  dipendente_id: string;
  attestato_origine_id: string | null;
  tipo_corso_nome: string | null;
  descrizione: string;
  ore: number | null;
  argomenti_mancanti: string[];
}): Promise<IntegrazioneDvr> {
  const { data, error } = await sb
    .from("integrazioni_dvr")
    .insert({ ...input, stato: "Da completare" })
    .select()
    .single();
  if (error) throw error;
  return data as IntegrazioneDvr;
}

/** Segna l'integrazione come completata, collegando (se c'è) l'attestato che la chiude. */
export async function chiudiIntegrazioneDvr(id: string, attestatoChiusuraId: string | null) {
  const { error } = await sb
    .from("integrazioni_dvr")
    .update({
      stato: "Completata",
      attestato_chiusura_id: attestatoChiusuraId,
      data_chiusura: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

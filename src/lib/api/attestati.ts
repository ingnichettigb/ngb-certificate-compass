/*
 * File:          attestati.ts
 * Percorso:      src/lib/api/attestati.ts
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Funzioni base get, upload, crea e aggiorna attestati.
 *   - Rev 2 (2026-10-25 20:30): Aggiunte funzioni eliminaAttestato e scollegaDocumentoAttestato.
 *   - Rev 4 (2026-10-28 11:50): Aggiunto stato «In attesa di integrazione».
 */
import { supabase } from "@/integrations/supabase/client";
import { leggiTutto, sb } from "./client";
import type { Dipendente } from "./dipendenti";
import type { TipoCorso } from "./tipi-corso";

export type Stato = "In attesa" | "Approvato" | "Respinto" | "In attesa di integrazione";

export type Attestato = {
  id: string;
  dipendente_id: string;
  codice_fiscale: string;
  tipo_corso_id: string;
  data_corso: string;
  data_scadenza_calcolata: string | null;
  ore_dichiarate: number | null;
  url_foto_fronte: string | null;
  url_foto_retro: string | null;
  stato_validazione: Stato;
  note_rifiuto: string | null;
  data_validazione: string | null;
  created_at: string;
  dipendenti?: Dipendente | null;
  tipi_corso?: TipoCorso | null;
};

export type FiltroAttestati = Stato | "Senza PDF" | "Tutti";

/** Rev 3 (2026-10-28 10:55): filtro «Senza PDF» = attestati senza file collegato. */
export async function getAttestati(stato?: FiltroAttestati): Promise<Attestato[]> {
  if (stato === "Senza PDF") {
    return leggiTutto<Attestato>(() =>
      sb
        .from("attestati_caricati")
        .select("*, dipendenti!attestati_caricati_dipendente_id_fkey(*), tipi_corso(*)")
        .or("url_foto_fronte.is.null,url_foto_fronte.eq.")
        .order("created_at", { ascending: false })
        .order("id"),
    );
  }
  return leggiTutto<Attestato>(() => {
    let q = sb
      .from("attestati_caricati")
      .select("*, dipendenti!attestati_caricati_dipendente_id_fkey(*), tipi_corso(*)")
      .order("created_at", { ascending: false })
      .order("id");
    if (stato && stato !== "Tutti") q = q.eq("stato_validazione", stato);
    return q;
  });
}

export async function uploadFoto(file: File, cf: string, lato: string) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${cf}/${Date.now()}-${lato}.${ext}`;
  const { error } = await supabase.storage.from("attestati").upload(path, file);
  if (error) throw error;
  return path;
}

export async function fotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("attestati").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function creaAttestato(input: {
  dipendente_id: string;
  codice_fiscale: string;
  tipo_corso_id: string;
  data_corso: string;
  ore_dichiarate: number | null;
  url_foto_fronte: string | null;
  url_foto_retro: string | null;
}) {
  const { data, error } = await supabase
    .from("attestati_caricati")
    .insert({ ...input, stato_validazione: "In attesa" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

type AttestatoPatch = Partial<Omit<Attestato, "dipendenti" | "tipi_corso">>;

export async function aggiornaAttestato(id: string, patch: AttestatoPatch) {
  const { data, error } = await supabase
    .from("attestati_caricati")
    .update(patch)
    .eq("id", id)
    .select("*, dipendenti!attestati_caricati_dipendente_id_fkey(*), tipi_corso(*)")
    .single();
  if (error) throw error;
  return data as unknown as Attestato;
}

export async function eliminaAttestato(id: string): Promise<void> {
  const { error } = await supabase.from("attestati_caricati").delete().eq("id", id);
  if (error) throw error;
}

export async function scollegaDocumentoAttestato(id: string): Promise<void> {
  const { error } = await supabase
    .from("attestati_caricati")
    .update({ url_foto_fronte: null, url_foto_retro: null })
    .eq("id", id);
  if (error) throw error;
}

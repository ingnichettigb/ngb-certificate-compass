/*
 * File:          attestati.ts
 * Percorso:      src/lib/api/attestati.ts
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Funzioni base get, upload, crea e aggiorna attestati.
 *   - Rev 2 (2026-10-25 20:30): Aggiunte funzioni eliminaAttestato e scollegaDocumentoAttestato.
 *   - Rev 3 (2026-10-28 10:55): Filtro «Senza PDF» = attestati senza file collegato.
 *   - Rev 4 (2026-10-28 11:50): Aggiunto stato «In attesa di integrazione».
 *   - Rev 5 (2026-10-28 14:40): Ripristinato il modulo integrale (tipi, get, upload, crea,
 *                              aggiorna, elimina) con scollegaDocumentoAttestato che azzera
 *                              i link, imposta «Approvato» e registra la data di validazione.
 *   - Rev 6 (2026-11-22): Relazione con tipi_corso resa esplicita (…!attestati_caricati_tipo_corso_id_fkey): la migrazione 0018
 *                              ha aggiunto altre due chiavi verso tipi_corso e la query dava PGRST201 (relazione ambigua).
 *   - Rev 7 (2026-11-23 13:35): Stato «File Attestato mancante» salvato nel database per i corsi registrati senza file:
 *                              statoRegistrato() per i calcoli, statoPerFile() applicato in aggiornaAttestato, scollegamento e filtro «Approvato».
 */
import { supabase } from "@/integrations/supabase/client";
import { leggiTutto, sb } from "./client";
import type { Dipendente } from "./dipendenti";
import type { TipoCorso } from "./tipi-corso";

export type Stato = "In attesa" | "Approvato" | "Respinto" | "In attesa di integrazione" | "File Attestato mancante";

/** Stato salvato nel database per un corso registrato e verificato ma senza il file dell'attestato collegato. */
export const STATO_FILE_MANCANTE = "File Attestato mancante" as const;

/** Corso registrato e verificato (con o senza file): vale per scadenze, ruoli e stampe. */
export function statoRegistrato(stato: string | null | undefined): boolean {
  return stato === "Approvato" || stato === STATO_FILE_MANCANTE;
}

/** Stato coerente con la presenza del file: «Approvato» senza file diventa «File Attestato mancante» e viceversa. */
export function statoPerFile(stato: Stato, urlFronte: string | null | undefined): Stato {
  if (!statoRegistrato(stato)) return stato;
  return urlFronte?.trim() ? "Approvato" : STATO_FILE_MANCANTE;
}

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
  numero_attestato?: string | null;
  /** Decisione dell'operatore su una formazione specifica diversa da quella attesa (migrazione 0018): tutti vuoti o tutti compilati. */
  equivalenza_esito?: "accettata" | "integrazione" | "non_valida" | null;
  equivalenza_corso_svolto?: string | null;
  equivalenza_corso_atteso?: string | null;
  equivalenza_rischio?: "basso" | "medio" | "alto" | null;
  equivalenza_nota?: string | null;
  equivalenza_data?: string | null;
  created_at: string;
  dipendenti?: Dipendente | null;
  tipi_corso?: TipoCorso | null;
};

export type FiltroAttestati = Stato | "Senza PDF" | "Tutti";

export async function getAttestati(stato?: FiltroAttestati): Promise<Attestato[]> {
  if (stato === "Senza PDF") {
    return leggiTutto<Attestato>(() =>
      sb
        .from("attestati_caricati")
        .select("*, dipendenti!attestati_caricati_dipendente_id_fkey(*), tipi_corso!attestati_caricati_tipo_corso_id_fkey(*)")
        .or("url_foto_fronte.is.null,url_foto_fronte.eq.")
        .order("created_at", { ascending: false })
        .order("id"),
    );
  }
  return leggiTutto<Attestato>(() => {
    let q = sb
      .from("attestati_caricati")
      .select("*, dipendenti!attestati_caricati_dipendente_id_fkey(*), tipi_corso!attestati_caricati_tipo_corso_id_fkey(*)")
      .order("created_at", { ascending: false })
      .order("id");
    if (stato === "Approvato") q = q.in("stato_validazione", ["Approvato", STATO_FILE_MANCANTE]);
    else if (stato && stato !== "Tutti") q = q.eq("stato_validazione", stato);
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

/** Campi della decisione dell'operatore sulla formazione specifica (migrazione 0018): si salvano con salvaEquivalenzaAttestato. */
export type CampiEquivalenza =
  | "equivalenza_esito"
  | "equivalenza_corso_svolto"
  | "equivalenza_corso_atteso"
  | "equivalenza_rischio"
  | "equivalenza_nota"
  | "equivalenza_data";

type AttestatoPatch = Partial<Omit<Attestato, "dipendenti" | "tipi_corso" | CampiEquivalenza>>;

export async function aggiornaAttestato(id: string, patch: AttestatoPatch) {
  const corretto = { ...patch };
  if (corretto.stato_validazione && "url_foto_fronte" in corretto) {
    corretto.stato_validazione = statoPerFile(corretto.stato_validazione, corretto.url_foto_fronte);
  }
  const { data, error } = await supabase
    .from("attestati_caricati")
    .update(corretto)
    .eq("id", id)
    .select("*, dipendenti!attestati_caricati_dipendente_id_fkey(*), tipi_corso!attestati_caricati_tipo_corso_id_fkey(*)")
    .single();
  if (error) throw error;
  return data as unknown as Attestato;
}

/**
 * Registra (o annulla, con tutti i campi null) la decisione dell'operatore sulla formazione specifica diversa da quella attesa.
 * Usa il client senza tipi generati finché types.ts non viene rigenerato dopo la migrazione 0018.
 */
export async function salvaEquivalenzaAttestato(
  id: string,
  patch: Pick<Attestato, CampiEquivalenza> | Record<CampiEquivalenza, null>,
): Promise<void> {
  const { error } = await sb.from("attestati_caricati").update(patch).eq("id", id);
  if (error) throw error;
}

export async function eliminaAttestato(id: string): Promise<void> {
  const { error } = await supabase.from("attestati_caricati").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Scollega i file senza eliminare i dati del corso: il link viene azzerato,
 * l'attestato esce dall'attesa di verifica passando a «File Attestato mancante».
 */
export async function scollegaDocumentoAttestato(id: string): Promise<void> {
  const { error } = await supabase
    .from("attestati_caricati")
    .update({
      url_foto_fronte: null,
      url_foto_retro: null,
      stato_validazione: STATO_FILE_MANCANTE,
      data_validazione: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/*
 * File:      documenti.ts
 * Percorso:  src/lib/api/documenti.ts
 * Documenti PDF degli attestati e nomi file standard.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Dipendente } from "./dipendenti";

export const CARTELLA_ARCHIVIO = "Archivio Attestati Sicurezza";

export const TIPI_ATTESTATO_PDF = [
  "Sicurezza Lavoratori",
  "Preposto",
  "Primo Soccorso",
  "Antincendio",
  "Defibrillatore",
  "Altro",
] as const;

export type DocumentoAttestato = {
  id: string;
  dipendente_id: string;
  codice_fiscale: string;
  tipo_attestato: string;
  tipo_personalizzato: string | null;
  data_scadenza: string;
  nome_file: string;
  percorso_file: string;
  created_at: string;
};

/** Normalizza un testo: maiuscolo, senza accenti, spazi -> underscore. */
export function normalizzaNome(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Codice fiscale pulito: solo lettere e numeri, maiuscolo. */
export function pulisciCF(s: string) {
  return (s || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

const pulisciCodiceFiscale = pulisciCF;

/**
 * Nome file standard per l'archivio:
 * AAAA-MM_COGNOME_NOME_CF_TIPO.pdf
 * dove AAAA-MM è l'anno/mese di emanazione (rilascio) dell'attestato.
 */
export function nomeFilePdf(
  cognome: string,
  nome: string,
  tipo: string,
  dataEmanazione: string,
  codiceFiscale?: string,
) {
  const data = (dataEmanazione || "").trim();
  const annoMese = data.length >= 7 ? data.slice(0, 7) : "ANNO-MANCANTE";
  const cf = codiceFiscale ? `_${pulisciCodiceFiscale(codiceFiscale)}` : "";
  return `${annoMese}_${normalizzaNome(cognome)}_${normalizzaNome(nome)}${cf}_${normalizzaNome(tipo)}.pdf`;
}

export function cartellaDipendente(d: Dipendente) {
  return `${normalizzaNome(d.cognome)}_${normalizzaNome(d.nome)}_${d.codice_fiscale.toUpperCase()}`;
}

export async function getDocumenti(dipendenteId: string): Promise<DocumentoAttestato[]> {
  const { data, error } = await supabase
    .from("documenti_attestati")
    .select("*")
    .eq("dipendente_id", dipendenteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentoAttestato[];
}

export async function caricaDocumento(input: {
  dipendente: Dipendente;
  tipo: string;
  tipoPersonalizzato?: string | null;
  dataCorso: string; // Data di emanazione / rilascio dell'attestato
  dataScadenza: string; // Data di scadenza per il registro
  file: File;
}) {
  const etichetta =
    input.tipo === "Altro" && input.tipoPersonalizzato ? input.tipoPersonalizzato : input.tipo;
  const nome = nomeFilePdf(
    input.dipendente.cognome,
    input.dipendente.nome,
    etichetta,
    input.dataCorso,
    input.dipendente.codice_fiscale,
  );
  const percorso = `${CARTELLA_ARCHIVIO}/${cartellaDipendente(input.dipendente)}/${nome}`;

  const { error: upErr } = await supabase.storage
    .from("attestati")
    .upload(percorso, input.file, { upsert: true, contentType: "application/pdf" });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("documenti_attestati")
    .insert({
      dipendente_id: input.dipendente.id,
      codice_fiscale: input.dipendente.codice_fiscale,
      tipo_attestato: input.tipo,
      tipo_personalizzato: input.tipo === "Altro" ? (input.tipoPersonalizzato ?? null) : null,
      data_scadenza: input.dataScadenza,
      nome_file: nome,
      percorso_file: percorso,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DocumentoAttestato;
}

export async function eliminaDocumento(doc: DocumentoAttestato) {
  await supabase.storage.from("attestati").remove([doc.percorso_file]);
  const { error } = await supabase.from("documenti_attestati").delete().eq("id", doc.id);
  if (error) throw error;
}

export async function urlDocumento(percorso: string) {
  const { data, error } = await supabase.storage
    .from("attestati")
    .createSignedUrl(percorso, 60 * 60);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

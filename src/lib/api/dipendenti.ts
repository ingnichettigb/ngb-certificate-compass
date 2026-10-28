/*
 * File:      dipendenti.ts
 * Percorso:  src/lib/api/dipendenti.ts
 * Anagrafica dipendenti.
 */
import { leggiTutto, sb } from "./client";
import { registraClasseEMateria } from "./insegnamento";

export type Dipendente = {
  id: string;
  codice_fiscale: string;
  cognome: string;
  nome: string;
  email: string | null;
  reparto: string | null;
  /** Sottoreparto scelto dentro il reparto (es. "Assistente amministrativo" per ATA). */
  sottoreparto: string | null;
  /** Solo per i reparti che la richiedono (es. Docente): es. "A-26". */
  classe_concorso: string | null;
  /** Materia insegnata, testo libero con suggerimenti. */
  materia: string | null;
  luogo_nascita: string | null;
  data_nascita: string | null;
  /** Codici ATECO letti dall'attestato (testo libero, anche più codici). */
  codice_ateco?: string | null;
  /** Gestione contrattuale (rev 28/10/2026). */
  tipo_contratto?: "indeterminato" | "determinato" | string;
  data_assunzione?: string | null;
  data_fine_contratto?: string | null;
  /** "in_forza" oppure "cessato" (limbo: mai cancellato). */
  stato_lavoratore?: "in_forza" | "cessato" | string;
  data_cessazione?: string | null;
  note_contratto?: string | null;
};

export type DatiContratto = Pick<
  Dipendente,
  "tipo_contratto" | "data_assunzione" | "data_fine_contratto" | "stato_lavoratore" | "data_cessazione" | "note_contratto"
>;

/** Aggiorna i dati contrattuali (riconferma, termine, riattivazione). */
export async function aggiornaContrattoDipendente(id: string, dati: DatiContratto) {
  const pulito = Object.fromEntries(
    Object.entries(dati).map(([k, v]) => [k, v === "" ? null : v]),
  );
  const { error } = await sb.from("dipendenti").update(pulito).eq("id", id);
  if (error) throw error;
}

/** Cambia il reparto di un dipendente già in archivio. */
export async function aggiornaRepartoDipendente(
  id: string,
  reparto: string | null,
  sottoreparto: string | null = null,
) {
  const { error } = await sb
    .from("dipendenti")
    .update({ reparto: reparto || null, sottoreparto: sottoreparto || null })
    .eq("id", id);
  if (error) throw error;
}

/** Aggiorna solo il sottoreparto (il reparto resta quello che è). */
export async function aggiornaSottorepartoDipendente(id: string, sottoreparto: string | null) {
  const { error } = await sb
    .from("dipendenti")
    .update({ sottoreparto: sottoreparto || null })
    .eq("id", id);
  if (error) throw error;
}

/** Aggiorna classe di concorso e materia di un docente già in archivio. */
export async function aggiornaInsegnamentoDipendente(
  id: string,
  classe_concorso: string | null,
  materia: string | null,
) {
  const { error } = await sb
    .from("dipendenti")
    .update({
      classe_concorso: classe_concorso?.trim().toUpperCase() || null,
      materia: materia?.trim() || null,
    })
    .eq("id", id);
  if (error) throw error;
  await registraClasseEMateria(classe_concorso, materia);
}

export async function getDipendenti(): Promise<Dipendente[]> {
  return leggiTutto<Dipendente>(() => sb.from("dipendenti").select("*").order("cognome").order("id"));
}

export async function upsertDipendente(d: Omit<Dipendente, "id">): Promise<Dipendente> {
  const payload = {
    ...d,
    codice_fiscale: d.codice_fiscale.trim().toUpperCase(),
    data_nascita: d.data_nascita || null,
    sottoreparto: d.sottoreparto?.trim() || null,
    classe_concorso: d.classe_concorso?.trim().toUpperCase() || null,
    materia: d.materia?.trim() || null,
  };
  const { data, error } = await sb
    .from("dipendenti")
    .upsert(payload, { onConflict: "codice_fiscale" })
    .select()
    .single();
  if (error) throw error;
  return data as Dipendente;
}

/*
 * File:      insegnamento.ts
 * Percorso:  src/lib/api/insegnamento.ts
 * Classi di concorso e materie.
 */
import { sb } from "./client";

export type ClasseConcorso = {
  id: string;
  codice: string;
  denominazione: string | null;
  usi: number;
  da_lavoratore: boolean;
  attivo: boolean;
};

export type Materia = {
  id: string;
  nome: string;
  classe_concorso: string | null;
  usi: number;
  da_lavoratore: boolean;
  attivo: boolean;
};

export async function getClassiConcorso(): Promise<ClasseConcorso[]> {
  const { data, error } = await sb.from("classi_concorso").select("*").order("codice");
  if (error) throw error;
  return (data ?? []) as ClasseConcorso[];
}

export async function getMaterie(): Promise<Materia[]> {
  const { data, error } = await sb
    .from("materie")
    .select("*")
    .order("usi", { ascending: false })
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Materia[];
}

export async function aggiungiClasseConcorso(codice: string, denominazione?: string | null) {
  const c = codice.trim().toUpperCase();
  if (!c) throw new Error("Scrivi il codice della classe di concorso");
  const { error } = await sb
    .from("classi_concorso")
    .insert({ codice: c, denominazione: denominazione?.trim() || null });
  if (error) {
    if (error.code === "23505") throw new Error(`"${c}" è già presente`);
    throw error;
  }
}

export async function impostaClasseAttiva(id: string, attivo: boolean) {
  const { error } = await sb.from("classi_concorso").update({ attivo }).eq("id", id);
  if (error) throw error;
}

/** Cambia la denominazione di una classe di concorso (vuoto = nessuna denominazione). */
export async function aggiornaDenominazioneClasse(id: string, denominazione: string | null) {
  const valore = denominazione?.trim() || null;
  const { error } = await sb.from("classi_concorso").update({ denominazione: valore }).eq("id", id);
  if (error) throw error;
}

export async function eliminaClasseConcorso(id: string) {
  const { error } = await sb.from("classi_concorso").delete().eq("id", id);
  if (error) throw error;
}

export async function eliminaMateria(id: string) {
  const { error } = await sb.from("materie").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Salva nel database quello che il lavoratore ha scritto, così la prossima
 * persona se lo ritrova già pronto fra i suggerimenti. Non blocca mai l'invio.
 */
export async function registraClasseEMateria(classe?: string | null, materia?: string | null) {
  const c = (classe ?? "").trim();
  const m = (materia ?? "").trim();
  try {
    if (c) await sb.rpc("registra_classe_concorso", { p_codice: c, p_denominazione: null });
    if (m) await sb.rpc("registra_materia", { p_nome: m, p_classe: c || null });
  } catch {
    /* il database dei suggerimenti non è critico: si ignora l'errore */
  }
}

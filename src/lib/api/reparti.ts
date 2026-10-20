/*
 * File:      reparti.ts
 * Percorso:  src/lib/api/reparti.ts
 * Reparti e sottoreparti (Docente, ATA, Studente, …).
 */
import { sb } from "./client";

export type Reparto = {
  id: string;
  nome: string;
  ordine: number;
  attivo: boolean;
  /** Se vero, nel modulo il lavoratore deve indicare classe di concorso e materia. */
  richiede_classe_concorso: boolean;
};

export type Sottoreparto = {
  id: string;
  reparto_id: string;
  codice: string | null;
  nome: string;
  ordine: number;
  attivo: boolean;
};

/** Elenco completo dei reparti (attivi e non). Lancia errore se la tabella non esiste. */
export async function getReparti(): Promise<Reparto[]> {
  const { data, error } = await sb.from("reparti").select("*").order("ordine").order("nome");
  if (error) throw error;
  return (data ?? []) as Reparto[];
}

export async function aggiungiReparto(nome: string, ordine: number) {
  const pulito = nome.trim();
  if (!pulito) throw new Error("Scrivi il nome del reparto");
  const { error } = await sb.from("reparti").insert({ nome: pulito, ordine });
  if (error) {
    if (error.code === "23505") throw new Error(`"${pulito}" è già presente`);
    throw error;
  }
}

export async function impostaRepartoAttivo(id: string, attivo: boolean) {
  const { error } = await sb.from("reparti").update({ attivo }).eq("id", id);
  if (error) throw error;
}

export async function eliminaReparto(id: string) {
  const { error } = await sb.from("reparti").delete().eq("id", id);
  if (error) throw error;
}

/** Attiva/disattiva la richiesta di classe di concorso e materia per un reparto. */
export async function impostaRepartoClasseConcorso(id: string, richiede: boolean) {
  const { error } = await sb
    .from("reparti")
    .update({ richiede_classe_concorso: richiede })
    .eq("id", id);
  if (error) throw error;
}

/** Aggiornamento libero di un reparto (usato dalla tabella di modifica avanzata). */
export async function aggiornaReparto(
  id: string,
  patch: Partial<Pick<Reparto, "nome" | "ordine" | "attivo" | "richiede_classe_concorso">>,
) {
  const pulito = { ...patch };
  if (typeof pulito.nome === "string") {
    pulito.nome = pulito.nome.trim();
    if (!pulito.nome) throw new Error("Il nome non può essere vuoto");
  }
  const { error } = await sb.from("reparti").update(pulito).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error(`"${pulito.nome}" è già presente`);
    throw error;
  }
}

/** Tutti i sottoreparti, di tutti i reparti. */
export async function getSottoreparti(): Promise<Sottoreparto[]> {
  const { data, error } = await sb.from("sottoreparti").select("*").order("ordine").order("nome");
  if (error) throw error;
  return (data ?? []) as Sottoreparto[];
}

export async function aggiungiSottoreparto(input: {
  reparto_id: string;
  nome: string;
  codice?: string | null;
  ordine: number;
}) {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Scrivi il nome del sottoreparto");
  const { error } = await sb.from("sottoreparti").insert({
    reparto_id: input.reparto_id,
    nome,
    codice: input.codice?.trim().toUpperCase() || null,
    ordine: input.ordine,
  });
  if (error) {
    if (error.code === "23505") throw new Error(`"${nome}" è già presente in questo reparto`);
    throw error;
  }
}

export async function impostaSottorepartoAttivo(id: string, attivo: boolean) {
  const { error } = await sb.from("sottoreparti").update({ attivo }).eq("id", id);
  if (error) throw error;
}

export async function eliminaSottoreparto(id: string) {
  const { error } = await sb.from("sottoreparti").delete().eq("id", id);
  if (error) throw error;
}

/** Etichetta leggibile: "AA — Assistente amministrativo". */
export function etichettaSottoreparto(s: Pick<Sottoreparto, "codice" | "nome">) {
  return s.codice ? `${s.codice} — ${s.nome}` : s.nome;
}

/** Vero se il testo del reparto è leggibile (esclude vuoti e date importate male da Excel). */
export function repartoLeggibile(v: string | null | undefined): v is string {
  const t = (v ?? "").trim();
  return t.length > 0 && t.length <= 40 && !/^\d/.test(t);
}

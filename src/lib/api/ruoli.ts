/*
 * File:      ruoli.ts
 * Percorso:  src/lib/api/ruoli.ts
 * Ruoli di sicurezza (Preposto, Antincendio, …).
 * Revisioni:
 *   - Rev 2 (2026-10-31 11:00): Chiavi di cache condivise (CHIAVE_RUOLI, CHIAVE_ASSEGNAZIONI_RUOLI) tra Matrice e Scheda.
 *   - Rev 3 (2026-11-13): creaRuoloSicurezza: crea un ruolo e restituisce la riga inserita (serve l'id per collegarlo a una voce dell'organigramma A3).
 */
import { leggiTutto, sb } from "./client";

/**
 * Chiavi TanStack Query dei ruoli. Matrice abilitazioni, scheda dipendente e impostazioni DEVONO usare queste:
 * con chiavi diverse una spunta cambiata in una schermata restava vecchia nell'altra.
 */
export const CHIAVE_RUOLI = ["ruoli-sicurezza"] as const;
export const CHIAVE_ASSEGNAZIONI_RUOLI = ["dipendenti-ruoli"] as const;

export type RuoloSicurezza = {
  id: string;
  nome: string;
  descrizione: string | null;
  macro_categoria: string | null;
  obbligatorio_tutti: boolean;
  attivo: boolean;
  ordine: number;
};

export type AssegnazioneRuolo = { id: string; dipendente_id: string; ruolo_id: string };

export async function getRuoliSicurezza(): Promise<RuoloSicurezza[]> {
  const { data, error } = await sb.from("ruoli_sicurezza").select("*").order("ordine").order("nome");
  if (error) throw error;
  return (data ?? []) as RuoloSicurezza[];
}

export async function aggiungiRuolo(input: {
  nome: string;
  macro_categoria?: string | null;
  obbligatorio_tutti?: boolean;
  ordine: number;
}) {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Scrivi il nome del ruolo");
  const { error } = await sb.from("ruoli_sicurezza").insert({
    nome,
    macro_categoria: input.macro_categoria?.trim() || null,
    obbligatorio_tutti: input.obbligatorio_tutti ?? false,
    ordine: input.ordine,
  });
  if (error) {
    if (error.code === "23505") throw new Error(`"${nome}" è già presente`);
    throw error;
  }
}

/** Crea un ruolo di sicurezza e ne restituisce la riga (con l'id); «ordine» è l'ultimo + 1. */
export async function creaRuoloSicurezza(input: {
  nome: string;
  macro_categoria?: string | null;
  descrizione?: string | null;
  obbligatorio_tutti?: boolean;
}): Promise<RuoloSicurezza> {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Scrivi il nome del ruolo");
  const { data: ultimo, error: errOrdine } = await sb
    .from("ruoli_sicurezza")
    .select("ordine")
    .order("ordine", { ascending: false })
    .limit(1);
  if (errOrdine) throw errOrdine;
  const ordine = ((ultimo?.[0] as { ordine?: number } | undefined)?.ordine ?? 0) + 1;
  const { data, error } = await sb
    .from("ruoli_sicurezza")
    .insert({
      nome,
      macro_categoria: input.macro_categoria?.trim() || null,
      descrizione: input.descrizione?.trim() || null,
      obbligatorio_tutti: input.obbligatorio_tutti ?? false,
      ordine,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error(`"${nome}" è già presente`);
    throw error;
  }
  return data as RuoloSicurezza;
}

export async function aggiornaRuolo(
  id: string,
  patch: Partial<Pick<RuoloSicurezza, "nome" | "macro_categoria" | "obbligatorio_tutti" | "attivo">>,
) {
  const { error } = await sb.from("ruoli_sicurezza").update(patch).eq("id", id);
  if (error) throw error;
}

export async function eliminaRuolo(id: string) {
  const { error } = await sb.from("ruoli_sicurezza").delete().eq("id", id);
  if (error) throw error;
}

export async function getAssegnazioniRuoli(): Promise<AssegnazioneRuolo[]> {
  return leggiTutto<AssegnazioneRuolo>(() =>
    sb.from("dipendenti_ruoli").select("id, dipendente_id, ruolo_id").order("id"),
  );
}

/** Assegna (true) o toglie (false) un ruolo a un dipendente. */
export async function impostaRuoloDipendente(dipendente_id: string, ruolo_id: string, assegnato: boolean) {
  if (assegnato) {
    const { error } = await sb
      .from("dipendenti_ruoli")
      .upsert({ dipendente_id, ruolo_id }, { onConflict: "dipendente_id,ruolo_id" });
    if (error) throw error;
  } else {
    const { error } = await sb
      .from("dipendenti_ruoli")
      .delete()
      .eq("dipendente_id", dipendente_id)
      .eq("ruolo_id", ruolo_id);
    if (error) throw error;
  }
}

/** Ruoli effettivi del dipendente: quelli spuntati + quelli obbligatori per tutti. */
export function ruoliDelDipendente(
  dipendenteId: string,
  ruoli: RuoloSicurezza[],
  assegnazioni: AssegnazioneRuolo[],
): RuoloSicurezza[] {
  const ids = new Set(assegnazioni.filter((a) => a.dipendente_id === dipendenteId).map((a) => a.ruolo_id));
  return ruoli.filter((r) => r.attivo && (r.obbligatorio_tutti || ids.has(r.id)));
}

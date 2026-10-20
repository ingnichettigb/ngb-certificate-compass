/*
 * File:      ruoli.ts
 * Percorso:  src/lib/api/ruoli.ts
 * Ruoli di sicurezza (Preposto, Antincendio, …).
 */
import { leggiTutto, sb } from "./client";

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

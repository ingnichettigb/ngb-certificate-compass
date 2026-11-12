/*
 * File:      modelli-nomina.ts
 * Percorso:  src/lib/api/modelli-nomina.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Lettura e salvataggio dei testi delle nomine (tabella modelli_nomina). Se la tabella non c'è ancora
 *            (migration 0009 non applicata) o la riga manca, si usano i testi di default: la pagina funziona comunque.
 */
import { sb } from "./client";
import { MODELLI_DEFAULT, modelloDefault } from "@/features/nomine/modelli-default";
import type { ModelloNomina, TipoNomina } from "@/features/nomine/tipi";

export const CHIAVE_MODELLI_NOMINA = ["modelli-nomina"] as const;

const CAMPI = [
  "tipo",
  "titolo",
  "oggetto",
  "introduzione",
  "corpo",
  "chiusura",
  "nota_firma",
  "etichetta_firma",
  "formazione",
  "updated_at",
].join(",");

/** Unisce la riga del database ai testi di default (un campo vuoto/mancante torna al default). */
export function uniscimodello(
  tipo: TipoNomina,
  riga: Partial<ModelloNomina> | null | undefined,
): ModelloNomina {
  const base = modelloDefault(tipo);
  if (!riga) return base;
  const m: ModelloNomina = { ...base };
  for (const k of [
    "titolo",
    "oggetto",
    "introduzione",
    "corpo",
    "chiusura",
    "nota_firma",
    "etichetta_firma",
    "formazione",
  ] as const) {
    const v = riga[k];
    if (typeof v === "string") m[k] = v;
  }
  m.updated_at = riga.updated_at ?? null;
  return m;
}

/** Tutti i modelli: quelli salvati nel database sopra i default. Errori di lettura = solo default. */
export async function getModelliNomina(): Promise<Record<TipoNomina, ModelloNomina>> {
  const out = Object.fromEntries(
    (Object.keys(MODELLI_DEFAULT) as TipoNomina[]).map((t) => [t, modelloDefault(t)]),
  ) as Record<TipoNomina, ModelloNomina>;
  try {
    const { data, error } = await sb.from("modelli_nomina").select(CAMPI);
    if (error) return out;
    for (const r of (data ?? []) as Partial<ModelloNomina>[]) {
      const t = r.tipo as TipoNomina | undefined;
      if (t && t in out) out[t] = uniscimodello(t, r);
    }
  } catch {
    /* tabella non ancora creata: restano i default */
  }
  return out;
}

export async function salvaModelloNomina(m: ModelloNomina): Promise<void> {
  const { updated_at: _u, ...campi } = m;
  void _u;
  const { error } = await sb
    .from("modelli_nomina")
    .upsert({ ...campi, updated_at: new Date().toISOString() }, { onConflict: "tipo" });
  if (error) throw error;
}

/** Torna al testo di partenza: cancella la riga salvata. */
export async function ripristinaModelloNomina(tipo: TipoNomina): Promise<void> {
  const { error } = await sb.from("modelli_nomina").delete().eq("tipo", tipo);
  if (error) throw error;
}

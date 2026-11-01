/*
 * File:          ditta.ts
 * Percorso:      src/lib/api/ditta.ts
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 12:00): Dati della ditta nel database (tabella ditta, una sola riga) e soglie di legge (soglie_ditta);
 *     conteggio dei lavoratori in forza; importazione una tantum dei dati salvati nel vecchio modo nel browser.
 */
import type { Database } from "@/integrations/supabase/types";
import {
  DATI_AZIENDA_DEFAULT,
  esistonoDatiAziendaLocali,
  leggiDatiAziendaLocale,
  type DatiAzienda,
} from "@/lib/dati-azienda";
import { sb } from "./client";

export type Ditta = Database["public"]["Tables"]["ditta"]["Row"];
export type DittaModifica = Database["public"]["Tables"]["ditta"]["Update"];
export type SogliaDitta = Database["public"]["Tables"]["soglie_ditta"]["Row"];

/** Chiavi di cache (TanStack Query) dei dati ditta. */
export const CHIAVE_DITTA = ["ditta"] as const;
export const CHIAVE_SOGLIE_DITTA = ["soglie-ditta"] as const;
export const CHIAVE_LAVORATORI_IN_FORZA = ["lavoratori-in-forza"] as const;

/** Legge la riga della ditta (null se non esiste ancora). */
export async function getDitta(): Promise<Ditta | null> {
  const { data, error } = await sb.from("ditta").select("*").eq("id", true).maybeSingle();
  if (error) throw error;
  return (data as Ditta | null) ?? null;
}

/** Salva solo i campi indicati; crea la riga se manca. */
export async function salvaDitta(modifica: DittaModifica): Promise<void> {
  const { error } = await sb.from("ditta").upsert({ ...modifica, id: true }, { onConflict: "id" });
  if (error) throw error;
}

export async function getSoglieDitta(): Promise<SogliaDitta[]> {
  const { data, error } = await sb.from("soglie_ditta").select("*").order("ambito").order("ordine");
  if (error) throw error;
  return (data ?? []) as SogliaDitta[];
}

/** Numero di lavoratori «in forza» nel programma (esclusi i cessati). */
export async function contaLavoratoriInForza(): Promise<number> {
  const { count, error } = await sb
    .from("dipendenti")
    .select("id", { count: "exact", head: true })
    .eq("stato_lavoratore", "in_forza");
  if (error) throw error;
  return count ?? 0;
}

/** Dal database al formato usato dalle email (firma, mittente). */
export function dittaADatiAzienda(d: Partial<Ditta> | null | undefined): DatiAzienda {
  const base = DATI_AZIENDA_DEFAULT;
  return {
    nomeAzienda: d?.ragione_sociale || base.nomeAzienda,
    referente: d?.referente ?? base.referente,
    email: d?.email ?? base.email,
    telefono: d?.telefono ?? base.telefono,
    via: d?.indirizzo ?? base.via,
    cap: d?.cap ?? base.cap,
    comune: d?.comune ?? base.comune,
    provincia: d?.provincia ?? base.provincia,
    emailMittenteResend: d?.email_mittente_resend || base.emailMittenteResend,
  };
}

/** Dati per le email letti dal database; se non raggiungibile ripiega su quelli del browser. */
export async function getDatiAzienda(): Promise<DatiAzienda> {
  try {
    return dittaADatiAzienda(await getDitta());
  } catch {
    return leggiDatiAziendaLocale();
  }
}

/** Valori predefiniti della riga ditta nel database: un campo uguale a questi (o vuoto) conta come «mai personalizzato». */
const PREDEFINITI_DB: Partial<Record<keyof Ditta, string>> = {
  ragione_sociale: "Nichetti Gian Battista",
  cap: "26015",
  comune: "Soresina",
  provincia: "CR",
  referente: "Gian Battista Nichetti",
  email_mittente_resend: "onboarding@resend.dev",
};

const CORRISPONDENZE: [keyof DatiAzienda, keyof Ditta][] = [
  ["nomeAzienda", "ragione_sociale"],
  ["email", "email"],
  ["referente", "referente"],
  ["telefono", "telefono"],
  ["via", "indirizzo"],
  ["cap", "cap"],
  ["comune", "comune"],
  ["provincia", "provincia"],
  ["emailMittenteResend", "email_mittente_resend"],
];

/**
 * Cosa copiare dal browser al database: solo i campi del browser compilati dove nel database c'è ancora il valore
 * predefinito o niente. Non sovrascrive mai un dato già personalizzato nel database.
 */
export function calcolaImportazione(locale: DatiAzienda, db: Partial<Ditta> | null): DittaModifica {
  const patch: Record<string, string> = {};
  for (const [chiaveLocale, chiaveDb] of CORRISPONDENZE) {
    const valoreLocale = String(locale[chiaveLocale] ?? "").trim();
    if (!valoreLocale) continue;
    const valoreDb = String(db?.[chiaveDb] ?? "").trim();
    const nonPersonalizzato = valoreDb === "" || valoreDb === PREDEFINITI_DB[chiaveDb];
    if (nonPersonalizzato && valoreLocale !== valoreDb) patch[chiaveDb] = valoreLocale;
  }
  return patch as DittaModifica;
}

const CHIAVE_IMPORTATO = "archivio_attestati_dati_azienda_importati_v1";
let importazioneInCorso: Promise<boolean> | null = null;

/**
 * Importa nel database i dati ditta salvati in questo browser con la vecchia modalità, una volta sola.
 * Restituisce true se ha scritto qualcosa.
 */
export function importaDatiDalBrowserUnaVolta(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  try {
    if (localStorage.getItem(CHIAVE_IMPORTATO) || !esistonoDatiAziendaLocali())
      return Promise.resolve(false);
  } catch {
    return Promise.resolve(false);
  }
  if (!importazioneInCorso) {
    importazioneInCorso = (async () => {
      try {
        const patch = calcolaImportazione(leggiDatiAziendaLocale(), await getDitta());
        const daScrivere = Object.keys(patch).length > 0;
        if (daScrivere) await salvaDitta(patch);
        localStorage.setItem(CHIAVE_IMPORTATO, new Date().toISOString());
        return daScrivere;
      } catch {
        return false; // database non raggiungibile: si riprova al prossimo avvio
      } finally {
        importazioneInCorso = null;
      }
    })();
  }
  return importazioneInCorso;
}

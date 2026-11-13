/*
 * File:      ditta.ts
 * Percorso:  src/lib/api/ditta.ts
 * Data creaz: 01/11/2026
 * Revisioni:
 *   rev 1 — 01/11/2026 12:00 — Modulo API database per anagrafica ditta e soglie di sicurezza D.Lgs. 81/08.
 *   rev 2 — 01/11/2026 14:00 — Chiavi di cache condivise; conteggio lavoratori in forza; dati per le email letti dal database;
 *                              importazione una tantum dei dati ditta salvati nel browser.
 *   rev 3 — 09/11/2026 12:05 — Aggiunto campo ASPP tra le figure della sicurezza.
 *   rev 4 — 10/11/2026 15:25 — Aggiunto campo RLS tra le figure della sicurezza.
 *   rev 5 — 10/11/2026 16:10 — Voci aggiuntive della tavola Organigramma A3 (organigramma_voci).
 *   rev 6 — 12/11/2026 06:53 — Logo aziendale persistente condiviso con pagine, stampe e backup.
 */
import { sb } from "./client";
import {
  DATI_AZIENDA_DEFAULT,
  esistonoDatiAziendaLocali,
  leggiDatiAziendaLocale,
  salvaDatiAzienda,
  DatiAzienda,
} from "../dati-azienda";

/** Chiavi TanStack Query: scheda Ditta e avvisi in testata DEVONO usare queste, per aggiornarsi insieme. */
export const CHIAVE_DITTA = ["ditta_anagrafica"] as const;
export const CHIAVE_SOGLIE_DITTA = ["soglie_ditta"] as const;
export const CHIAVE_LAVORATORI_IN_FORZA = ["lavoratori-in-forza"] as const;

export type CodiceAteco = {
  codice: string;
  descrizione: string;
  rischio?: "basso" | "medio" | "alto";
};

export type DittaRecord = {
  id: boolean;
  ragione_sociale: string;
  logo_data_url?: string | null;
  codice_fiscale: string | null;
  partita_iva: string | null;
  indirizzo: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string | null;
  pec: string | null;
  /** Sito web, stampato nell'intestazione delle nomine (migration 0011). */
  sito_web?: string | null;
  /** Riga istituzionale sopra il nome, es. «MINISTERO DELL'ISTRUZIONE E DEL MERITO» (migration 0011). */
  intestazione_ufficiale?: string | null;
  referente: string | null;
  email_mittente_resend: string | null;
  datore_di_lavoro: string | null;
  rspp: string | null;
  aspp: string | null;
  rls: string | null;
  medico_competente: string | null;
  codici_ateco: CodiceAteco[];
  rischio_ditta: "basso" | "medio" | "alto" | null;
  reparti_rischio_differenziato: boolean;
  n_lavoratori_dichiarato: number | null;
  n_lavoratori_data_aggiornamento: string | null;
  e_scuola: boolean;
  presenze_contemporanee_max: number | null;
  presenze_data_aggiornamento: string | null;
  livello_antincendio: 1 | 2 | 3 | null;
  organigramma_voci?: VoceOrganigramma[];
  created_at?: string;
  updated_at?: string;
};

/** Voce libera dell'organigramma A3 (es. «Addetto registro antincendio»): titolo e nominativi. */
export type VoceOrganigramma = { titolo: string; nomi: string[] };

export type SogliaDitta = {
  id: string;
  ambito: "rls" | "primo_soccorso" | "antincendio_presenze" | "idoneita_tecnica_presenze";
  da: number;
  a: number | null;
  etichetta: string;
  esito: string;
  note: string | null;
  ordine: number;
  attiva: boolean;
};

export const DITTA_DEFAULT: DittaRecord = {
  id: true,
  ragione_sociale: "Anagrafica ditta",
  logo_data_url: null,
  codice_fiscale: null,
  partita_iva: null,
  indirizzo: null,
  cap: "26015",
  comune: "Soresina",
  provincia: "CR",
  telefono: null,
  email: null,
  pec: null,
  referente: null,
  email_mittente_resend: "onboarding@resend.dev",
  datore_di_lavoro: null,
  rspp: null,
  aspp: null,
  rls: null,
  medico_competente: null,
  codici_ateco: [],
  rischio_ditta: "medio",
  reparti_rischio_differenziato: false,
  n_lavoratori_dichiarato: null,
  n_lavoratori_data_aggiornamento: null,
  e_scuola: false,
  presenze_contemporanee_max: null,
  presenze_data_aggiornamento: null,
  livello_antincendio: 2,
};

/** Legge l'anagrafica singleton della ditta dal DB. */
export async function getDitta(): Promise<DittaRecord> {
  const { data, error } = await sb
    .from("ditta")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DITTA_DEFAULT;

  return {
    ...DITTA_DEFAULT,
    ...data,
    codici_ateco: Array.isArray(data.codici_ateco) ? (data.codici_ateco as CodiceAteco[]) : [],
    organigramma_voci: Array.isArray((data as { organigramma_voci?: unknown }).organigramma_voci)
      ? ((data as { organigramma_voci: VoceOrganigramma[] }).organigramma_voci)
      : [],
  };
}

/** Salva o aggiorna l'anagrafica ditta nel DB e sincronizza il fallback localStorage per le email. */
export async function salvaDitta(record: Partial<DittaRecord>): Promise<DittaRecord> {
  const payload = {
    ...record,
    id: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("ditta")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;

  // Sincronizzazione retrocompatibile con il localStorage per email Resend
  const syncStorage: DatiAzienda = {
    nomeAzienda: data.ragione_sociale || "",
    referente: data.referente || "",
    email: data.email || "",
    telefono: data.telefono || "",
    via: data.indirizzo || "",
    cap: data.cap || "26015",
    comune: data.comune || "Soresina",
    provincia: data.provincia || "CR",
    emailMittenteResend: data.email_mittente_resend || "onboarding@resend.dev",
  };
  salvaDatiAzienda(syncStorage);

  return {
    ...DITTA_DEFAULT,
    ...data,
    codici_ateco: Array.isArray(data.codici_ateco) ? (data.codici_ateco as CodiceAteco[]) : [],
  };
}

/** Legge le soglie normative configurate nel DB. */
export async function getSoglieDitta(): Promise<SogliaDitta[]> {
  const { data, error } = await sb
    .from("soglie_ditta")
    .select("*")
    .eq("attiva", true)
    .order("ambito", { ascending: true })
    .order("ordine", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SogliaDitta[];
}

/** Trova la soglia corrispondente a un valore numerico per un dato ambito. */
export function calcolaSoglia(
  soglie: SogliaDitta[],
  ambito: SogliaDitta["ambito"],
  valore: number | null | undefined
): SogliaDitta | null {
  if (valore === null || valore === undefined || isNaN(valore)) return null;
  const ambitoSoglie = soglie.filter((s) => s.ambito === ambito);
  return (
    ambitoSoglie.find((s) => valore >= s.da && (s.a === null || valore <= s.a)) ?? null
  );
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

/** Dal database al formato usato dalle email (firma e mittente). */
export function dittaADatiAzienda(d: Partial<DittaRecord> | null | undefined): DatiAzienda {
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

/** Dati per le email letti dal database; se non raggiungibile ripiega su quelli salvati nel browser. */
export async function getDatiAzienda(): Promise<DatiAzienda> {
  try {
    return dittaADatiAzienda(await getDitta());
  } catch {
    return leggiDatiAziendaLocale();
  }
}

/** Valori predefiniti: un campo del database uguale a questi (o vuoto) conta come «mai personalizzato». */
const PREDEFINITI_DB: Partial<Record<keyof DittaRecord, string>> = {
  ragione_sociale: DITTA_DEFAULT.ragione_sociale,
  cap: DITTA_DEFAULT.cap ?? "",
  comune: DITTA_DEFAULT.comune ?? "",
  provincia: DITTA_DEFAULT.provincia ?? "",
  referente: DITTA_DEFAULT.referente ?? "",
  email_mittente_resend: DITTA_DEFAULT.email_mittente_resend ?? "",
};

const CORRISPONDENZE: [keyof DatiAzienda, keyof DittaRecord][] = [
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
export function calcolaImportazione(locale: DatiAzienda, db: Partial<DittaRecord> | null): Partial<DittaRecord> {
  const patch: Record<string, string> = {};
  for (const [chiaveLocale, chiaveDb] of CORRISPONDENZE) {
    const valoreLocale = String(locale[chiaveLocale] ?? "").trim();
    if (!valoreLocale) continue;
    const valoreDb = String(db?.[chiaveDb] ?? "").trim();
    const nonPersonalizzato = valoreDb === "" || valoreDb === PREDEFINITI_DB[chiaveDb];
    if (nonPersonalizzato && valoreLocale !== valoreDb) patch[chiaveDb] = valoreLocale;
  }
  return patch as Partial<DittaRecord>;
}

const CHIAVE_IMPORTATO = "archivio_attestati_dati_azienda_importati_v1";
let importazioneInCorso: Promise<boolean> | null = null;

/**
 * Importa nel database i dati ditta salvati in questo browser con la vecchia modalità, una volta sola.
 * Restituisce true se ha scritto qualcosa. Se il database non risponde non segna l'importazione come fatta.
 */
export function importaDatiDalBrowserUnaVolta(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  try {
    if (localStorage.getItem(CHIAVE_IMPORTATO) || !esistonoDatiAziendaLocali()) return Promise.resolve(false);
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
        return false;
      } finally {
        importazioneInCorso = null;
      }
    })();
  }
  return importazioneInCorso;
}

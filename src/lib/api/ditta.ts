/*
 * File:      ditta.ts
 * Percorso:  src/lib/api/ditta.ts
 * Data creaz: 01/11/2026
 * Revisioni:
 *   rev 1 — 01/11/2026 12:00 — Modulo API database per anagrafica ditta e soglie di sicurezza D.Lgs. 81/08.
 */
import { sb } from "./client";
import { salvaDatiAzienda, DatiAzienda } from "../dati-azienda";

export type CodiceAteco = {
  codice: string;
  descrizione: string;
  rischio?: "basso" | "medio" | "alto";
};

export type DittaRecord = {
  id: boolean;
  ragione_sociale: string;
  codice_fiscale: string | null;
  partita_iva: string | null;
  indirizzo: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string | null;
  pec: string | null;
  referente: string | null;
  email_mittente_resend: string | null;
  datore_di_lavoro: string | null;
  rspp: string | null;
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
  created_at?: string;
  updated_at?: string;
};

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
  ragione_sociale: "Nichetti Gian Battista",
  codice_fiscale: null,
  partita_iva: null,
  indirizzo: null,
  cap: "26015",
  comune: "Soresina",
  provincia: "CR",
  telefono: null,
  email: null,
  pec: null,
  referente: "Gian Battista Nichetti",
  email_mittente_resend: "onboarding@resend.dev",
  datore_di_lavoro: null,
  rspp: null,
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

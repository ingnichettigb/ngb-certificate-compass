/*
 * File:          form-ditta.ts
 * Percorso:      src/features/ditta/form-ditta.ts
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 13:00): Conversione tra la riga della tabella ditta e il modulo «Dati ditta o studio» (testi del modulo,
 *     numeri e date di aggiornamento).
 */
import type { Ditta, DittaModifica } from "@/lib/api/ditta";
import type { FormSicurezza } from "./SezioneSicurezzaDitta";
import type { CodiceAteco, LivelloRischio } from "./regole-ditta";

export type FormAnagrafica = {
  ragione_sociale: string;
  email: string;
  referente: string;
  telefono: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  codice_fiscale: string;
  partita_iva: string;
  pec: string;
  datore_di_lavoro: string;
  rspp: string;
  medico_competente: string;
  email_mittente_resend: string;
};

export type FormDitta = FormAnagrafica & FormSicurezza;

const testo = (v: string | null | undefined) => v ?? "";
const oppureNull = (v: string) => (v.trim() === "" ? null : v.trim());
const numeroONull = (v: string) => (v.trim() === "" ? null : Number(v));

function elencoAteco(json: unknown): CodiceAteco[] {
  return Array.isArray(json)
    ? (json as CodiceAteco[]).filter((c) => c && typeof c.codice === "string")
    : [];
}

export function formDaDitta(d: Partial<Ditta> | null | undefined): FormDitta {
  return {
    ragione_sociale: testo(d?.ragione_sociale),
    email: testo(d?.email),
    referente: testo(d?.referente),
    telefono: testo(d?.telefono),
    indirizzo: testo(d?.indirizzo),
    cap: testo(d?.cap),
    comune: testo(d?.comune),
    provincia: testo(d?.provincia),
    codice_fiscale: testo(d?.codice_fiscale),
    partita_iva: testo(d?.partita_iva),
    pec: testo(d?.pec),
    datore_di_lavoro: testo(d?.datore_di_lavoro),
    rspp: testo(d?.rspp),
    medico_competente: testo(d?.medico_competente),
    email_mittente_resend: testo(d?.email_mittente_resend),
    codici_ateco: elencoAteco(d?.codici_ateco),
    rischio_ditta: (d?.rischio_ditta as LivelloRischio | null | undefined) ?? "",
    reparti_rischio_differenziato: Boolean(d?.reparti_rischio_differenziato),
    n_lavoratori_dichiarato:
      d?.n_lavoratori_dichiarato == null ? "" : String(d.n_lavoratori_dichiarato),
    e_scuola: Boolean(d?.e_scuola),
    presenze_contemporanee_max:
      d?.presenze_contemporanee_max == null ? "" : String(d.presenze_contemporanee_max),
    livello_antincendio:
      d?.livello_antincendio == null ? "" : (String(d.livello_antincendio) as "1" | "2" | "3"),
  };
}

/** Campi da scrivere: la data di aggiornamento di lavoratori e presenze si imposta solo se il numero è cambiato. */
export function modificaDaForm(
  f: FormDitta,
  precedente: Partial<Ditta> | null | undefined,
  oggi: string,
): DittaModifica {
  const lavoratori = numeroONull(f.n_lavoratori_dichiarato);
  const presenze = numeroONull(f.presenze_contemporanee_max);
  const m: DittaModifica = {
    ragione_sociale: f.ragione_sociale.trim(),
    email: oppureNull(f.email),
    referente: oppureNull(f.referente),
    telefono: oppureNull(f.telefono),
    indirizzo: oppureNull(f.indirizzo),
    cap: oppureNull(f.cap),
    comune: oppureNull(f.comune),
    provincia: oppureNull(f.provincia),
    codice_fiscale: oppureNull(f.codice_fiscale),
    partita_iva: oppureNull(f.partita_iva),
    pec: oppureNull(f.pec),
    datore_di_lavoro: oppureNull(f.datore_di_lavoro),
    rspp: oppureNull(f.rspp),
    medico_competente: oppureNull(f.medico_competente),
    email_mittente_resend: oppureNull(f.email_mittente_resend),
    codici_ateco: f.codici_ateco as unknown as NonNullable<DittaModifica["codici_ateco"]>,
    rischio_ditta: f.rischio_ditta || null,
    reparti_rischio_differenziato: f.reparti_rischio_differenziato,
    n_lavoratori_dichiarato: lavoratori,
    e_scuola: f.e_scuola,
    presenze_contemporanee_max: presenze,
    livello_antincendio: f.livello_antincendio ? Number(f.livello_antincendio) : null,
  };
  if (lavoratori !== (precedente?.n_lavoratori_dichiarato ?? null))
    m.n_lavoratori_data_aggiornamento = lavoratori === null ? null : oggi;
  if (presenze !== (precedente?.presenze_contemporanee_max ?? null))
    m.presenze_data_aggiornamento = presenze === null ? null : oggi;
  return m;
}

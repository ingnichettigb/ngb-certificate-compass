/*
 * File:      esenzioni-rspp.ts
 * Percorso:  src/features/scadenze/esenzioni-rspp.ts
 * Data creazione: 2026-11-10
 * Revisioni:
 * - Rev 1 (2026-11-10): Regola «RSPP valido»: il lavoratore che è anche Preposto deve fare il corso Preposto (base)
 *   ma NON il corso di aggiornamento Preposto finché ha un attestato RSPP valido.
 * - Rev 2 (2026-11-10): Vale anche per l'ASPP (modulo B o aggiornamento ASPP).
 *
 * Funzioni pure, senza accesso al database.
 *
 * Cosa significa «attestato RSPP/ASPP valido» (da modificare qui se cambia il criterio):
 *   un attestato APPROVATO di uno dei corsi in CODICI_RSPP_QUALIFICANTI che non è scaduto oggi:
 *   RSPP = modulo C o aggiornamento RSPP; ASPP = modulo B o aggiornamento ASPP.
 *   Il solo modulo A (RSPP e ASPP) e il solo modulo B dell'RSPP non bastano: non qualificano.
 * L'esenzione riguarda solo l'AGGIORNAMENTO Preposto. Il corso Preposto base resta obbligatorio.
 */
import type { Attestato } from "@/lib/api";
import type { PosizioneCiclo } from "./types";

/** Codici dei corsi che, se attestati e non scaduti, rendono il lavoratore «RSPP/ASPP valido». */
export const CODICI_RSPP_QUALIFICANTI: readonly string[] = [
  "SIC-RSPP-C",
  "SIC-RSPP-AGG",
  "SIC-ASPP-B",
  "SIC-ASPP-AGG",
];

/** Un RSPP/ASPP è valido «fino a» una data; `fino = null` significa senza scadenza. */
export type ValiditaRspp = { fino: string | null };

type CorsoLike = {
  macro_categoria?: string | null;
  codice?: string | null;
  nome_corso?: string | null;
  livello_specifico?: string | null;
};

/** Data ISO YYYY-MM-DD locale (senza fusi orari). */
export function oggiIso(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

function giorniTra(da: string, a: string): number {
  const [y1, m1, d1] = da.slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = a.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y2!, m2! - 1, d2!) - Date.UTC(y1!, m1! - 1, d1!)) / 86_400_000);
}

function dataItaliana(iso: string): string {
  const [y, m, g] = iso.slice(0, 10).split("-");
  return `${g}/${m}/${y}`;
}

/** Corsi della famiglia ASPP / RSPP (codici SIC-ASPP-… e SIC-RSPP-…). */
export function famigliaAsppRspp(c: CorsoLike | null | undefined): "ASPP" | "RSPP" | null {
  const m = /^SIC-(ASPP|RSPP)-/i.exec((c?.codice ?? "").trim());
  return m ? (m[1]!.toUpperCase() as "ASPP" | "RSPP") : null;
}

export function eCorsoPreposto(c: CorsoLike | null | undefined): boolean {
  return (
    (c?.macro_categoria ?? "").toLowerCase().includes("preposto") ||
    (c?.codice ?? "").toUpperCase().startsWith("PRP-") ||
    (c?.nome_corso ?? "").toLowerCase().includes("preposto")
  );
}

/** Corso di AGGIORNAMENTO Preposto (quello da cui l'RSPP valido esonera). Il base non lo è. */
export function eAggiornamentoPreposto(c: CorsoLike | null | undefined): boolean {
  if (!c || !eCorsoPreposto(c)) return false;
  return (
    /AGG/i.test(c.codice ?? "") ||
    (c.nome_corso ?? "").toLowerCase().includes("aggiornamento") ||
    (c.livello_specifico ?? "").toLowerCase().includes("aggiorn")
  );
}

function eRsppQualificante(a: Attestato): boolean {
  const cod = (a.tipi_corso?.codice ?? "").trim().toUpperCase();
  return a.stato_validazione === "Approvato" && CODICI_RSPP_QUALIFICANTI.includes(cod);
}

/**
 * Per ogni lavoratore con un RSPP valido oggi: fino a quando (null = senza scadenza).
 * I lavoratori senza RSPP valido non compaiono nella mappa.
 */
export function mappaValiditaRspp(attestati: Attestato[], oggi: string = oggiIso()): Map<string, ValiditaRspp> {
  const mappa = new Map<string, ValiditaRspp>();
  for (const a of attestati) {
    if (!a.dipendente_id || !eRsppQualificante(a)) continue;
    const scad = a.data_scadenza_calcolata;
    if (scad && scad < oggi) continue; // scaduto
    const prima = mappa.get(a.dipendente_id);
    if (!prima) {
      mappa.set(a.dipendente_id, { fino: scad ?? null });
    } else if (prima.fino !== null) {
      mappa.set(a.dipendente_id, { fino: scad === null || scad > prima.fino ? (scad ?? null) : prima.fino });
    }
  }
  return mappa;
}

export function validitaRspp(
  dipendenteId: string,
  attestati: Attestato[],
  oggi: string = oggiIso(),
): ValiditaRspp | null {
  return mappaValiditaRspp(
    attestati.filter((a) => a.dipendente_id === dipendenteId),
    oggi,
  ).get(dipendenteId) ?? null;
}

export function motivoEsenzioneRspp(v: ValiditaRspp): string {
  return v.fino
    ? `Esente dall'aggiornamento Preposto: RSPP/ASPP valido fino al ${dataItaliana(v.fino)}`
    : "Esente dall'aggiornamento Preposto: RSPP/ASPP valido (senza scadenza)";
}

/**
 * Ciclo Preposto di un lavoratore con RSPP valido: l'aggiornamento non serve finché l'RSPP è valido,
 * quindi la scadenza da rispettare diventa quella dell'RSPP (se più lontana di quella del ciclo).
 * Non cambia nulla se il Preposto base va rifatto (ciclo decaduto): il base resta obbligatorio.
 */
export function applicaEsenzioneRspp(ciclo: PosizioneCiclo, v: ValiditaRspp): PosizioneCiclo {
  if (!ciclo.regolaPreposti) return ciclo;
  if (ciclo.stato === "decaduto" || ciclo.richiedeNuovoCorsoBase) return ciclo;

  const sc = ciclo.scadenzaEffettiva;
  const nuova = v.fino === null ? null : sc && sc > v.fino ? sc : v.fino;
  const giaInRegola = ciclo.stato === "valido" || ciclo.stato === "in_scadenza" || ciclo.stato === "senza_scadenza";
  if (nuova === sc && giaInRegola) return ciclo; // il ciclo copre già più dell'RSPP

  const giorni = nuova === null ? null : giorniTra(ciclo.dataValutazione, nuova);
  return {
    ...ciclo,
    scadenzaEffettiva: nuova,
    giorniAllaScadenza: giorni,
    stato: nuova === null ? "senza_scadenza" : giorni! <= 90 ? "in_scadenza" : "valido",
    oreAccumulate: 0,
    scadenzaPortataAlTaglio: false,
    motivoScadenza: motivoEsenzioneRspp(v),
    esenteRspp: true,
  };
}

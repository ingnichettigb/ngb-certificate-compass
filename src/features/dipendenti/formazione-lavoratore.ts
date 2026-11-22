/*
 * File:          formazione-lavoratore.ts
 * Percorso:      src/features/dipendenti/formazione-lavoratore.ts
 * Data creazione: 2026-11-21
 * «Formazione lavoratore completa»: il prerequisito di tutti i ruoli che richiedono LAVORATORE (es. le attrezzature). Vale quando il
 * lavoratore ha svolto il corso base e la formazione specifica del grado di rischio della ditta. Quali corsi sono attesi lo dice la
 * Tabella 02 (righe del ruolo LAVORATORE): nessun codice di corso scritto qui.
 * Una formazione specifica DIVERSA da quella attesa (es. 12 ore con ditta a rischio medio) non si accetta da sola: l'esito è «diversa»
 * e la decisione spetta all'operatore (Fase 5). Un corso svolto conta anche se è scaduto: la scadenza si segue con gli aggiornamenti.
 * Funzioni pure.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 4).
 */
import type { Attestato } from "@/lib/api/attestati";
import { CODICE_RUOLO, normalizzaCodice } from "@/lib/api/codici-ruoli";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { eParametroRischio, regolaApplicabile, type ContestoRegole } from "./matrice/condizioni-regole";

export type StatoSpecifica =
  /** C'è il corso specifico atteso per il rischio della ditta. */
  | "presente"
  /** Non c'è nessun corso specifico. */
  | "mancante"
  /** C'è un corso specifico di un altro grado di rischio: serve la decisione dell'operatore. */
  | "diversa"
  /** Il grado di rischio della ditta non è impostato: non si può dire quale corso sia atteso. */
  | "non-valutabile";

export type EsitoFormazioneLavoratore = {
  /** Corso base e formazione specifica attesa entrambi presenti. */
  completa: boolean;
  base: { attesi: string[]; mancanti: string[] };
  specifica: { attesa: string | null; stato: StatoSpecifica; trovata: string | null };
  /** Frase in italiano per l'operatore. */
  motivo: string;
};

/** Codici (maiuscoli) dei corsi che il lavoratore ha svolto: attestati approvati. */
export function corsiSvoltiDa(attestati: Attestato[], dipendenteId: string): Set<string> {
  const out = new Set<string>();
  for (const a of attestati) {
    if (a.dipendente_id !== dipendenteId || a.stato_validazione !== "Approvato") continue;
    const cod = normalizzaCodice(a.tipi_corso?.codice);
    if (cod) out.add(cod);
  }
  return out;
}

export function valutaFormazioneLavoratore(input: {
  regole: RegolaRuoloCorso[];
  contesto: ContestoRegole;
  corsiSvolti: ReadonlySet<string>;
}): EsitoFormazioneLavoratore {
  const { regole, contesto, corsiSvolti } = input;
  const righe = regole.filter((r) => normalizzaCodice(r.ruolo_codice) === CODICE_RUOLO.LAVORATORE);
  const base = (r: RegolaRuoloCorso) => normalizzaCodice(r.corso_base);

  // Corso base: le righe del Lavoratore senza condizione sul rischio
  const baseAttesi = [...new Set(righe.filter((r) => !eParametroRischio(r)).map(base).filter(Boolean))];
  const baseMancanti = baseAttesi.filter((c) => !corsiSvolti.has(c));

  // Formazione specifica: le righe legate al rischio; ne vale una sola, quella del rischio della ditta
  const righeRischio = righe.filter(eParametroRischio);
  const famiglia = [...new Set(righeRischio.map(base).filter(Boolean))];
  const attesa = contesto.rischioDitta
    ? (righeRischio.filter((r) => regolaApplicabile(r, contesto)).map(base).find(Boolean) ?? null)
    : null;
  const altroGrado = famiglia.find((c) => c !== attesa && corsiSvolti.has(c)) ?? null;

  let stato: StatoSpecifica;
  let trovata: string | null = null;
  if (!contesto.rischioDitta || !attesa) stato = "non-valutabile";
  else if (corsiSvolti.has(attesa)) {
    stato = "presente";
    trovata = attesa;
  } else if (altroGrado) {
    stato = "diversa";
    trovata = altroGrado;
  } else stato = "mancante";

  const completa = baseMancanti.length === 0 && stato === "presente";
  const parti: string[] = [];
  if (baseMancanti.length > 0) parti.push(`manca il corso base (${baseMancanti.join(", ")})`);
  if (stato === "mancante") parti.push(`manca la formazione specifica (${attesa})`);
  if (stato === "diversa")
    parti.push(`formazione specifica diversa da quella del rischio della ditta: ha ${trovata}, serve ${attesa}; decide l'operatore`);
  if (stato === "non-valutabile") parti.push("grado di rischio della ditta non impostato: formazione specifica non valutabile");

  return {
    completa,
    base: { attesi: baseAttesi, mancanti: baseMancanti },
    specifica: { attesa, stato, trovata },
    motivo: completa ? "Formazione lavoratore completa" : parti.join("; "),
  };
}

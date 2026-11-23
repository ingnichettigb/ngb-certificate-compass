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
 *   - Rev 2 (2026-11-21): Fase 5 — tiene conto delle decisioni dell'operatore sulla specifica «diversa»: accettata (vale come completa),
 *     serve integrazione, non valida. Una decisione vale solo finché restano uguali corso svolto, corso atteso e rischio della ditta.
 *   - Rev 3 (2026-11-22): valutaFormazioneDelDipendente (legge attestati e decisioni del lavoratore) e motivoInAttesaFormazione: un corso di un ruolo
 *     che «richiede LAVORATORE» (le attrezzature) è «in attesa» finché la formazione Lavoratore non è completa (Fase 6).
 */
import type { Attestato } from "@/lib/api/attestati";
import { CODICE_RUOLO, normalizzaCodice } from "@/lib/api/codici-ruoli";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { decisioneDi, decisioneValida, type DecisioneSpecifica } from "@/features/formazione-valutazione/decisioni";
import { eParametroRischio, regolaApplicabile, type ContestoRegole } from "./matrice/condizioni-regole";

export type StatoSpecifica =
  /** C'è il corso specifico atteso per il rischio della ditta. */
  | "presente"
  /** C'è un corso specifico di un altro grado e l'operatore l'ha accettato come equivalente: vale come completa. */
  | "accettata"
  /** Non c'è nessun corso specifico. */
  | "mancante"
  /** C'è un corso specifico di un altro grado di rischio e nessuna decisione valida: serve la decisione dell'operatore. */
  | "diversa"
  /** L'operatore ha deciso che quel corso non basta e serve un'integrazione. */
  | "integrazione"
  /** L'operatore ha deciso che quel corso non vale per il rischio della ditta. */
  | "non-valida"
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
  /** Decisioni dell'operatore registrate sugli attestati del lavoratore (anche non più valide: le scarta la funzione). */
  decisioni?: readonly DecisioneSpecifica[];
}): EsitoFormazioneLavoratore {
  const { regole, contesto, corsiSvolti, decisioni = [] } = input;
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
  const altriGradi = famiglia.filter((c) => c !== attesa && corsiSvolti.has(c));

  let stato: StatoSpecifica;
  let trovata: string | null = null;
  if (!contesto.rischioDitta || !attesa) stato = "non-valutabile";
  else if (corsiSvolti.has(attesa)) {
    stato = "presente";
    trovata = attesa;
  } else if (altriGradi.length > 0) {
    // La decisione dell'operatore di ciascun corso diverso, se ancora valida per corso atteso e rischio attuali
    const esaminati = altriGradi.map((c) => ({
      corso: c,
      decisione: decisioni.find(
        (d) => d.corsoSvolto === c && decisioneValida(d, { corsoSvolto: c, corsoAtteso: attesa, rischioDitta: contesto.rischioDitta }),
      ),
    }));
    const accettato = esaminati.find((e) => e.decisione?.esito === "accettata");
    const senzaDecisione = esaminati.find((e) => !e.decisione);
    const integrazione = esaminati.find((e) => e.decisione?.esito === "integrazione");
    if (accettato) [stato, trovata] = ["accettata", accettato.corso];
    else if (senzaDecisione) [stato, trovata] = ["diversa", senzaDecisione.corso];
    else if (integrazione) [stato, trovata] = ["integrazione", integrazione.corso];
    else [stato, trovata] = ["non-valida", esaminati[0]!.corso];
  } else stato = "mancante";

  const completa = baseMancanti.length === 0 && (stato === "presente" || stato === "accettata");
  const parti: string[] = [];
  if (baseMancanti.length > 0) parti.push(`manca il corso base (${baseMancanti.join(", ")})`);
  if (stato === "mancante") parti.push(`manca la formazione specifica (${attesa})`);
  if (stato === "diversa")
    parti.push(`formazione specifica diversa da quella del rischio della ditta: ha ${trovata}, serve ${attesa}; decide l'operatore`);
  if (stato === "integrazione")
    parti.push(`serve integrazione: l'operatore ha deciso che ${trovata} non basta al posto di ${attesa}`);
  if (stato === "non-valida") parti.push(`${trovata} non vale al posto di ${attesa} (decisione dell'operatore)`);
  if (stato === "non-valutabile") parti.push("grado di rischio della ditta non impostato: formazione specifica non valutabile");

  return {
    completa,
    base: { attesi: baseAttesi, mancanti: baseMancanti },
    specifica: { attesa, stato, trovata },
    motivo: !completa
      ? parti.join("; ")
      : stato === "accettata"
        ? `Formazione lavoratore completa (specifica ${trovata} accettata dall'operatore al posto di ${attesa})`
        : "Formazione lavoratore completa",
  };
}

/** Come valutaFormazioneLavoratore, partendo dagli attestati: legge i corsi svolti e le decisioni dell'operatore del lavoratore. */
export function valutaFormazioneDelDipendente(input: {
  attestati: Attestato[];
  dipendenteId: string;
  regole: RegolaRuoloCorso[];
  contesto: ContestoRegole;
}): EsitoFormazioneLavoratore {
  const { attestati, dipendenteId, regole, contesto } = input;
  const suoi = attestati.filter((a) => a.dipendente_id === dipendenteId);
  const decisioni = suoi.map(decisioneDi).filter((d): d is DecisioneSpecifica => d !== null);
  return valutaFormazioneLavoratore({ regole, contesto, corsiSvolti: corsiSvoltiDa(suoi, dipendenteId), decisioni });
}

/**
 * Il corso di questo ruolo è «in attesa»? Solo se il ruolo richiede LAVORATORE (le attrezzature) e la formazione Lavoratore non è completa:
 * restituisce il motivo, altrimenti null. Per gli altri ruoli, o senza valutazione, null.
 */
export function motivoInAttesaFormazione(
  ruolo: Pick<RuoloSicurezza, "richiede"> | null | undefined,
  esito: EsitoFormazioneLavoratore | null | undefined,
): string | null {
  if (!ruolo || !esito || normalizzaCodice(ruolo.richiede) !== CODICE_RUOLO.LAVORATORE) return null;
  return esito.completa ? null : esito.motivo;
}

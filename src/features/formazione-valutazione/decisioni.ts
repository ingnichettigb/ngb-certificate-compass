/*
 * File:          decisioni.ts
 * Percorso:      src/features/formazione-valutazione/decisioni.ts
 * Data creazione: 2026-11-21
 * Decisione dell'operatore su una formazione specifica DIVERSA da quella attesa per il grado di rischio della ditta (es. 12 ore con
 * ditta a rischio medio). Si registra sull'attestato del corso «diverso» (colonne equivalenza_*, migrazione 0018). La decisione vale
 * finché restano uguali il corso dell'attestato, il corso atteso e il grado di rischio della ditta: se uno cambia, decade e si rivaluta.
 * Funzioni pure.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 5).
 *   - Rev 2 (2026-11-25 21:08): Esito «Già valutato / Ignora»: salvato come «non_valida» con marcatore nella nota (nessuna modifica al DB),
 *     così il caso esce dai «Da valutare» senza cambiare la conformità (resta non completa, come prima).
 */
import type { Attestato, CampiEquivalenza } from "@/lib/api/attestati";
import { normalizzaCodice } from "@/lib/api/codici-ruoli";
import type { RischioDitta } from "@/features/dipendenti/matrice/condizioni-regole";

export type EsitoEquivalenza = "accettata" | "integrazione" | "non_valida" | "ignorata";

/** Marcatore nella nota che distingue «Già valutato / Ignora» da «Non valida» (stesso valore nel DB). */
export const MARCATORE_IGNORATA = "[Già valutato / Ignora] ";
export const NOTA_IGNORATA_PREDEFINITA = "Già valutato: nessuna azione";

export const ETICHETTA_ESITO: Record<EsitoEquivalenza, string> = {
  accettata: "Accettata come equivalente",
  integrazione: "Serve integrazione",
  non_valida: "Non valida",
  ignorata: "Già valutato / Ignorata",
};

/** Decisione registrata su un attestato, già letta e normalizzata. */
export type DecisioneSpecifica = {
  attestatoId: string;
  esito: EsitoEquivalenza;
  corsoSvolto: string;
  corsoAtteso: string;
  rischio: RischioDitta;
  nota: string;
  data: string;
};

/** Decisione registrata sull'attestato, se completa (le colonne sono o tutte vuote o tutte compilate). */
export function decisioneDi(a: Attestato): DecisioneSpecifica | null {
  const { equivalenza_esito: esito, equivalenza_rischio: rischio, equivalenza_data: data } = a;
  const svolto = normalizzaCodice(a.equivalenza_corso_svolto);
  const atteso = normalizzaCodice(a.equivalenza_corso_atteso);
  if (!esito || !rischio || !data || !svolto || !atteso) return null;
  const notaGrezza = a.equivalenza_nota ?? "";
  const ignorata = esito === "non_valida" && notaGrezza.startsWith(MARCATORE_IGNORATA);
  const nota = (ignorata ? notaGrezza.slice(MARCATORE_IGNORATA.length) : notaGrezza).trim();
  return { attestatoId: a.id, esito: ignorata ? "ignorata" : esito, corsoSvolto: svolto, corsoAtteso: atteso, rischio, nota, data };
}

/**
 * La decisione vale ancora? Solo se il corso dell'attestato, il corso atteso e il grado di rischio sono quelli del momento
 * in cui si è deciso. Altrimenti decade (la situazione è cambiata) e la formazione torna «da valutare».
 */
export function decisioneValida(
  d: DecisioneSpecifica,
  adesso: { corsoSvolto: string; corsoAtteso: string | null; rischioDitta: RischioDitta | null | undefined },
): boolean {
  return (
    d.corsoSvolto === normalizzaCodice(adesso.corsoSvolto) &&
    d.corsoAtteso === normalizzaCodice(adesso.corsoAtteso) &&
    d.rischio === adesso.rischioDitta
  );
}

/** Messaggio di errore se la decisione non è ammessa (la nota è sempre obbligatoria), altrimenti null. */
export function erroreDecisione(esito: EsitoEquivalenza | null, nota: string): string | null {
  if (!esito) return "Scegli una decisione";
  if (esito === "ignorata") return null;
  return nota.trim() ? null : "La nota è obbligatoria";
}

/** Dati da salvare sull'attestato quando l'operatore decide. */
export function costruisciDecisione({
  esito,
  corsoSvolto,
  corsoAtteso,
  rischio,
  nota,
  adesso,
}: {
  esito: EsitoEquivalenza;
  corsoSvolto: string;
  corsoAtteso: string;
  rischio: RischioDitta;
  nota: string;
  adesso: Date;
}): Pick<Attestato, CampiEquivalenza> {
  const ignorata = esito === "ignorata";
  const testo = nota.trim() || (ignorata ? NOTA_IGNORATA_PREDEFINITA : "");
  return {
    equivalenza_esito: ignorata ? "non_valida" : esito,
    equivalenza_corso_svolto: normalizzaCodice(corsoSvolto),
    equivalenza_corso_atteso: normalizzaCodice(corsoAtteso),
    equivalenza_rischio: rischio,
    equivalenza_nota: ignorata ? MARCATORE_IGNORATA + testo : testo,
    equivalenza_data: adesso.toISOString(),
  };
}

/** Dati per annullare una decisione: torna «da valutare». */
export function annullaDecisione(): Record<CampiEquivalenza, null> {
  return {
    equivalenza_esito: null,
    equivalenza_corso_svolto: null,
    equivalenza_corso_atteso: null,
    equivalenza_rischio: null,
    equivalenza_nota: null,
    equivalenza_data: null,
  };
}

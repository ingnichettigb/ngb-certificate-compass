/*
 * File:      impagina-organigramma-a3.ts
 * Percorso:  src/features/stampe/impagina-organigramma-a3.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Disposizione dei riquadri dell'«Organigramma della sicurezza» su A3 orizzontale: invece di due righe di
 *            griglia fisse (un elenco lungo, come i Preposti, allungava tutta la riga e lasciava vuoti), i riquadri si dispongono in
 *            colonne affiancate, ciascuno nella colonna più bassa del momento; gli elenchi lunghi si dividono in due colonne interne.
 *            Funzioni pure: nessun accesso a dati o interfaccia.
 */

export type ElementoLayout = {
  /** Identificatore del riquadro (chiave del blocco o «voce-N»). */
  id: string;
  /** Righe di testo dell'elenco (nominativi), senza il titolo. Un riquadro vuoto vale 1 riga. */
  righe: number;
  /** Righe vuote di separazione (es. tra ATA e Docenti). */
  separatori?: number;
};

export type PostoLayout = { id: string; colonneInterne: 1 | 2 };

/** Colonne esterne della tavola (A3 orizzontale: circa 130 mm l'una). */
export const COLONNE_TAVOLA = 3;
/** Oltre queste righe l'elenco si divide in due colonne dentro il riquadro. */
export const SOGLIA_DUE_COLONNE = 12;

const MM_TITOLO = 7;
const MM_RIGA = 4;
const MM_CORNICE = 3.5;
const MM_SEPARATORE = 2;

export function colonneInterneDi(righe: number): 1 | 2 {
  return righe > SOGLIA_DUE_COLONNE ? 2 : 1;
}

/** Altezza stimata in millimetri di un riquadro. */
export function altezzaStimataMm(e: ElementoLayout): number {
  const righe = Math.max(1, e.righe);
  const ci = colonneInterneDi(righe);
  return MM_TITOLO + MM_CORNICE + Math.ceil(righe / ci) * MM_RIGA + (e.separatori ?? 0) * MM_SEPARATORE;
}

/**
 * Distribuisce i riquadri nelle colonne mantenendo l'ordine logico: ognuno va nella colonna che in quel momento è più bassa
 * (a parità, la più a sinistra). Restituisce, per ogni colonna, i riquadri dall'alto in basso.
 */
export function impaginaColonne(elementi: ElementoLayout[], numeroColonne: number = COLONNE_TAVOLA): PostoLayout[][] {
  const colonne: PostoLayout[][] = Array.from({ length: Math.max(1, numeroColonne) }, () => []);
  const altezze: number[] = colonne.map(() => 0);
  for (const e of elementi) {
    let scelta = 0;
    for (let i = 1; i < altezze.length; i++) if (altezze[i]! < altezze[scelta]!) scelta = i;
    colonne[scelta]!.push({ id: e.id, colonneInterne: colonneInterneDi(Math.max(1, e.righe)) });
    altezze[scelta]! += altezzaStimataMm(e);
  }
  return colonne;
}

/** Altezza stimata della colonna più alta (mm): serve a verificare che stia nell'area utile. */
export function altezzaMassimaMm(elementi: ElementoLayout[], numeroColonne: number = COLONNE_TAVOLA): number {
  const per = new Map(elementi.map((e) => [e.id, e]));
  return Math.max(
    0,
    ...impaginaColonne(elementi, numeroColonne).map((c) => c.reduce((s, p) => s + altezzaStimataMm(per.get(p.id)!), 0)),
  );
}

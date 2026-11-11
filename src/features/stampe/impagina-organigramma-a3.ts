/*
 * File:      impagina-organigramma-a3.ts
 * Percorso:  src/features/stampe/impagina-organigramma-a3.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Disposizione dei riquadri dell'«Organigramma della sicurezza» su A3 orizzontale: invece di due righe di
 *            griglia fisse (un elenco lungo, come i Preposti, allungava tutta la riga e lasciava vuoti), i riquadri si dispongono in
 *            colonne affiancate, ciascuno nella colonna più bassa del momento; gli elenchi lunghi si dividono in due colonne interne.
 *            Funzioni pure: nessun accesso a dati o interfaccia.
 *   rev 2 — 11/11/2026 — Disposizione FUNZIONALE (impaginaPerFunzione): a sinistra Primo soccorso e sotto Defibrillatore, al centro
 *            Evacuazione (poi figure di classe, Preposti, Preposti di laboratorio), a destra Antincendio (poi registro antincendio,
 *            Incaricati privacy). Le voci libere si collocano per parola chiave del titolo; quelle non riconosciute vanno nella
 *            colonna più bassa. Aggiunta soltanto: impaginaColonne e le altre funzioni restano invariate.
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

/* ------------------------------------------------------------------------------------------------
 * Disposizione funzionale (rev 2)
 * ---------------------------------------------------------------------------------------------- */

export type ElementoFunzionale = ElementoLayout & {
  /** Titolo del riquadro: serve a collocare per parola chiave le voci libere («voce-N»). */
  titolo: string;
};

type Posizione = { colonna: number; ordine: number };

/** Posizione dei blocchi fissi: colonna (0 = sinistra, 1 = centro, 2 = destra) e ordine dall'alto in basso. */
export const POSIZIONI_BLOCCHI: Record<string, Posizione> = {
  "primo-soccorso": { colonna: 0, ordine: 10 },
  defibrillatore: { colonna: 0, ordine: 20 },
  evacuazione: { colonna: 1, ordine: 10 },
  preposti: { colonna: 1, ordine: 30 },
  antincendio: { colonna: 2, ordine: 10 },
  privacy: { colonna: 2, ordine: 30 },
};

/** Voci libere: la prima parola chiave trovata nel titolo decide dove vanno (l'ordine delle regole conta). */
const POSIZIONI_VOCI: Array<[RegExp, Posizione]> = [
  [/evacuaz/i, { colonna: 1, ordine: 20 }],
  [/antincend/i, { colonna: 2, ordine: 20 }],
  [/prepost|laborat/i, { colonna: 1, ordine: 40 }],
  [/defibrill/i, { colonna: 0, ordine: 25 }],
  [/soccorso/i, { colonna: 0, ordine: 15 }],
  [/privacy/i, { colonna: 2, ordine: 35 }],
];

function posizioneDi(e: ElementoFunzionale): Posizione | undefined {
  if (e.id.startsWith("voce-")) return POSIZIONI_VOCI.find(([re]) => re.test(e.titolo))?.[1];
  return POSIZIONI_BLOCCHI[e.id];
}

/**
 * Colloca i riquadri per funzione (sinistra: primo soccorso e defibrillatore; centro: evacuazione e preposti; destra: antincendio).
 * I riquadri senza regola (nuove voci libere) vanno in fondo alla colonna più bassa. Ogni riquadro compare una sola volta.
 */
export function impaginaPerFunzione(elementi: ElementoFunzionale[], numeroColonne: number = COLONNE_TAVOLA): PostoLayout[][] {
  const n = Math.max(1, numeroColonne);
  const colonne: Array<Array<{ posto: PostoLayout; ordine: number }>> = Array.from({ length: n }, () => []);
  const altezze: number[] = colonne.map(() => 0);
  const senzaRegola: ElementoFunzionale[] = [];
  const posto = (e: ElementoFunzionale): PostoLayout => ({ id: e.id, colonneInterne: colonneInterneDi(Math.max(1, e.righe)) });

  for (const e of elementi) {
    const pos = posizioneDi(e);
    if (!pos) {
      senzaRegola.push(e);
      continue;
    }
    const c = Math.min(Math.max(0, pos.colonna), n - 1);
    colonne[c]!.push({ posto: posto(e), ordine: pos.ordine });
    altezze[c]! += altezzaStimataMm(e);
  }
  senzaRegola.forEach((e, i) => {
    let scelta = 0;
    for (let c = 1; c < n; c++) if (altezze[c]! < altezze[scelta]!) scelta = c;
    colonne[scelta]!.push({ posto: posto(e), ordine: 100 + i });
    altezze[scelta]! += altezzaStimataMm(e);
  });
  return colonne.map((col) => col.sort((a, b) => a.ordine - b.ordine).map((x) => x.posto));
}

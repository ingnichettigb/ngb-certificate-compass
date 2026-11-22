/*
 * File:           categorie-corso.ts
 * Percorso:       src/features/selezione-corso/categorie-corso.ts
 * Data creazione: 22/11/2026
 * Scopo:          regole pure dell'elenco corsi con categorie: categoria di ogni corso, corsi abilitati per la Ditta,
 *                 riconoscimento degli aggiornamenti, ordine dell'elenco, ultimo corso scelto per primo.
 *
 * Fonte unica: il database. Nessun elenco di categorie scritto nel codice.
 *   - categoria del corso = tipi_corso.macro_categoria, tranne i corsi collegati (Tabella 02, regole_ruolo_corso)
 *     a un ruolo della categoria «Attrezzature»: quelli stanno in «Attrezzature» e non in «Sicurezza Lavoratori»;
 *   - corso abilitato per la Ditta = collegato ad almeno un ruolo attivo (ruoli_sicurezza.attivo);
 *     un corso senza nessun ruolo collegato (es. COVID19-02) resta sempre abilitato.
 *
 * Revisioni:
 *   rev 1 — 22/11/2026 — Prima versione.
 */

export type CorsoSelezionabile = {
  id: string;
  nome_corso: string;
  macro_categoria: string;
  livello_specifico?: string | null;
  ore_minime_legge: number | null;
  codice?: string | null;
};

/** Ruolo come serve qui (sottoinsieme di RuoloSicurezza). */
export type RuoloPerCorsi = {
  codice?: string | null;
  macro_categoria: string | null;
  attivo: boolean;
};
/** Regola della Tabella 02 come serve qui (sottoinsieme di RegolaRuoloCorso). */
export type RegolaPerCorsi = {
  ruolo_codice: string;
  corso_base: string | null;
  corso_aggiornamento: string | null;
};

/** Ruoli collegati a ciascun corso, per codice corso (maiuscolo). */
export type LegamiCorsi = Map<string, RuoloPerCorsi[]>;

export const CATEGORIA_ATTREZZATURE = "Attrezzature";
export const CATEGORIA_ALTRO = "Altro";

export type CategoriaElenco = { chiave: string; nome: string; corsi: number };

const norma = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const codiceChiave = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();

/** Costruisce i legami corso → ruoli dalla Tabella 02 e dai ruoli. Un ruolo non trovato per codice viene ignorato. */
export function costruisciLegami(regole: RegolaPerCorsi[], ruoli: RuoloPerCorsi[]): LegamiCorsi {
  const perCodice = new Map<string, RuoloPerCorsi>();
  for (const r of ruoli) if (r.codice) perCodice.set(codiceChiave(r.codice), r);
  const legami: LegamiCorsi = new Map();
  for (const regola of regole) {
    const ruolo = perCodice.get(codiceChiave(regola.ruolo_codice));
    if (!ruolo) continue;
    for (const cod of [regola.corso_base, regola.corso_aggiornamento]) {
      const k = codiceChiave(cod);
      if (!k) continue;
      const elenco = legami.get(k) ?? [];
      if (!elenco.includes(ruolo)) elenco.push(ruolo);
      legami.set(k, elenco);
    }
  }
  return legami;
}

function ruoliDelCorso(
  c: Pick<CorsoSelezionabile, "codice">,
  legami: LegamiCorsi | null | undefined,
): RuoloPerCorsi[] {
  if (!legami) return [];
  return legami.get(codiceChiave(c.codice)) ?? [];
}

/** Categoria con cui il corso compare tra i pulsanti. */
export function categoriaCorso(c: CorsoSelezionabile, legami?: LegamiCorsi | null): string {
  if (
    ruoliDelCorso(c, legami).some((r) => norma(r.macro_categoria) === norma(CATEGORIA_ATTREZZATURE))
  ) {
    return CATEGORIA_ATTREZZATURE;
  }
  return c.macro_categoria?.trim() || CATEGORIA_ALTRO;
}

/** Corso abilitato per la Ditta: almeno un ruolo attivo collegato, oppure nessun ruolo collegato. */
export function corsoAbilitato(c: CorsoSelezionabile, legami?: LegamiCorsi | null): boolean {
  const ruoli = ruoliDelCorso(c, legami);
  return ruoli.length === 0 || ruoli.some((r) => r.attivo);
}

/** Aggiornamento: livello, codice (…AGG…) o nome parlano di aggiornamento. */
export function eAggiornamento(
  c: Pick<CorsoSelezionabile, "livello_specifico" | "codice" | "nome_corso">,
): boolean {
  return (
    /aggiorn/i.test(c.livello_specifico ?? "") ||
    /agg/i.test(c.codice ?? "") ||
    /aggiornament/i.test(c.nome_corso ?? "")
  );
}

const perCodice = (a: CorsoSelezionabile, b: CorsoSelezionabile) =>
  (a.codice ?? "~").localeCompare(b.codice ?? "~", "it", { numeric: true }) ||
  a.nome_corso.localeCompare(b.nome_corso, "it");

/** Pulsanti delle categorie: solo corsi abilitati, in ordine alfabetico. Le varianti di maiuscole sono una sola categoria. */
export function categorieDisponibili(
  corsi: CorsoSelezionabile[],
  legami?: LegamiCorsi | null,
): CategoriaElenco[] {
  const mappa = new Map<string, CategoriaElenco>();
  for (const c of corsi) {
    if (!corsoAbilitato(c, legami)) continue;
    const nome = categoriaCorso(c, legami);
    const chiave = norma(nome);
    const voce = mappa.get(chiave) ?? { chiave, nome, corsi: 0 };
    voce.corsi += 1;
    mappa.set(chiave, voce);
  }
  return Array.from(mappa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

export type ElencoCorsi<T extends CorsoSelezionabile = CorsoSelezionabile> = {
  /** Ultimo corso scelto, se compare nell'elenco filtrato. */
  ultimo: T | null;
  corsi: T[];
  aggiornamenti: T[];
};

/**
 * Elenco da mostrare: corsi abilitati, nelle categorie scelte (nessuna scelta = tutte) e che contengono il testo cercato
 * (codice o nome). Prima l'ultimo scelto, poi tutti i corsi, poi tutti gli aggiornamenti; ciascun gruppo in ordine di codice.
 */
export function elencoCorsi<T extends CorsoSelezionabile>(
  corsi: T[],
  opzioni: {
    legami?: LegamiCorsi | null | undefined;
    categorie?: ReadonlySet<string> | readonly string[] | undefined;
    ricerca?: string | undefined;
    ultimoId?: string | null | undefined;
  } = {},
): ElencoCorsi<T> {
  const scelte = new Set(Array.from(opzioni.categorie ?? []).map(norma));
  const testo = norma(opzioni.ricerca);
  const filtrati = corsi
    .filter((c) => corsoAbilitato(c, opzioni.legami))
    .filter((c) => scelte.size === 0 || scelte.has(norma(categoriaCorso(c, opzioni.legami))))
    .filter((c) => !testo || norma(`${c.codice ?? ""} ${c.nome_corso}`).includes(testo))
    .sort(perCodice);
  const ultimo = opzioni.ultimoId
    ? (filtrati.find((c) => c.id === opzioni.ultimoId) ?? null)
    : null;
  const resto = ultimo ? filtrati.filter((c) => c.id !== ultimo.id) : filtrati;
  return {
    ultimo,
    corsi: resto.filter((c) => !eAggiornamento(c)),
    aggiornamenti: resto.filter((c) => eAggiornamento(c)),
  };
}

/** Le categorie salvate che esistono ancora tra quelle disponibili (chiavi normalizzate). */
export function categorieValide(
  salvate: readonly string[],
  disponibili: CategoriaElenco[],
): string[] {
  const chiavi = new Set(disponibili.map((c) => c.chiave));
  return Array.from(new Set(salvate.map(norma))).filter((k) => chiavi.has(k));
}

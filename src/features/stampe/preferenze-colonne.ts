/*
 * File:      preferenze-colonne.ts
 * Percorso:  src/features/stampe/preferenze-colonne.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 2 — 08/11/2026 — Ordine scelto delle colonne (trascinamento o frecce): ordine, spostaColonna, spostaDi; «Ripristina colonne» lo azzera.
 *   rev 1 — 07/11/2026 — Colonne tolte/aggiunte e larghezze scelte dall'utente, ricordate per ogni tipo di documento (localStorage).
 */
import { colonneDisponibili, INTESTAZIONI, type Colonna, type Modello } from "./dati-stampa";

export type LarghezzeColonne = Partial<Record<Colonna, number>>;

export type PreferenzeColonne = {
  /** Colonne predefinite del documento che l'utente ha tolto. */
  tolte: Colonna[];
  /** Colonne in più rispetto alle predefinite, nell'ordine in cui sono state aggiunte. */
  aggiunte: Colonna[];
  /** Larghezza in pixel delle colonne ridimensionate. */
  larghezze: LarghezzeColonne;
  /** Ordine scelto dall'utente (le colonne non elencate vanno in fondo, nell'ordine di partenza). Assente = ordine del documento. */
  ordine?: Colonna[];
};

export const PREFERENZE_VUOTE: PreferenzeColonne = { tolte: [], aggiunte: [], larghezze: {} };

export const CHIAVE_PREFERENZE_COLONNE = "stampe_colonne_v1";

type Archivio = Pick<Storage, "getItem" | "setItem">;

const COLONNE_NOTE = new Set(Object.keys(INTESTAZIONI));
const LARGHEZZA_MIN = 30;
const LARGHEZZA_MAX = 1200;

function archivioDelBrowser(): Archivio | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function soloColonne(v: unknown): Colonna[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((c): c is Colonna => typeof c === "string" && COLONNE_NOTE.has(c)))];
}

function soloLarghezze(v: unknown): LarghezzeColonne {
  if (!v || typeof v !== "object") return {};
  const out: LarghezzeColonne = {};
  for (const [c, w] of Object.entries(v as Record<string, unknown>)) {
    if (COLONNE_NOTE.has(c) && typeof w === "number" && Number.isFinite(w) && w >= LARGHEZZA_MIN && w <= LARGHEZZA_MAX) {
      out[c as Colonna] = Math.round(w);
    }
  }
  return out;
}

function leggiArchivio(storage: Archivio | null): Record<string, unknown> {
  if (!storage) return {};
  try {
    const grezzo = storage.getItem(CHIAVE_PREFERENZE_COLONNE);
    const dati: unknown = grezzo ? JSON.parse(grezzo) : {};
    return dati && typeof dati === "object" && !Array.isArray(dati) ? (dati as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Preferenze salvate per quel tipo di documento («vista»); dati assenti o rovinati valgono «nessuna modifica». */
export function leggiPreferenze(vista: string, storage: Archivio | null = archivioDelBrowser()): PreferenzeColonne {
  const v = leggiArchivio(storage)[vista];
  if (!v || typeof v !== "object") return PREFERENZE_VUOTE;
  const o = v as Record<string, unknown>;
  const ordine = soloColonne(o["ordine"]);
  return {
    tolte: soloColonne(o["tolte"]),
    aggiunte: soloColonne(o["aggiunte"]),
    larghezze: soloLarghezze(o["larghezze"]),
    ...(ordine.length ? { ordine } : {}),
  };
}

export function senzaModifiche(p: PreferenzeColonne): boolean {
  return !p.tolte.length && !p.aggiunte.length && Object.keys(p.larghezze).length === 0 && !p.ordine?.length;
}

/** Salva le preferenze della vista; se non c'è più nessuna modifica, la voce viene eliminata. Non lancia mai errori. */
export function salvaPreferenze(vista: string, p: PreferenzeColonne, storage: Archivio | null = archivioDelBrowser()): void {
  if (!storage) return;
  try {
    const archivio = leggiArchivio(storage);
    if (senzaModifiche(p)) delete archivio[vista];
    else archivio[vista] = p;
    storage.setItem(CHIAVE_PREFERENZE_COLONNE, JSON.stringify(archivio));
  } catch {
    /* spazio esaurito o archivio non disponibile: le scelte valgono solo per questa sessione */
  }
}

/** Colonne da mostrare: predefinite meno le tolte, poi le aggiunte valide per il documento (senza doppioni). */
export function applicaPreferenze(base: Colonna[], p: PreferenzeColonne, modello: Modello): Colonna[] {
  const ammesse = new Set(colonneDisponibili(modello));
  const visibili = base.filter((c) => !p.tolte.includes(c));
  const extra = p.aggiunte.filter((c) => ammesse.has(c) && !base.includes(c));
  const colonne = [...visibili, ...extra];
  const ordine = p.ordine ?? [];
  if (!ordine.length) return colonne;
  // Ordine scelto: le colonne elencate nella sua sequenza, le altre (aggiunte dopo) in fondo come prima.
  const peso = (c: Colonna) => {
    const i = ordine.indexOf(c);
    return i === -1 ? ordine.length : i;
  };
  return colonne
    .map((c, i) => ({ c, i }))
    .sort((a, b) => peso(a.c) - peso(b.c) || a.i - b.i)
    .map((x) => x.c);
}

/** Sposta la colonna «da» nella posizione della colonna «a» (le altre scorrono) e ricorda l'ordine ottenuto. */
export function spostaColonna(attuali: Colonna[], p: PreferenzeColonne, da: Colonna, a: Colonna): PreferenzeColonne {
  const i = attuali.indexOf(da);
  const j = attuali.indexOf(a);
  if (i === -1 || j === -1 || i === j) return p;
  const nuove = [...attuali];
  nuove.splice(i, 1);
  nuove.splice(j, 0, da);
  return { ...p, ordine: nuove };
}

/** Sposta una colonna di una posizione a sinistra (-1) o a destra (+1). */
export function spostaDi(attuali: Colonna[], p: PreferenzeColonne, c: Colonna, passo: -1 | 1): PreferenzeColonne {
  const i = attuali.indexOf(c);
  const j = i + passo;
  if (i === -1 || j < 0 || j >= attuali.length) return p;
  return spostaColonna(attuali, p, c, attuali[j]!);
}

/** Spunta/toglie una colonna: una predefinita va tra le «tolte» e ne esce, un'altra va tra le «aggiunte» e ne esce. */
export function alternaColonna(base: Colonna[], p: PreferenzeColonne, c: Colonna): PreferenzeColonne {
  if (base.includes(c)) {
    return { ...p, tolte: p.tolte.includes(c) ? p.tolte.filter((x) => x !== c) : [...p.tolte, c] };
  }
  return { ...p, aggiunte: p.aggiunte.includes(c) ? p.aggiunte.filter((x) => x !== c) : [...p.aggiunte, c] };
}

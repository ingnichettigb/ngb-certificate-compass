/*
 * File:          regole-ruolo-corso.ts
 * Percorso:      src/features/dipendenti/matrice/regole-ruolo-corso.ts
 * Data creazione: 2026-11-21
 * Mappe costruite dalla Tabella 02: da quale ruolo dipende un corso e quali corsi (base, aggiornamento) ha un ruolo.
 * Funzioni pure, senza accesso al database: i dati arrivano da useRegoleRuoloCorso.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 2).
 *   - Rev 2 (2026-11-21): L'indice elenca anche le regole che citano ciascun corso (serve a capire se valgono per la ditta, Fase 4).
 */
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { normalizzaCodice } from "@/lib/api/codici-ruoli";

export type CorsiDelRuolo = { base: string[]; aggiornamento: string[] };

export type IndiceRegole = {
  /** Codice corso (maiuscolo) -> codici dei ruoli che lo richiedono, nell'ordine della Tabella 02. */
  perCorso: Map<string, string[]>;
  /** Codice ruolo (maiuscolo) -> codici dei suoi corsi base e di aggiornamento, senza ripetizioni. */
  perRuolo: Map<string, CorsiDelRuolo>;
  /** Codice corso (maiuscolo) -> regole che lo citano (come corso base o di aggiornamento). */
  regolePerCorso: Map<string, RegolaRuoloCorso[]>;
};

const cache = new WeakMap<RegolaRuoloCorso[], IndiceRegole>();

function aggiungi(lista: string[], v: string) {
  if (!lista.includes(v)) lista.push(v);
}

/** Costruisce (una volta per elenco) le due mappe: la Matrice le interroga migliaia di volte. */
export function indiceRegole(regole: RegolaRuoloCorso[]): IndiceRegole {
  const gia = cache.get(regole);
  if (gia) return gia;
  const perCorso = new Map<string, string[]>();
  const perRuolo = new Map<string, CorsiDelRuolo>();
  const regolePerCorso = new Map<string, RegolaRuoloCorso[]>();
  const ordinate = [...regole].sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));
  for (const r of ordinate) {
    const ruolo = normalizzaCodice(r.ruolo_codice);
    if (!ruolo) continue;
    const corsi = perRuolo.get(ruolo) ?? { base: [], aggiornamento: [] };
    perRuolo.set(ruolo, corsi);
    for (const [campo, lista] of [
      [r.corso_base, corsi.base],
      [r.corso_aggiornamento, corsi.aggiornamento],
    ] as const) {
      const corso = normalizzaCodice(campo);
      if (!corso) continue;
      aggiungi(lista, corso);
      const ruoli = perCorso.get(corso) ?? [];
      aggiungi(ruoli, ruolo);
      perCorso.set(corso, ruoli);
      const citanti = regolePerCorso.get(corso) ?? [];
      if (!citanti.includes(r)) citanti.push(r);
      regolePerCorso.set(corso, citanti);
    }
  }
  const out = { perCorso, perRuolo, regolePerCorso };
  cache.set(regole, out);
  return out;
}

/** Codice del ruolo da cui dipende il corso (il primo nella Tabella 02); null se nessuna regola lo cita. */
export function ruoloCodicePerCorso(regole: RegolaRuoloCorso[], codiceCorso: string | null | undefined): string | null {
  const cod = normalizzaCodice(codiceCorso);
  if (!cod) return null;
  return indiceRegole(regole).perCorso.get(cod)?.[0] ?? null;
}

/** Corsi base e di aggiornamento previsti dalla Tabella 02 per un ruolo (vuoti se il ruolo non ha regole). */
export function corsiDelRuolo(regole: RegolaRuoloCorso[], codiceRuolo: string): CorsiDelRuolo {
  return indiceRegole(regole).perRuolo.get(normalizzaCodice(codiceRuolo)) ?? { base: [], aggiornamento: [] };
}

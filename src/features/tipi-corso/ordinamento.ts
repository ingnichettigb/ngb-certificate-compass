/*
 * File:      ordinamento.ts
 * Percorso:  src/features/tipi-corso/ordinamento.ts
 * Riordinamento dei corsi (funzioni pure).
 */

/** Scambia di posto un corso con quello vicino (su o giù). Restituisce null se non è possibile. */
export function scambiaPosizioni(
  corsi: { id: string }[],
  index: number,
  direzione: -1 | 1,
): { ids: string[]; idSpostato: string } | null {
  const dest = index + direzione;
  if (dest < 0 || dest >= corsi.length) return null;
  const nuovoOrdine = [...corsi];
  const a = nuovoOrdine[index];
  const b = nuovoOrdine[dest];
  if (!a || !b) return null;
  nuovoOrdine[index] = b;
  nuovoOrdine[dest] = a;
  return { ids: nuovoOrdine.map((c) => c.id), idSpostato: a.id };
}

/** Porta il corso `idOrigine` nella posizione occupata da `idDestinazione`. Restituisce null se un id manca. */
export function spostaId(attuale: string[], idOrigine: string, idDestinazione: string): string[] | null {
  const daIdx = attuale.indexOf(idOrigine);
  const aIdx = attuale.indexOf(idDestinazione);
  if (daIdx === -1 || aIdx === -1) return null;
  const riordinati = [...attuale];
  riordinati.splice(daIdx, 1);
  riordinati.splice(aIdx, 0, idOrigine);
  return riordinati;
}

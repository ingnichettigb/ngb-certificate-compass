/*
 * File:      regole-corso.ts
 * Percorso:  src/features/scadenze/regole-corso.ts
 * Creato:    12/11/2026
 * Regole particolari per tipo di corso, lette in un solo punto: oggi la tolleranza sul ritardo dell'aggiornamento.
 * Primo Soccorso: l'aggiornamento fatto oltre 4 mesi dalla scadenza non sana più nulla (decade tutto, si rifà il corso base).
 * Il dato è la colonna facoltativa `tipi_corso.tolleranza_ritardo_mesi` (NULL = nessun limite). Finché la colonna non esiste
 * nel database vale la regola predefinita qui sotto, così il programma funziona anche prima dell'adeguamento del database.
 * Revisioni:
 *   rev 1 — 12/11/2026 — Prima stesura.
 */

/** Tolleranza predefinita del Primo Soccorso (mesi dopo la scadenza). Da verificare sulla normativa/accordo vigente. */
export const TOLLERANZA_PRIMO_SOCCORSO_MESI = 4;

type TipoCorsoRegole = {
  macro_categoria?: string | null;
  nome_corso?: string | null;
  codice?: string | null;
} | null | undefined;

export function eCorsoPrimoSoccorso(tc: TipoCorsoRegole): boolean {
  const macro = (tc?.macro_categoria ?? "").toLowerCase();
  const nome = (tc?.nome_corso ?? "").toLowerCase();
  if (macro.includes("defibrill") || nome.includes("defibrill") || nome.includes("blsd")) return false;
  return macro.includes("primo soccorso");
}

/**
 * Mesi di tolleranza sul ritardo per il tipo di corso, oppure null se non c'è alcun limite.
 * - colonna presente (anche NULL): vale il dato del catalogo;
 * - colonna assente (undefined): regola predefinita (Primo Soccorso = 4 mesi).
 */
export function tolleranzaRitardoMesi(tc: TipoCorsoRegole): number | null {
  const grezzo = (tc as { tolleranza_ritardo_mesi?: number | null } | null | undefined)?.tolleranza_ritardo_mesi;
  if (grezzo !== undefined) return grezzo === null ? null : Number(grezzo);
  return eCorsoPrimoSoccorso(tc) ? TOLLERANZA_PRIMO_SOCCORSO_MESI : null;
}

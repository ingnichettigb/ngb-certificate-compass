/*
 * File:          condizioni-regole.ts
 * Percorso:      src/features/dipendenti/matrice/condizioni-regole.ts
 * Data creazione: 2026-11-21
 * Quando una regola della Tabella 02 vale per la ditta. Una regola con parametro «nessuno» vale sempre; una con un parametro
 * legato a un dato della ditta vale solo se il valore coincide. Oggi è attivo un solo parametro, «rischio ATECO» (le ore della
 * formazione specifica del Lavoratore: basso 4, medio 8, alto 12). Gli altri parametri (livello antincendio, gruppo primo soccorso,
 * fascia lavoratori, settore, modulo) valgono ancora sempre, come prima: per attivarli basta aggiungerli qui.
 * Funzioni pure.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 4).
 *   - Rev 2 (2026-11-22): regolaDecisa: dice se per la regola si sa già se vale per la ditta (serve alla proposta del corso, Fase 7).
 */
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { normalizzaCodice } from "@/lib/api/codici-ruoli";
import { indiceRegole } from "./regole-ruolo-corso";

export type RischioDitta = "basso" | "medio" | "alto";

/** Dati della ditta che decidono quali regole valgono. */
export type ContestoRegole = {
  /** Grado di rischio aziendale; null/assente = non impostato: non si sceglie un livello, valgono tutte le regole (come prima). */
  rischioDitta?: RischioDitta | null | undefined;
};

/** Parametro della Tabella 02 che dipende dal grado di rischio della ditta. */
export const PARAMETRO_RISCHIO = "rischio ATECO";

const testo = (v: unknown) => String(v ?? "").trim().toLowerCase();

export const eParametroRischio = (r: Pick<RegolaRuoloCorso, "parametro">) => testo(r.parametro) === testo(PARAMETRO_RISCHIO);

/** La regola vale per la ditta? */
export function regolaApplicabile(regola: RegolaRuoloCorso, contesto: ContestoRegole): boolean {
  if (eParametroRischio(regola)) {
    if (!contesto.rischioDitta) return true;
    return testo(regola.valore) === contesto.rischioDitta;
  }
  return true;
}

/**
 * Il corso è dovuto, per la ditta, secondo la Tabella 02? Vero se almeno una delle regole che lo citano vale per la ditta
 * (es. SIC-SPE-08 solo con rischio medio; SIC-AGG-06 sempre, perché è citato in tutte e tre le righe del rischio).
 * Un corso che nessuna regola cita non è in questione qui: dice «sì», lo decide la mappatura ruolo-corso.
 */
export function corsoApplicabile(regole: RegolaRuoloCorso[], codiceCorso: string | null | undefined, contesto: ContestoRegole): boolean {
  const citanti = indiceRegole(regole).regolePerCorso.get(normalizzaCodice(codiceCorso));
  if (!citanti || citanti.length === 0) return true;
  return citanti.some((r) => regolaApplicabile(r, contesto));
}

/**
 * Per questa regola il programma sa già dire se vale per la ditta? Sì per «nessuno» (vale sempre) e per «rischio ATECO»
 * (lo decide il grado di rischio). Per gli altri parametri (livello antincendio, gruppo primo soccorso, fascia RLS, settore,
 * modulo, integrazione…) non ancora: servono dati che la ditta non fornisce, quindi non si propone un corso al posto di un altro.
 */
export function regolaDecisa(regola: RegolaRuoloCorso, contesto: ContestoRegole): boolean {
  const decidibile = testo(regola.parametro) === "nessuno" || eParametroRischio(regola);
  return decidibile && regolaApplicabile(regola, contesto);
}

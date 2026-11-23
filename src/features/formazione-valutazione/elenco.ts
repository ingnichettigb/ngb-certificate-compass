/*
 * File:          elenco.ts
 * Percorso:      src/features/formazione-valutazione/elenco.ts
 * Data creazione: 2026-11-21
 * Elenco dei lavoratori in forza la cui formazione specifica è DIVERSA da quella attesa per il rischio della ditta: «da valutare» se
 * l'operatore non ha ancora deciso, «decise» altrimenti (accettata, serve integrazione, non valida). Funzioni pure.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 5).
 */
import { statoRegistrato } from "@/lib/api/attestati";
import type { Attestato } from "@/lib/api/attestati";
import { normalizzaCodice } from "@/lib/api/codici-ruoli";
import type { Dipendente } from "@/lib/api/dipendenti";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { isCessato } from "@/features/contratti/contratto";
import { corsiSvoltiDa, valutaFormazioneLavoratore, type StatoSpecifica } from "@/features/dipendenti/formazione-lavoratore";
import type { ContestoRegole } from "@/features/dipendenti/matrice/condizioni-regole";
import { decisioneDi, type DecisioneSpecifica } from "./decisioni";

export type VoceDaValutare = {
  dipendente: Dipendente;
  /** Attestato del corso specifico «diverso»: è lui che porta la decisione. */
  attestato: Attestato;
  corsoSvolto: string;
  corsoAtteso: string;
  stato: StatoSpecifica;
  /** Decisione valida registrata (solo per le «decise»). */
  decisione: DecisioneSpecifica | null;
};

export type ElencoFormazione = {
  pendenti: VoceDaValutare[];
  decise: VoceDaValutare[];
  /** Senza grado di rischio della ditta non si può dire quale formazione specifica sia attesa. */
  rischioNonImpostato: boolean;
};

const STATI_DECISI: StatoSpecifica[] = ["accettata", "integrazione", "non-valida"];

/** Attestato approvato del corso più recente (per data del corso). */
function attestatoDelCorso(attestati: Attestato[], dipendenteId: string, codice: string): Attestato | undefined {
  return attestati
    .filter((a) => a.dipendente_id === dipendenteId && statoRegistrato(a.stato_validazione) && normalizzaCodice(a.tipi_corso?.codice) === codice)
    .sort((a, b) => (b.data_corso ?? "").localeCompare(a.data_corso ?? ""))[0];
}

export function elencoFormazioneDaValutare(input: {
  dipendenti: Dipendente[];
  attestati: Attestato[];
  regole: RegolaRuoloCorso[];
  contesto: ContestoRegole;
}): ElencoFormazione {
  const { dipendenti, attestati, regole, contesto } = input;
  const pendenti: VoceDaValutare[] = [];
  const decise: VoceDaValutare[] = [];
  const perDipendente = new Map<string, Attestato[]>();
  for (const a of attestati) perDipendente.set(a.dipendente_id, [...(perDipendente.get(a.dipendente_id) ?? []), a]);

  for (const d of dipendenti) {
    if (isCessato(d)) continue;
    const suoi = perDipendente.get(d.id) ?? [];
    const decisioni = suoi.map(decisioneDi).filter((x): x is DecisioneSpecifica => x !== null);
    const esito = valutaFormazioneLavoratore({ regole, contesto, corsiSvolti: corsiSvoltiDa(suoi, d.id), decisioni });
    const { stato, trovata, attesa } = esito.specifica;
    if (!trovata || !attesa) continue;
    const pendente = stato === "diversa";
    if (!pendente && !STATI_DECISI.includes(stato)) continue;
    const attestato = attestatoDelCorso(suoi, d.id, trovata);
    if (!attestato) continue;
    const voce: VoceDaValutare = {
      dipendente: d,
      attestato,
      corsoSvolto: trovata,
      corsoAtteso: attesa,
      stato,
      decisione: pendente ? null : (decisioni.find((x) => x.attestatoId === attestato.id) ?? null),
    };
    (pendente ? pendenti : decise).push(voce);
  }

  const perNome = (a: VoceDaValutare, b: VoceDaValutare) =>
    `${a.dipendente.cognome} ${a.dipendente.nome}`.localeCompare(`${b.dipendente.cognome} ${b.dipendente.nome}`, "it");
  return { pendenti: pendenti.sort(perNome), decise: decise.sort(perNome), rischioNonImpostato: !contesto.rischioDitta };
}

/*
 * File:      calcola-fabbisogni-ditta.ts
 * Percorso:  src/features/impostazioni/ditta/calcola-fabbisogni-ditta.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: deduzioni automatiche dalle soglie D.Lgs. 81/08 (RLS, primo soccorso, antincendio, idoneità) e confronto col livello attribuito. Nessun cambio di comportamento.
 *   rev 2 — 15/11/2026 — RLS e Primo Soccorso usano il numero di lavoratori più alto tra dichiarato e in forza nel programma (principio cautelativo).
 */
import { calcolaSoglia, type DittaRecord } from "@/lib/api/ditta";
import { lavoratoriDiRiferimento } from "@/features/ditta/presenze-sedi";

export function calcolaFabbisogniDitta(
  soglie: Parameters<typeof calcolaSoglia>[0],
  form: DittaRecord,
  lavoratoriInForza?: number | null,
) {
  // Principio cautelativo: si adotta il valore più alto tra dichiarato e in forza
  const lavoratoriRiferimento = lavoratoriDiRiferimento(form.n_lavoratori_dichiarato, lavoratoriInForza);

  // Calcolo delle deduzioni automatiche in base alle soglie D.Lgs. 81/08
  const esitoRls = calcolaSoglia(soglie, "rls", lavoratoriRiferimento);
  const esitoPs = calcolaSoglia(soglie, "primo_soccorso", lavoratoriRiferimento);
  const esitoAntincendio = calcolaSoglia(
    soglie,
    "antincendio_presenze",
    form.presenze_contemporanee_max,
  );
  const esitoIdoneita = calcolaSoglia(
    soglie,
    "idoneita_tecnica_presenze",
    form.presenze_contemporanee_max,
  );

  // Verifica se il livello antincendio attribuito differisce da quello proposto dalla legge per le presenze inserite
  const livelloPropostoNum = esitoAntincendio
    ? esitoAntincendio.esito.includes("1")
      ? 1
      : esitoAntincendio.esito.includes("2")
        ? 2
        : esitoAntincendio.esito.includes("3")
          ? 3
          : null
    : null;

  const antincendioDifferisce =
    livelloPropostoNum !== null &&
    form.livello_antincendio !== null &&
    form.livello_antincendio !== undefined &&
    form.livello_antincendio !== livelloPropostoNum;

  return {
    lavoratoriRiferimento,
    esitoRls,
    esitoPs,
    esitoAntincendio,
    esitoIdoneita,
    livelloPropostoNum,
    antincendioDifferisce,
  };
}

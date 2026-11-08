/*
 * File:      calcola-fabbisogni-ditta.ts
 * Percorso:  src/features/impostazioni/ditta/calcola-fabbisogni-ditta.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: deduzioni automatiche dalle soglie D.Lgs. 81/08 (RLS, primo soccorso, antincendio, idoneità) e confronto col livello attribuito. Nessun cambio di comportamento.
 */
import { calcolaSoglia, type DittaRecord } from "@/lib/api/ditta";

export function calcolaFabbisogniDitta(
  soglie: Parameters<typeof calcolaSoglia>[0],
  form: DittaRecord,
) {
  // Calcolo delle deduzioni automatiche in base alle soglie D.Lgs. 81/08
  const esitoRls = calcolaSoglia(soglie, "rls", form.n_lavoratori_dichiarato);
  const esitoPs = calcolaSoglia(soglie, "primo_soccorso", form.n_lavoratori_dichiarato);
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
    esitoRls,
    esitoPs,
    esitoAntincendio,
    esitoIdoneita,
    livelloPropostoNum,
    antincendioDifferisce,
  };
}

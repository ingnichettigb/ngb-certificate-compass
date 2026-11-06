/*
 * File:      raggruppa.ts
 * Percorso:  src/features/scadenze/raggruppa.ts
 * Data creazione: 2026-11-06
 * Revisioni:
 * - Rev 1 (2026-11-06 12:00): Raggruppa gli attestati per lavoratore + corso/macro-categoria e calcola il ciclo una sola volta per gruppo.
 */
import type { Attestato } from "@/lib/api";
import {
  DECADENZA_PREDEFINITA_ANNI,
  valutaCicloFormativo,
  type AttestatoCiclo,
} from "./calcolo-ciclo";
import type { RigaScadenzaDati } from "./types";

function eBase(a: Attestato): boolean {
  return (a.tipi_corso?.livello_specifico ?? "").toLowerCase() === "base";
}

/** Un lavoratore + una macro-categoria (o, se manca, un tipo di corso) = un ciclo formativo. */
export function chiaveGruppo(a: Attestato): string {
  const chi = a.dipendente_id ?? a.codice_fiscale ?? "";
  const macro = a.tipi_corso?.macro_categoria;
  return `${chi}|${macro ? `macro:${macro}` : `tipo:${a.tipo_corso_id}`}`;
}

/** Adatta un attestato al formato del motore. Le ore minime di legge sono solo un ripiego (segnalato). */
export function aAttestatoCiclo(a: Attestato): AttestatoCiclo {
  const dichiarate = a.ore_dichiarate ?? null;
  const minime = a.tipi_corso?.ore_minime_legge ?? null;
  return {
    id: a.id,
    dataCorso: a.data_corso,
    ore: dichiarate ?? minime,
    oreStimate: dichiarate === null && minime !== null,
    eBase: eBase(a),
  };
}

/** Durata ciclo, ore richieste e decadenza del gruppo, letti dal tipo di corso del Base. */
export function parametriDaGruppo(gruppoOrdinato: Attestato[]) {
  const basi = gruppoOrdinato.filter(eBase);
  const base = basi.length > 0 ? basi[basi.length - 1] : gruppoOrdinato[0];
  const ultimoAgg = [...gruppoOrdinato].reverse().find((a) => a !== base && !eBase(a));

  const durataCicloAnni =
    base.tipi_corso?.durata_validita_anni ??
    gruppoOrdinato.reduce((m, a) => Math.max(m, a.tipi_corso?.durata_validita_anni ?? 0), 0);

  const oreRichiesteAggiornamento =
    base.tipi_corso?.ore_aggiornamento ??
    ultimoAgg?.tipi_corso?.ore_aggiornamento ??
    ultimoAgg?.tipi_corso?.ore_minime_legge ??
    0;

  // Colonna facoltativa `decadenza_anni` su tipi_corso: se assente vale il predefinito (10); null = nessuna decadenza.
  const grezzo = (base.tipi_corso as unknown as { decadenza_anni?: number | null } | undefined)
    ?.decadenza_anni;
  const decadenzaAnni = grezzo === undefined ? DECADENZA_PREDEFINITA_ANNI : grezzo;

  return { durataCicloAnni, oreRichiesteAggiornamento, decadenzaAnni };
}

/** Calcola una riga per ogni gruppo lavoratore + corso. Gli attestati respinti non contano. */
export function costruisciRighe(attestati: Attestato[], oggi: Date): RigaScadenzaDati[] {
  const gruppi = new Map<string, Attestato[]>();
  for (const a of attestati) {
    if (a.stato_validazione === "Respinto") continue;
    const k = chiaveGruppo(a);
    const g = gruppi.get(k);
    if (g) g.push(a);
    else gruppi.set(k, [a]);
  }

  const righe: RigaScadenzaDati[] = [];
  for (const [chiave, gruppo] of gruppi) {
    gruppo.sort((a, b) => a.data_corso.localeCompare(b.data_corso));
    const p = parametriDaGruppo(gruppo);
    const ciclo = valutaCicloFormativo({
      attestati: gruppo.map(aAttestatoCiclo),
      durataCicloAnni: p.durataCicloAnni,
      oreRichiesteAggiornamento: p.oreRichiesteAggiornamento,
      decadenzaAnni: p.decadenzaAnni,
      oggi,
    });
    righe.push({ chiave, attestato: gruppo[gruppo.length - 1], attestatiGruppo: gruppo, ciclo });
  }
  return righe;
}

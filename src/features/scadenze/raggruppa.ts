/*
 * File:      raggruppa.ts
 * Percorso:  src/features/scadenze/raggruppa.ts
 * Data creazione: 2026-11-06
 * Revisioni:
 * - Rev 1 (2026-11-06 12:00): Raggruppa gli attestati per lavoratore + corso/macro-categoria e calcola il ciclo una sola volta per gruppo.
 * - Rev 2 (2026-11-06 16:00): Regola Preposti (ciclo biennale, taglio al 19/05/2026); protezione su data_corso nulla.
 * - Rev 3 (2026-11-06 18:00): Regime transitorio completo (cicli vecchi 5 anni troncati al taglio, poi biennali).
 * - Rev 4 (2026-11-10): I corsi ASPP e RSPP hanno un ciclo proprio (non si mescolano a quello dei lavoratori) e
 *   l'RSPP valido esonera dall'aggiornamento Preposto (vedi esenzioni-rspp.ts).
 */
import type { Attestato } from "@/lib/api";
import {
  DECADENZA_PREDEFINITA_ANNI,
  valutaCicloFormativo,
  type AttestatoCiclo,
  type RegimeTransitorio,
} from "./calcolo-ciclo";
import { applicaEsenzioneRspp, famigliaAsppRspp, mappaValiditaRspp, oggiIso } from "./esenzioni-rspp";
import type { RigaScadenzaDati } from "./types";

/** Accordo Stato-Regioni 17/04/2025: aggiornamento Preposti ogni 2 anni. */
export const CICLO_PREPOSTI_ANNI = 2;
/** Data di taglio per i Preposti (entrata in vigore dell'Accordo secondo le FAQ del Ministero del Lavoro). */
export const TAGLIO_PREPOSTI = "2026-05-19";
/** Formazione pregressa: Base anteriore a questa data = oltre 2 anni prima dell'entrata in vigore (19/05/2025). */
export const SOGLIA_EVIDENZA_PREPOSTI = "2023-05-19";
/** Periodicità del vecchio regime (Accordo 2011): 5 anni. */
export const CICLO_VECCHIO_PREPOSTI_ANNI = 5;
const ORE_AGGIORNAMENTO_PREPOSTI = 6;

export const REGIME_TRANSITORIO_PREPOSTI: RegimeTransitorio = {
  dataTaglio: TAGLIO_PREPOSTI,
  dataSogliaEvidenza: SOGLIA_EVIDENZA_PREPOSTI,
  cicloVecchioAnni: CICLO_VECCHIO_PREPOSTI_ANNI,
};

/** Riconosce i corsi Preposto dalla macro-categoria, dal codice (PRP-…) o dal nome. */
export function ePreposto(a: Attestato): boolean {
  const t = a.tipi_corso as
    | { macro_categoria?: string | null; codice?: string | null; nome_corso?: string | null }
    | null
    | undefined;
  return (
    (t?.macro_categoria ?? "").toLowerCase().includes("preposto") ||
    (t?.codice ?? "").toUpperCase().startsWith("PRP-") ||
    (t?.nome_corso ?? "").toLowerCase().includes("preposto")
  );
}

function eBase(a: Attestato): boolean {
  return (a.tipi_corso?.livello_specifico ?? "").toLowerCase() === "base";
}

/** Un lavoratore + una macro-categoria (o, se manca, un tipo di corso) = un ciclo formativo. */
export function chiaveGruppo(a: Attestato): string {
  const chi = a.dipendente_id ?? a.codice_fiscale ?? "";
  // ASPP e RSPP: stessa macro-categoria dei lavoratori ma ciclo formativo a parte (moduli A, B, C, aggiornamento)
  const famiglia = famigliaAsppRspp(a.tipi_corso);
  if (famiglia) return `${chi}|famiglia:${famiglia}`;
  const macro = a.tipi_corso?.macro_categoria;
  return `${chi}|${macro ? `macro:${macro}` : `tipo:${a.tipo_corso_id}`}`;
}

/** Adatta un attestato al formato del motore. Le ore minime di legge sono solo un ripiego (segnalato). */
export function aAttestatoCiclo(a: Attestato): AttestatoCiclo {
  const dichiarate = a.ore_dichiarate ?? null;
  const minime = a.tipi_corso?.ore_minime_legge ?? null;
  return {
    id: a.id,
    dataCorso: a.data_corso ?? "",
    ore: dichiarate ?? minime,
    oreStimate: dichiarate === null && minime !== null,
    eBase: eBase(a),
  };
}

/** Durata ciclo, ore richieste e decadenza del gruppo, letti dal tipo di corso del Base. */
export function parametriDaGruppo(gruppoOrdinato: Attestato[]) {
  const basi = gruppoOrdinato.filter(eBase);
  const base = (basi.length > 0 ? basi[basi.length - 1] : gruppoOrdinato[0])!;
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

  // Preposti: ciclo biennale e taglio al 19/05/2026 (indipendenti dalla durata scritta nel catalogo corsi).
  if (gruppoOrdinato.some(ePreposto)) {
    return {
      durataCicloAnni: CICLO_PREPOSTI_ANNI,
      oreRichiesteAggiornamento: oreRichiesteAggiornamento || ORE_AGGIORNAMENTO_PREPOSTI,
      decadenzaAnni,
      regimeTransitorio: REGIME_TRANSITORIO_PREPOSTI as RegimeTransitorio | null,
    };
  }

  return { durataCicloAnni, oreRichiesteAggiornamento, decadenzaAnni, regimeTransitorio: null as RegimeTransitorio | null };
}

/**
 * Calcola una riga per ogni gruppo lavoratore + corso. Gli attestati respinti non contano.
 * `tuttiGliAttestati` serve a cercare l'RSPP valido quando `attestati` è già filtrato (es. i soli Preposti).
 */
export function costruisciRighe(
  attestati: Attestato[],
  oggi: Date,
  tuttiGliAttestati: Attestato[] = attestati,
): RigaScadenzaDati[] {
  const rspp = mappaValiditaRspp(tuttiGliAttestati, oggiIso(oggi));
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
    gruppo.sort((a, b) => (a.data_corso ?? "").localeCompare(b.data_corso ?? ""));
    const p = parametriDaGruppo(gruppo);
    let ciclo = valutaCicloFormativo({
      attestati: gruppo.map(aAttestatoCiclo),
      durataCicloAnni: p.durataCicloAnni,
      oreRichiesteAggiornamento: p.oreRichiesteAggiornamento,
      decadenzaAnni: p.decadenzaAnni,
      regimeTransitorio: p.regimeTransitorio,
      oggi,
    });
    // Preposto + RSPP valido: l'aggiornamento Preposto non è dovuto (il base resta obbligatorio)
    const rsppDelLavoratore = gruppo.some(ePreposto) ? rspp.get(gruppo[0]!.dipendente_id) : undefined;
    if (rsppDelLavoratore) ciclo = applicaEsenzioneRspp(ciclo, rsppDelLavoratore);
    righe.push({ chiave, attestato: gruppo[gruppo.length - 1]!, attestatiGruppo: gruppo, ciclo });
  }
  return righe;
}

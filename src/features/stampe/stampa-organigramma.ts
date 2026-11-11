/*
 * File:      stampa-organigramma.ts
 * Percorso:  src/features/stampe/stampa-organigramma.ts
 * Data creaz: 09/11/2026
 * Revisioni:
 *   rev 1 — 09/11/2026 20:00 — Righe dell'«Organigramma squadre di sicurezza»: una riga per lavoratore e per squadra (chi è in due squadre
 *            compare in entrambe). Componente = ruolo di squadra assegnato in «Piano Fabbisogno Formativo e Ruoli».
 *   rev 2 — 11/11/2026 20:05 — Applicato includeLavoratorePerStato per il filtro stato lavoratori nell'organigramma squadre.
 */
import type { Attestato, Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import { campiMancanti } from "@/features/dipendenti/anagrafica-completa";
import { ruoliDelGruppo, mansioneDi } from "./stampa-selezioni";
import { celleSquadra, SQUADRE } from "./stampa-squadre";
import { includeLavoratorePerStato, TUTTI } from "./stampa-tipi";
import type { FiltriStampa, RigaStampa } from "./stampa-tipi";

const isoLocale = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Ruoli «di squadra» di un gruppo: esclusi il ruolo obbligatorio per tutti e «Lavoratore». */
function ruoliDiSquadra(chiave: string, ruoli: RuoloSicurezza[]): RuoloSicurezza[] {
  return ruoliDelGruppo(chiave, ruoli).filter((r) => !r.obbligatorio_tutti && r.nome.trim().toLowerCase() !== "lavoratore");
}

export function calcolaRigheOrganigramma(
  dipendenti: Dipendente[],
  attestati: Attestato[],
  ruoli: RuoloSicurezza[],
  assegnazioni: AssegnazioneRuolo[],
  filtri: FiltriStampa,
  soloDipendenti: Set<string> | null = null,
  oggi = new Date(),
): RigaStampa[] {
  const oggiIso = isoLocale(oggi);
  const approvati = attestati.filter((a) => a.stato_validazione === "Approvato");
  const righe: RigaStampa[] = [];

  for (const squadra of SQUADRE) {
    const ruoliSq = ruoliDiSquadra(squadra.chiave, ruoli);
    if (!ruoliSq.length) continue;
    const idRuoli = new Set(ruoliSq.map((r) => r.id));
    const nomeRuolo = new Map(ruoliSq.map((r) => [r.id, r.nome]));
    const componenti = new Map<string, Set<string>>();
    for (const a of assegnazioni) {
      if (!idRuoli.has(a.ruolo_id)) continue;
      const s = componenti.get(a.dipendente_id) ?? new Set<string>();
      s.add(nomeRuolo.get(a.ruolo_id)!);
      componenti.set(a.dipendente_id, s);
    }

    for (const d of dipendenti) {
      const nomi = componenti.get(d.id);
      if (!nomi) continue;
      if (!includeLavoratorePerStato(d.stato_lavoratore, filtri)) continue;
      if (soloDipendenti && !soloDipendenti.has(d.id)) continue;
      if (filtri.reparto !== TUTTI && d.reparto !== filtri.reparto) continue;
      if (filtri.categoria !== TUTTI && d.sottoreparto !== filtri.categoria) continue;
      if (filtri.classe !== TUTTI && d.classe_concorso !== filtri.classe) continue;
      if (filtri.dipendenteId !== TUTTI && d.id !== filtri.dipendenteId) continue;

      const suoi = approvati.filter(
        (a) => a.dipendente_id === d.id && assegnaGruppoArgomento(a.tipi_corso ?? {}).chiave === squadra.chiave,
      );
      const { base, aggiornamento } = celleSquadra(suoi, oggiIso);
      const elenco = [...nomi].sort((a, b) => a.localeCompare(b, "it"));
      righe.push({
        id: `org-${d.id}-${squadra.chiave}`,
        dipendenteId: d.id,
        cognome: d.cognome ?? "",
        nome: d.nome ?? "",
        cf: d.codice_fiscale ?? "",
        reparto: d.reparto ?? "—",
        sottoreparto: d.sottoreparto ?? "",
        materia: d.materia ?? "",
        classe: d.classe_concorso ?? "",
        mansione: mansioneDi(d),
        ruoli: elenco.join(", "),
        ruoliElenco: elenco,
        assunzione: d.data_assunzione ?? null,
        luogoNascita: d.luogo_nascita ?? "",
        dataNascita: d.data_nascita ?? null,
        formazione: {},
        mancanti: campiMancanti(d),
        fineContratto: d.data_fine_contratto ?? null,
        cessazione: d.data_cessazione ?? null,
        corso: "",
        codice: "",
        gruppo: squadra.chiave,
        gruppoTitolo: squadra.nome,
        ore: null,
        numero: "",
        dataCorso: "",
        scadenza: null,
        stato: "valido",
        giorniAllaScadenza: null,
        squadra: squadra.nome,
        cellaBase: base,
        cellaAggiornamento: aggiornamento,
      });
    }
  }
  return righe.sort(
    (a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome, "it") || a.squadra!.localeCompare(b.squadra!, "it"),
  );
}

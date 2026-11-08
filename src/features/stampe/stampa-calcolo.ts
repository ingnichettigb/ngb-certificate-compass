/*
 * File:      stampa-calcolo.ts
 * Percorso:  src/features/stampe/stampa-calcolo.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: calcolo delle righe (per attestato e per lavoratore). Nessun cambio di comportamento.
 *   rev 2 — 08/11/2026 — Elenco lavoratori: i ruoli sono forniti anche come elenco (ruoliElenco) per il raggruppamento per funzione.
 *   rev 3 — 08/11/2026 14:40 — Inclusione automatica di Privacy in ruoliElenco per i lavoratori che hanno attestati Privacy approvati.
 */
import type { Attestato, Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import { applicaScadenzaPreposti } from "@/features/scadenze/preposti";
import type { FiltriStampa as Filtri, RigaStampa, StatoValidita, VoceRuolo } from "./stampa-tipi";
import {
  confermaFiltroRuolo, corrispondeIncompleta, corrispondeRicerca, giorniAllaData, mansioneDi,
  mantieneFiltroIncarico, statoAllaData, voceDelRuolo,
} from "./stampa-selezioni";
import { formazionePerLavoratore } from "./stampa-selezioni";
import { campiMancanti } from "@/features/dipendenti/anagrafica-completa";

export function calcolaRighe(
  attestatiGrezzi: Attestato[],
  filtri: Filtri,
  oggi: Date,
  assegnazioni: AssegnazioneRuolo[] = [],
  soloDipendentiIds: Set<string> | null = null,
  ruoliCatalogo: RuoloSicurezza[] = [],
): RigaStampa[] {
  const attestati = applicaScadenzaPreposti(attestatiGrezzi, oggi);
  const righe: RigaStampa[] = [];

  for (const a of attestati) {
    const d = a.dipendenti;
    const c = a.tipi_corso;
    if (!d || !c) continue;
    if (soloDipendentiIds && !soloDipendentiIds.has(d.id)) continue;
    if (!filtri.includiCessati && d.stato_lavoratore === "cessato") continue;
    if (filtri.reparto !== "tutti" && d.reparto !== filtri.reparto) continue;
    if (filtri.categoria !== "tutti" && d.sottoreparto !== filtri.categoria) continue;
    if (filtri.classe !== "tutti" && d.classe_concorso !== filtri.classe) continue;
    if (filtri.incompleta && !corrispondeIncompleta(d)) continue;
    if (!confermaFiltroRuolo(d.id, filtri.ruoloId, assegnazioni)) continue;

    const grp = assegnaGruppoArgomento(c);
    if (filtri.gruppo !== "tutti" && grp.chiave !== filtri.gruppo) continue;
    if (!mantieneFiltroIncarico(filtri.soloIncarichi, filtri.gruppo, d.id, assegnazioni, ruoliCatalogo)) {
      continue;
    }

    const scad = a.data_scadenza;
    const gg = giorniAllaData(scad, oggi);
    const st: StatoValidita = statoAllaData(a.stato_validazione, scad, gg);

    if (filtri.finestra === "scaduti" && st !== "Scaduto") continue;
    if (filtri.finestra === "90" && (gg === null || gg < 0 || gg > 90)) continue;
    if (filtri.finestra === "180" && (gg === null || gg < 0 || gg > 180)) continue;
    if (filtri.finestra === "270" && (gg === null || gg < 0 || gg > 270)) continue;
    if (filtri.finestra === "365" && (gg === null || gg < 0 || gg > 365)) continue;

    if (!corrispondeRicerca(filtri.ricerca, [d.cognome, d.nome, d.codice_fiscale, c.nome_corso, c.codice])) {
      continue;
    }

    righe.push({
      id: a.id,
      dipendenteId: d.id,
      cognome: d.cognome ?? "",
      nome: d.nome ?? "",
      cf: d.codice_fiscale ?? "",
      reparto: d.reparto ?? "—",
      sottoreparto: d.sottoreparto ?? "",
      materia: d.materia ?? "",
      classe: d.classe_concorso ?? "",
      mansione: mansioneDi(d),
      ruoli: "",
      assunzione: d.data_assunzione ?? null,
      luogoNascita: d.luogo_nascita ?? "",
      dataNascita: d.data_nascita ?? null,
      formazione: {},
      mancanti: campiMancanti(d),
      fineContratto: d.data_fine_contratto ?? null,
      cessazione: d.data_cessazione ?? null,
      corso: c.nome_corso ?? "",
      codice: c.codice ?? "",
      gruppo: grp.chiave,
      gruppoTitolo: grp.titolo,
      ore: a.ore_dichiarate ?? c.ore_minime_legge ?? null,
      numero: a.numero_attestato ?? "",
      dataCorso: a.data_corso ?? "",
      scadenza: scad,
      stato: st,
      giorniAllaScadenza: gg,
    });
  }

  return righe;
}

export function calcolaRigheLavoratori(
  dipendenti: Dipendente[],
  filtri: Filtri,
  assegnazioni: AssegnazioneRuolo[] = [],
  ruoli: RuoloSicurezza[] = [],
  attestati: Attestato[] = [],
  soloDipendentiIds: Set<string> | null = null,
  oggi: Date = new Date(),
): RigaStampa[] {
  let elenco = dipendenti.filter((d) => filtri.includiCessati || d.stato_lavoratore !== "cessato");
  if (soloDipendentiIds) elenco = elenco.filter((d) => soloDipendentiIds.has(d.id));
  if (filtri.reparto !== "tutti") elenco = elenco.filter((d) => d.reparto === filtri.reparto);
  if (filtri.categoria !== "tutti") elenco = elenco.filter((d) => d.sottoreparto === filtri.categoria);
  if (filtri.classe !== "tutti") elenco = elenco.filter((d) => d.classe_concorso === filtri.classe);
  if (filtri.incompleta) elenco = elenco.filter(corrispondeIncompleta);

  if (filtri.ricerca.trim()) {
    const q = filtri.ricerca.toLowerCase().trim();
    elenco = elenco.filter(
      (d) =>
        (d.cognome ?? "").toLowerCase().includes(q) ||
        (d.nome ?? "").toLowerCase().includes(q) ||
        (d.codice_fiscale ?? "").toLowerCase().includes(q) ||
        (d.reparto ?? "").toLowerCase().includes(q) ||
        (d.sottoreparto ?? "").toLowerCase().includes(q),
    );
  }

  if (filtri.ruoloId !== "tutti") {
    const con = new Set(assegnazioni.filter((a) => a.ruolo_id === filtri.ruoloId).map((a) => a.dipendente_id));
    elenco = elenco.filter((d) => con.has(d.id));
  }

  const nomeRuolo = new Map(ruoli.filter((r) => r.attivo).map((r) => [r.id, r.nome]));
  const ruoliPer = new Map<string, string[]>();
  for (const a of assegnazioni) {
    const n = nomeRuolo.get(a.ruolo_id);
    if (!n) continue;
    ruoliPer.set(a.dipendente_id, [...(ruoliPer.get(a.dipendente_id) ?? []), n]);
  }

  // Riconoscimento dei lavoratori con corsi Privacy approvati
  for (const a of attestati) {
    if (a.stato_validazione === "Approvato" && a.tipi_corso) {
      const c = (a.tipi_corso.codice ?? "").toUpperCase();
      const n = (a.tipi_corso.nome_corso ?? "").toLowerCase();
      if (c.startsWith("PRIV") || n.includes("privacy")) {
        const gia = ruoliPer.get(a.dipendente_id) ?? [];
        if (!gia.some((x) => x.toLowerCase().includes("privacy"))) {
          ruoliPer.set(a.dipendente_id, [...gia, "Privacy"]);
        }
      }
    }
  }

  const formazione = formazionePerLavoratore(attestati, oggi);

  // Voci per cui ogni lavoratore ha il ruolo assegnato (solo ruoli attivi).
  const vocePerRuolo = new Map(ruoli.filter((r) => r.attivo).map((r) => [r.id, voceDelRuolo(r)]));
  const vociPer = new Map<string, Set<VoceRuolo>>();
  for (const a of assegnazioni) {
    const v = vocePerRuolo.get(a.ruolo_id);
    if (!v) continue;
    (vociPer.get(a.dipendente_id) ?? vociPer.set(a.dipendente_id, new Set()).get(a.dipendente_id)!).add(v);
  }

  return elenco
    .map((d): RigaStampa => ({
      id: d.id,
      dipendenteId: d.id,
      cognome: d.cognome ?? "",
      nome: d.nome ?? "",
      cf: d.codice_fiscale ?? "",
      reparto: d.reparto ?? "—",
      sottoreparto: d.sottoreparto ?? "",
      materia: d.materia ?? "",
      classe: d.classe_concorso ?? "",
      mansione: mansioneDi(d),
      ruoli: [...(ruoliPer.get(d.id) ?? [])].sort((a, b) => a.localeCompare(b, "it")).join(", "),
      ruoliElenco: [...(ruoliPer.get(d.id) ?? [])].sort((a, b) => a.localeCompare(b, "it")),
      assunzione: d.data_assunzione ?? null,
      luogoNascita: d.luogo_nascita ?? "",
      dataNascita: d.data_nascita ?? null,
      formazione: formazione.get(d.id) ?? {},
      ruoliVoci: [...(vociPer.get(d.id) ?? [])],
      mancanti: campiMancanti(d),
      fineContratto: d.data_fine_contratto ?? null,
      cessazione: d.data_cessazione ?? null,
      corso: "",
      codice: "",
      gruppo: "",
      gruppoTitolo: "",
      ore: null,
      numero: "",
      dataCorso: "",
      scadenza: null,
      stato: "Valido",
      giorniAllaScadenza: null,
    }))
    .sort((a, b) => a.cognome.localeCompare(b.cognome, "it") || a.nome.localeCompare(b.nome, "it"));
}

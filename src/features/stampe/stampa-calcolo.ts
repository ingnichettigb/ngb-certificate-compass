/*
 * File:      stampa-calcolo.ts
 * Percorso:  src/features/stampe/stampa-calcolo.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: calcolo delle righe (per attestato e per lavoratore). Nessun cambio di comportamento.
 *   rev 5 — 09/11/2026 20:00 — Allineata la chiamata a formazionePerLavoratore (attestati, oggi) alla sua definizione.
 *   rev 6 — 11/11/2026 10:45 — «In squadra» anche per la squadra di evacuazione (gruppo «evacuazione»).
 *   rev 7 — 11/11/2026 17:30 — Filtro «Stato lavoratore»: righeMancanti, calcolaRighe e calcolaRigheLavoratori usano includeLavoratorePerStato.
 *   rev 8 — 14/11/2026 — calcolaRighe passa alla riga l'esonero RSPP/ASPP dal Preposto (esenzioneRspp).
 *   rev 9 — 22/11/2026 — Scadenze: aggiornamento senza corso base (defibrillatore, antincendio, primo soccorso, preposti) = niente «Scaduto»;
 *            riga «Manca corso base» sopra l'aggiornamento (stampa-senza-base.ts). Il motore dei cicli non cambia. Ordine delle revisioni ripristinato.
 *   rev 10 — 22/11/2026 — Con filtri.senzaFinestra le scadenze non sono limitate ai 12 mesi (vista «Tutti gli addetti»); senza il flag nulla cambia.
 *   rev 11 — 22/11/2026 — Le righe per attestato portano la data di assunzione dall'anagrafica (colonna «Data assunzione» scelta dal «+»).
 *   rev 12 — 23/11/2026 14:15 — righeMancanti e righeMancaBase impostano nome «Corso base – ...» e testoManca «MANCA» in rosso.
 *   rev 13 — 23/11/2026 15:35 — RigaStampa propaga daRifareBase da applicaScadenzaCicli e per Primo Soccorso scaduto.
 */
import { statoRegistrato } from "@/lib/api/attestati";
import type { Attestato, Dipendente, TipoCorso } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { assegnaGruppoArgomento, GRUPPI_ARGOMENTO } from "@/features/tipi-corso/tipi-raggruppamento";
import { applicaScadenzaCicli, type AttestatoValutato } from "@/features/scadenze/preposti";
import { campiMancanti } from "@/features/dipendenti/anagrafica-completa";
import { includeLavoratorePerStato, TUTTI } from "./stampa-tipi";
import type { FiltriStampa, RigaStampa, VoceRuolo } from "./stampa-tipi";
import { aggiornamentiSenzaBase, eAggiornamento, TESTO_MANCA } from "./stampa-senza-base";
import { dipendentiConRuolo, formazionePerLavoratore, mansioneDi, nellaFinestra, ordina, ruoliDelGruppo, statoValidita, voceDelRuolo, voceFormazione } from "./stampa-selezioni";

const ETICHETTA_CORSO_MANCANTE = { corsoBase: "Corso base (formazione generale)", corsoSpecifico: "Corso specifico" } as const;

/** Gruppi tematici della sicurezza che identificano una squadra operativa o un incarico specifico. */
const GRUPPI_SQUADRA = new Set(["primo-soccorso", "antincendio", "defibrillatore", "preposti", "emergenze", "evacuazione"]);

/**
 * Determina se un corso/gruppo è legato a una squadra o ruolo operativo e se il dipendente ne fa parte.
 */
function calcolaInSquadra(
  dipendenteId: string,
  tipoCorso: TipoCorso | null | undefined,
  gruppoChiave: string,
  ruoli: RuoloSicurezza[],
  assegnazioni: AssegnazioneRuolo[],
): boolean | null {
  const gruppo = gruppoChiave || (tipoCorso ? assegnaGruppoArgomento(tipoCorso).chiave : "");
  if (!GRUPPI_SQUADRA.has(gruppo)) return null;

  const ruoliSquadra = ruoliDelGruppo(gruppo, ruoli).filter(
    (r) => !r.obbligatorio_tutti && r.nome.trim().toLowerCase() !== "lavoratore",
  );
  if (!ruoliSquadra.length) return null;

  const idRuoliSquadra = new Set(ruoliSquadra.map((r) => r.id));
  return assegnazioni.some((a) => a.dipendente_id === dipendenteId && idRuoliSquadra.has(a.ruolo_id));
}

/**
 * Lavoratori a cui il corso manca, come righe con stato «Manca». Chi deve averlo:
 * - Corso base / Corso specifico: tutti i lavoratori (con i filtri scelti);
 * - gruppo corsi con «Solo incarichi attualmente assegnati»: chi ha oggi il ruolo collegato; senza ruolo collegato nessuno.
 */
function righeMancanti(
  dipendenti: Dipendente[],
  attestati: Attestato[],
  filtri: FiltriStampa,
  assegnazioni: AssegnazioneRuolo[],
  ruoli: RuoloSicurezza[],
  soloDipendenti: Set<string> | null,
): RigaStampa[] {
  let obbligati: Dipendente[];
  let corso: string;
  let gruppo: string;
  let gruppoTitolo: string;
  let haCorso: (a: Attestato) => boolean;
  if (filtri.soloCorso) {
    const voce = filtri.soloCorso;
    obbligati = dipendenti;
    corso = ETICHETTA_CORSO_MANCANTE[voce];
    gruppo = "sicurezza-lavoratori";
    gruppoTitolo = "Sicurezza lavoratori";
    haCorso = (a) => !a.tipi_corso || voceFormazione(a.tipi_corso) === voce;
  } else if (filtri.gruppo !== TUTTI && filtri.soloIncarichi) {
    const collegati = ruoliDelGruppo(filtri.gruppo, ruoli);
    if (!collegati.length) return [];
    const idRuoli = new Set(collegati.map((r) => r.id));
    const dipendentiConRuoloSet = new Set(
      assegnazioni.filter((a) => idRuoli.has(a.ruolo_id)).map((a) => a.dipendente_id),
    );
    obbligati = dipendenti.filter((d) => dipendentiConRuoloSet.has(d.id));
    const arg = GRUPPI_ARGOMENTO.find((g) => g.chiave === filtri.gruppo);
    corso = `Corso base – ${arg?.titolo ?? filtri.gruppo}`;
    gruppo = filtri.gruppo;
    gruppoTitolo = arg?.titolo ?? filtri.gruppo;
    haCorso = (a) => {
      if (!a.tipi_corso) return false;
      return assegnaGruppoArgomento(a.tipi_corso).chiave === filtri.gruppo;
    };
  } else {
    return [];
  }

  const approvatiPerDipendente = new Map<string, Attestato[]>();
  for (const a of attestati) {
    if (!statoRegistrato(a.stato_validazione)) continue;
    const lista = approvatiPerDipendente.get(a.dipendente_id) ?? [];
    lista.push(a);
    approvatiPerDipendente.set(a.dipendente_id, lista);
  }

  return obbligati
    .filter((d) => includeLavoratorePerStato(d.stato_lavoratore, filtri))
    .filter((d) => !soloDipendenti || soloDipendenti.has(d.id))
    .filter((d) => !filtri.reparto || filtri.reparto === TUTTI || d.reparto === filtri.reparto)
    .filter((d) => !filtri.categoria || filtri.categoria === TUTTI || d.sottoreparto === filtri.categoria)
    .filter((d) => !filtri.classe || filtri.classe === TUTTI || d.classe_concorso === filtri.classe)
    .filter((d) => !filtri.dipendenteId || filtri.dipendenteId === TUTTI || d.id === filtri.dipendenteId)
    .filter((d) => !(approvatiPerDipendente.get(d.id) ?? []).some(haCorso))
    .map((d): RigaStampa => ({
      id: `manca-${d.id}-${gruppo}-${filtri.soloCorso ?? "base"}`,
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
      corso,
      codice: "",
      gruppo,
      gruppoTitolo,
      ore: null,
      numero: "",
      dataCorso: "",
      scadenza: null,
      stato: "manca",
      testoManca: TESTO_MANCA,
      giorniAllaScadenza: null,
      inSquadra: true,
    }));
}

/**
 * Per ogni lavoratore con almeno un aggiornamento privo del corso base (aggiornamentoSenzaBase),
 * genera una riga virtuale «Corso base – ...» con stato «manca» e testoManca «MANCA» da mostrare in cima al gruppo.
 */
function righeMancaBase(righe: RigaStampa[]): RigaStampa[] {
  const visti = new Set<string>();
  const out: RigaStampa[] = [];
  for (const r of righe) {
    if (!r.aggiornamentoSenzaBase) continue;
    const k = `${r.dipendenteId}|${r.gruppo}`;
    if (visti.has(k)) continue;
    visti.add(k);
    out.push({
      ...r,
      id: `manca-base-${r.dipendenteId}-${r.gruppo}`,
      corso: `Corso base – ${r.gruppoTitolo || r.gruppo}`,
      codice: "",
      ore: null,
      numero: "",
      dataCorso: "",
      scadenza: null,
      stato: "manca",
      testoManca: TESTO_MANCA,
      giorniAllaScadenza: null,
      senzaFile: false,
      aggiornamentoSenzaBase: false,
    });
  }
  return out;
}

/** Righe di dettaglio (un record per attestato, o riga sintetica se manca). */
export function calcolaRighe(
  attestatiGrezzi: Attestato[],
  filtri: FiltriStampa,
  oggi = new Date(),
  assegnazioni: AssegnazioneRuolo[] = [],
  soloDipendenti: Set<string> | null = null,
  ruoli: RuoloSicurezza[] = [],
  dipendenti: Dipendente[] = [],
): RigaStampa[] {
  const attestati = applicaScadenzaCicli(
    attestatiGrezzi.filter((a) => statoRegistrato(a.stato_validazione)),
    oggi,
  );
  const senzaBase = filtri.modello === "scadenze" ? aggiornamentiSenzaBase(attestati) : new Set<string>();
  let righe = attestati
    .filter((a) => statoRegistrato(a.stato_validazione) && a.dipendenti)
    .filter((a) => includeLavoratorePerStato(a.dipendenti!.stato_lavoratore, filtri))
    .filter((a) => !filtri.soloCorso || (!!a.tipi_corso && voceFormazione(a.tipi_corso) === filtri.soloCorso))
    .map((a): RigaStampa => {
      const d = a.dipendenti!;
      const tc = a.tipi_corso;
      const g = assegnaGruppoArgomento(tc ?? {});
      const { stato, giorni } = statoValidita(a.data_scadenza_calcolata, oggi);
      const aVal = a as AttestatoValutato;
      const ePrimoSoccorso = g.chiave === "primo-soccorso";
      const daRifareBase = Boolean(aVal.daRifareBase || (ePrimoSoccorso && stato === "scaduto"));
      return {
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
        corso: tc?.nome_corso ?? "—",
        codice: tc?.codice ?? "",
        gruppo: g.chiave,
        gruppoTitolo: g.titolo,
        ore: a.ore_dichiarate,
        numero: a.numero_attestato ?? "",
        dataCorso: a.data_corso,
        scadenza: a.data_scadenza_calcolata,
        stato,
        giorniAllaScadenza: giorni,
        inSquadra: calcolaInSquadra(d.id, tc, g.chiave, ruoli, assegnazioni),
        daRifareBase,
        ...(!a.url_foto_fronte?.trim() || a.stato_validazione === "File Attestato mancante" ? { senzaFile: true } : {}),
        ...(a.esenzioneRspp ? { esenzioneRspp: a.esenzioneRspp } : {}),
        ...(senzaBase.has(`${d.id}|${g.chiave}`) && eAggiornamento(tc)
          ? { aggiornamentoSenzaBase: true, scadenza: null, stato: "senza_scadenza" as const, giorniAllaScadenza: null }
          : {}),
      };
    });

  if (soloDipendenti) righe = righe.filter((r) => soloDipendenti.has(r.dipendenteId));
  if (filtri.incompleta) righe = righe.filter((r) => r.mancanti.length > 0);
  if (filtri.gruppo !== TUTTI) righe = righe.filter((r) => r.gruppo === filtri.gruppo);
  if (filtri.reparto !== TUTTI) righe = righe.filter((r) => r.reparto === filtri.reparto);
  if (filtri.categoria !== TUTTI) righe = righe.filter((r) => r.sottoreparto === filtri.categoria);
  if (filtri.classe !== TUTTI) righe = righe.filter((r) => r.classe === filtri.classe);
  if (filtri.dipendenteId !== TUTTI) righe = righe.filter((r) => r.dipendenteId === filtri.dipendenteId);
  if (filtri.soloIncarichi && filtri.gruppo !== TUTTI) {
    const collegati = ruoliDelGruppo(filtri.gruppo, ruoli);
    if (collegati.length) {
      const con = new Set(assegnazioni.filter((a) => collegati.some((r) => r.id === a.ruolo_id)).map((a) => a.dipendente_id));
      righe = righe.filter((r) => con.has(r.dipendenteId));
    }
  }
  if (filtri.ruoloId !== TUTTI) {
    const con = dipendentiConRuolo(filtri.ruoloId, assegnazioni);
    righe = righe.filter((r) => con.has(r.dipendenteId));
  }

  if (filtri.soloUltimo) {
    const ultimo = new Map<string, RigaStampa>();
    for (const r of righe) {
      const k = `${r.dipendenteId}|${r.codice || r.corso}`;
      const p = ultimo.get(k);
      if (!p || r.dataCorso > p.dataCorso) ultimo.set(k, r);
    }
    righe = [...ultimo.values()];
  }

  const finestra = filtri.senzaFinestra ? "tutti" : filtri.modello === "scadenze" && filtri.finestra === "tutti" ? "365" : filtri.finestra;
  righe = righe.filter((r) => r.aggiornamentoSenzaBase || nellaFinestra(r, finestra));
  righe = [...righe, ...righeMancaBase(righe)];
  if (filtri.conMancanti && dipendenti.length) {
    righe = [...righe, ...righeMancanti(dipendenti, attestati, filtri, assegnazioni, ruoli, soloDipendenti)];
  }
  return righe.sort(ordina);
}

/** Elenco anagrafico dei lavoratori (in servizio, o anche cessati se richiesto). */
export function calcolaRigheLavoratori(
  dipendenti: Dipendente[],
  filtri: FiltriStampa,
  assegnazioni: AssegnazioneRuolo[] = [],
  ruoli: RuoloSicurezza[] = [],
  attestati: Attestato[] = [],
  soloDipendenti: Set<string> | null = null,
  oggi = new Date(),
): RigaStampa[] {
  const ruoliPer = new Map<string, Set<string>>();
  const vociPer = new Map<string, Set<VoceRuolo>>();
  for (const a of assegnazioni) {
    const r = ruoli.find((x) => x.id === a.ruolo_id);
    if (!r?.attivo) continue;
    const v = voceDelRuolo(r);
    if (v) {
      if (!vociPer.has(a.dipendente_id)) vociPer.set(a.dipendente_id, new Set());
      vociPer.get(a.dipendente_id)!.add(v);
    }
    if (!ruoliPer.has(a.dipendente_id)) ruoliPer.set(a.dipendente_id, new Set());
    ruoliPer.get(a.dipendente_id)!.add(r.nome);
  }
  for (const r of ruoli.filter((x) => x.attivo && x.obbligatorio_tutti)) {
    const v = voceDelRuolo(r);
    for (const d of dipendenti) {
      if (v) {
        if (!vociPer.has(d.id)) vociPer.set(d.id, new Set());
        vociPer.get(d.id)!.add(v);
      }
      if (!ruoliPer.has(d.id)) ruoliPer.set(d.id, new Set());
      ruoliPer.get(d.id)!.add(r.nome);
    }
  }

  const formazione = formazionePerLavoratore(attestati, oggi);
  let righe = dipendenti
    .filter((d) => includeLavoratorePerStato(d.stato_lavoratore, filtri))
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
      stato: "valido",
      giorniAllaScadenza: null,
    }));

  if (soloDipendenti) righe = righe.filter((r) => soloDipendenti.has(r.dipendenteId));
  if (filtri.incompleta) righe = righe.filter((r) => r.mancanti.length > 0);
  if (filtri.reparto !== TUTTI) righe = righe.filter((r) => r.reparto === filtri.reparto);
  if (filtri.categoria !== TUTTI) righe = righe.filter((r) => r.sottoreparto === filtri.categoria);
  if (filtri.classe !== TUTTI) righe = righe.filter((r) => r.classe === filtri.classe);
  if (filtri.dipendenteId !== TUTTI) righe = righe.filter((r) => r.dipendenteId === filtri.dipendenteId);
  if (filtri.ruoloId !== TUTTI) {
    const con = dipendentiConRuolo(filtri.ruoloId, assegnazioni);
    righe = righe.filter((r) => con.has(r.dipendenteId));
  }
  return righe.sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome, "it"));
}

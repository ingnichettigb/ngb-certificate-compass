/*
 * File:      stampa-calcolo.ts
 * Percorso:  src/features/stampe/stampa-calcolo.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: calcolo delle righe (per attestato e per lavoratore). Nessun cambio di comportamento.
 *   rev 2 — 08/11/2026 — Elenco lavoratori: i ruoli sono forniti anche come elenco (ruoliElenco) per il raggruppamento per funzione.
 *   rev 3 — 09/11/2026 17:30 — Calcolo del campo «inSquadra» per ciascun attestato incrociando corso e ruoli assegnati.
 *   rev 5 — 09/11/2026 20:00 — Allineata la chiamata a formazionePerLavoratore (attestati, oggi) alla sua definizione.
 *   rev 6 — 11/11/2026 10:45 — «In squadra» anche per la squadra di evacuazione (gruppo «evacuazione»).
 *   rev 7 — 11/11/2026 17:30 — Filtro «Stato lavoratore»: righeMancanti, calcolaRighe e calcolaRigheLavoratori usano includeLavoratorePerStato.
 *   rev 4 — 09/11/2026 17:50 — Campo «inSquadra» calcolato a livello di squadra/gruppo anziché sul singolo corso: esito univoco (Sì/No) per il lavoratore sia su corso base che su aggiornamenti.
 */
import type { Attestato, Dipendente, TipoCorso } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { assegnaGruppoArgomento, GRUPPI_ARGOMENTO } from "@/features/tipi-corso/tipi-raggruppamento";
import { applicaScadenzaCicli } from "@/features/scadenze/preposti";
import { campiMancanti } from "@/features/dipendenti/anagrafica-completa";
import { includeLavoratorePerStato, TUTTI } from "./stampa-tipi";
import type { FiltriStampa, RigaStampa, VoceRuolo } from "./stampa-tipi";
import { dipendentiConRuolo, formazionePerLavoratore, mansioneDi, nellaFinestra, ordina, ruoliDelGruppo, statoValidita, voceDelRuolo, voceFormazione } from "./stampa-selezioni";

const ETICHETTA_CORSO_MANCANTE = { corsoBase: "Corso base (formazione generale)", corsoSpecifico: "Corso specifico" } as const;

/** Gruppi tematici della sicurezza che identificano una squadra operativa o un incarico specifico. */
const GRUPPI_SQUADRA = new Set(["primo-soccorso", "antincendio", "defibrillatore", "preposti", "emergenze", "evacuazione"]);

/**
 * Determina se un corso/gruppo è legato a una squadra o ruolo operativo e se il dipendente ne fa parte.
 * Restituisce true se ha l'incarico, false se non lo ha, null se per il corso non esiste squadra.
 *
 * La verifica è condotta a livello di squadra (gruppo tematico), in modo che sia per il corso base
 * sia per i successivi aggiornamenti la risposta sia univoca per il lavoratore (Sì se in squadra, No se escluso).
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
    gruppoTitolo = GRUPPI_ARGOMENTO.find((g) => g.chiave === gruppo)?.titolo ?? "Sicurezza lavoratori";
    haCorso = (a) => !!a.tipi_corso && voceFormazione(a.tipi_corso) === voce;
  } else if (filtri.gruppo !== TUTTI && filtri.soloIncarichi) {
    const collegati = ruoliDelGruppo(filtri.gruppo, ruoli);
    if (!collegati.length) return [];
    const con = new Set(assegnazioni.filter((a) => collegati.some((r) => r.id === a.ruolo_id)).map((a) => a.dipendente_id));
    obbligati = dipendenti.filter((d) => con.has(d.id));
    gruppo = filtri.gruppo;
    gruppoTitolo = GRUPPI_ARGOMENTO.find((g) => g.chiave === gruppo)?.titolo ?? gruppo;
    corso = gruppoTitolo;
    haCorso = (a) => assegnaGruppoArgomento(a.tipi_corso ?? {}).chiave === gruppo;
  } else {
    return [];
  }

  const conCorso = new Set(attestati.filter(haCorso).map((a) => a.dipendente_id));
  const conRuolo = filtri.ruoloId !== TUTTI ? dipendentiConRuolo(filtri.ruoloId, assegnazioni) : null;
  return obbligati
    .filter((d) => includeLavoratorePerStato(d.stato_lavoratore, filtri))
    .filter((d) => !conCorso.has(d.id))
    .filter((d) => !soloDipendenti || soloDipendenti.has(d.id))
    .filter((d) => filtri.reparto === TUTTI || d.reparto === filtri.reparto)
    .filter((d) => filtri.categoria === TUTTI || d.sottoreparto === filtri.categoria)
    .filter((d) => filtri.classe === TUTTI || d.classe_concorso === filtri.classe)
    .filter((d) => filtri.dipendenteId === TUTTI || d.id === filtri.dipendenteId)
    .filter((d) => !conRuolo || conRuolo.has(d.id))
    .map((d): RigaStampa => ({
      id: `manca-${d.id}-${gruppo}-${filtri.soloCorso ?? ""}`,
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
      giorniAllaScadenza: null,
      inSquadra: calcolaInSquadra(d.id, null, gruppo, ruoli, assegnazioni),
    }));
}

/** Converte gli attestati approvati in righe filtrate e ordinate per cognome, nome, data corso. */
export function calcolaRighe(
  attestatiGrezzi: Attestato[],
  filtri: FiltriStampa,
  oggi = new Date(),
  assegnazioni: AssegnazioneRuolo[] = [],
  soloDipendenti: Set<string> | null = null,
  ruoli: RuoloSicurezza[] = [],
  dipendenti: Dipendente[] = [],
): RigaStampa[] {
  // Solo attestati approvati; i Preposti hanno data e stato dal motore dei cicli (regime transitorio).
  const attestati = applicaScadenzaCicli(
    attestatiGrezzi.filter((a) => a.stato_validazione === "Approvato"),
    oggi,
  );
  let righe = attestati
    .filter((a) => a.stato_validazione === "Approvato" && a.dipendenti)
    .filter((a) => includeLavoratorePerStato(a.dipendenti!.stato_lavoratore, filtri))
    .filter((a) => !filtri.soloCorso || (!!a.tipi_corso && voceFormazione(a.tipi_corso) === filtri.soloCorso))
    .map((a): RigaStampa => {
      const d = a.dipendenti!;
      const tc = a.tipi_corso;
      const g = assegnaGruppoArgomento(tc ?? {});
      const { stato, giorni } = statoValidita(a.data_scadenza_calcolata, oggi);
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
        assunzione: null,
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

  const finestra = filtri.modello === "scadenze" && filtri.finestra === "tutti" ? "365" : filtri.finestra;
  righe = righe.filter((r) => nellaFinestra(r, finestra));
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

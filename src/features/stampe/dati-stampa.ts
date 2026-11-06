/*
 * File:      dati-stampa.ts
 * Percorso:  src/features/stampe/dati-stampa.ts
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Filtri e calcolo righe per le stampe (registro, gruppi, scadenze, schede, reparti).
 *   rev 2 — 03/11/2026 20:50 — Filtri ruolo/categoria/materia, scadenza 9 mesi, modello «Elenco lavoratori in servizio»,
 *                              colonne predefinite per modello (rimovibili in anteprima).
 *   rev 3 — 04/11/2026 10:20 — Spazio firme disattivato di default (mostraFirme: false).
 *   rev 4 — 05/11/2026 18:30 — Selezione «Nuovi arrivati dell'anno» (anno scolastico o solare) e colonne nascita,
 *                              corso base, specifico, preposto, antincendio, primo soccorso.
 *   rev 5 — 05/11/2026 19:50 — Selezione «Anagrafica incompleta» (campi mancanti per lavoratore), colonne «Cosa manca»,
 *                              fine contratto e cessazione, titolo stampa dinamico, passaggio automatico all'elenco lavoratori.
 *   rev 6 — 05/11/2026 21:30 — La regola dei dati mancanti (campiMancanti, etichette) è spostata in dipendenti/anagrafica-completa.ts
 *                              e qui riesportata: nessun cambio di comportamento.
 *   rev 7 — 06/11/2026 — Ordinamento per colonna (A→Z / Z→A) e «Univoco» (una riga per lavoratore, scadenza più urgente).
 *   rev 8 — 06/11/2026 18:00 — Preposti: data e stato da motore dei cicli (regime transitorio 19/05/2026).
 *   rev 9 — 06/11/2026 — Selezione «Senza attestati»: lavoratori a cui manca il Corso base e/o il Corso specifico (minimi richiesti),
 *                        con colonne Corso base / Corso specifico (data dove c'è, «No» dove manca).
 *                        Scelta tra «Nessuno dei due» e «Manca almeno uno dei due».
 */
import type { Attestato, Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import type { TipoCorso } from "@/lib/api/tipi-corso";
import { applicaScadenzaPreposti } from "@/features/scadenze/preposti";
import { campiMancanti, ETICHETTA_CAMPO, type CampoAnagrafica } from "@/features/dipendenti/anagrafica-completa";

// La regola dei dati mancanti vive in dipendenti/anagrafica-completa.ts (condivisa con la coda «Da completare»).
export { campiMancanti, ETICHETTA_CAMPO };
export type { CampoAnagrafica };

export type Modello = "registro" | "gruppo" | "scadenze" | "scheda" | "reparto" | "lavoratori";
export type Finestra = "tutti" | "scaduti" | "90" | "180" | "270" | "365";
export type StatoValidita = "valido" | "in_scadenza" | "scaduto" | "senza_scadenza";

/** Voci di formazione mostrate come Sì/No nell'elenco lavoratori. */
export type VoceFormazione = "corsoBase" | "corsoSpecifico" | "preposto" | "antincendio" | "primoSoccorso";

export type Colonna =
  | "lavoratore" | "cf" | "reparto" | "mansione" | "ruoli" | "assunzione" | "nascita"
  | "mancano" | "fineContratto" | "cessazione"
  | VoceFormazione
  | "corso" | "ore" | "numero" | "data" | "scadenza" | "stato";

/** «no» = selezione spenta; scolastico = dal 1 settembre; solare = dal 1 gennaio. */
export type PeriodoArrivi = "no" | "scolastico" | "solare";

/** «Senza attestati»: nessuno = né Corso base né Corso specifico; almeno = manca almeno uno dei due. */
export type ModoSenza = "nessuno" | "almeno";

export const TUTTI = "__tutti__";

export type FiltriStampa = {
  modello: Modello;
  gruppo: string; // chiave gruppo argomento o TUTTI
  reparto: string; // nome reparto o TUTTI
  ruoloId: string; // id ruolo di sicurezza o TUTTI
  categoria: string; // sottoreparto / profilo ATA o TUTTI
  materia: string; // materia docente o TUTTI
  dipendenteId: string; // id o TUTTI
  finestra: Finestra;
  includiCessati: boolean;
  soloUltimo: boolean; // solo l'attestato più recente per lavoratore+corso
  mostraFirme: boolean;
  arrivi: PeriodoArrivi; // selezione «Nuovi arrivati dell'anno»
  incompleta: boolean; // selezione «Anagrafica incompleta»
  senzaAttestati: boolean; // selezione «Senza attestati»
  senzaModo: ModoSenza; // «nessuno» dei due minimi oppure manca «almeno» uno dei due
  modelloPrima: Modello | null; // modello da ripristinare quando si spengono le selezioni
};

export const FILTRI_INIZIALI: FiltriStampa = {
  modello: "registro",
  gruppo: TUTTI,
  reparto: TUTTI,
  ruoloId: TUTTI,
  categoria: TUTTI,
  materia: TUTTI,
  dipendenteId: TUTTI,
  finestra: "tutti",
  includiCessati: false,
  soloUltimo: true,
  mostraFirme: false,
  arrivi: "no",
  incompleta: false,
  senzaAttestati: false,
  senzaModo: "almeno",
  modelloPrima: null,
};

export type RigaStampa = {
  id: string;
  dipendenteId: string;
  cognome: string;
  nome: string;
  cf: string;
  reparto: string;
  sottoreparto: string;
  materia: string;
  mansione: string;
  ruoli: string;
  assunzione: string | null;
  luogoNascita: string;
  dataNascita: string | null;
  /** Testo già pronto per le voci fatte; le voci assenti valgono «No». */
  formazione: Partial<Record<VoceFormazione, string>>;
  /** Campi anagrafici assenti (solo per l'anagrafica incompleta; vuoto = completa). */
  mancanti: CampoAnagrafica[];
  fineContratto: string | null;
  cessazione: string | null;
  corso: string;
  codice: string;
  gruppo: string;
  gruppoTitolo: string;
  ore: number | null;
  numero: string;
  dataCorso: string;
  scadenza: string | null;
  stato: StatoValidita;
  giorniAllaScadenza: number | null;
};

/** Colonne mostrate di partenza per ogni modello (l'utente può toglierle in anteprima). */
export const COLONNE_PREDEFINITE: Record<Modello, Colonna[]> = {
  registro: ["lavoratore", "cf", "reparto", "corso", "ore", "numero", "data", "scadenza", "stato"],
  scadenze: ["scadenza", "stato", "lavoratore", "cf", "reparto", "corso", "data"],
  gruppo: ["lavoratore", "cf", "reparto", "corso", "ore", "data", "scadenza", "stato"],
  reparto: ["lavoratore", "cf", "corso", "ore", "data", "scadenza", "stato"],
  scheda: ["corso", "ore", "numero", "data", "scadenza", "stato"],
  lavoratori: ["lavoratore", "cf", "reparto", "mansione", "ruoli", "assunzione"],
};

/** Colonne dell'elenco lavoratori quando è attiva la selezione «Nuovi arrivati». */
export const COLONNE_NUOVI_ARRIVATI: Colonna[] = [
  "lavoratore", "cf", "nascita", "assunzione", "corsoBase", "corsoSpecifico", "preposto", "antincendio", "primoSoccorso",
];

/** Colonne dell'elenco lavoratori con la selezione «Senza attestati» (senza «Nuovi arrivati»). */
export const COLONNE_SENZA_ATTESTATI: Colonna[] = [
  "lavoratore", "cf", "reparto", "mansione", "assunzione", "corsoBase", "corsoSpecifico",
];

/** In quale colonna compare ogni campo mancante. */
const COLONNA_DEL_CAMPO: Record<CampoAnagrafica, Colonna> = {
  cognome: "lavoratore", nome: "lavoratore", codice_fiscale: "cf", luogo_nascita: "nascita", data_nascita: "nascita",
  reparto: "reparto", data_assunzione: "assunzione", sottoreparto: "mansione", classe_concorso: "mansione",
  materia: "mansione", data_fine_contratto: "fineContratto", data_cessazione: "cessazione",
};

/** Colonne aggiunte da sole, in quest'ordine, se almeno un lavoratore mostrato ha quel dato mancante. */
const COLONNE_SE_MANCANTI: Colonna[] = ["nascita", "assunzione", "mansione", "fineContratto", "cessazione"];

/** Colonne da mostrare: dipendono dal modello, dalle selezioni attive e (per l'incompleta) dai dati mancanti. */
export function colonnePerVista(f: Pick<FiltriStampa, "modello" | "arrivi" | "incompleta"> & { senzaAttestati?: boolean }, righe: RigaStampa[] = []): Colonna[] {
  if (f.modello !== "lavoratori") return COLONNE_PREDEFINITE[f.modello];
  if (f.incompleta) {
    const base: Colonna[] = ["lavoratore", "cf", "reparto", "mancano"];
    const extra = COLONNE_SE_MANCANTI.filter((c) => righe.some((r) => r.mancanti.some((m) => COLONNA_DEL_CAMPO[m] === c)));
    return [...base, ...extra, ...(f.senzaAttestati ? (["corsoBase", "corsoSpecifico"] as Colonna[]) : [])];
  }
  if (f.senzaAttestati) return f.arrivi !== "no" ? COLONNE_NUOVI_ARRIVATI : COLONNE_SENZA_ATTESTATI;
  return f.arrivi !== "no" ? COLONNE_NUOVI_ARRIVATI : COLONNE_PREDEFINITE.lavoratori;
}

/** La cella è rossa «MANCA» se in quella colonna c'è almeno un campo mancante. */
export function cellaMancante(r: RigaStampa, c: Colonna): boolean {
  return r.mancanti.some((m) => COLONNA_DEL_CAMPO[m] === c);
}

/** Accende o spegne una selezione; la prima accensione porta all'elenco lavoratori, l'ultimo spegnimento torna al modello di prima. */
export function conSelezione(f: FiltriStampa, cambia: Partial<Pick<FiltriStampa, "arrivi" | "incompleta" | "senzaAttestati">>): FiltriStampa {
  const n = { ...f, ...cambia };
  const prima = f.arrivi !== "no" || f.incompleta || f.senzaAttestati;
  const dopo = n.arrivi !== "no" || n.incompleta || n.senzaAttestati;
  if (!prima && dopo) return { ...n, modelloPrima: f.modello, modello: "lavoratori" };
  if (prima && !dopo) {
    const torna = f.modello === "lavoratori" && f.modelloPrima ? f.modelloPrima : f.modello;
    return { ...n, modello: torna, modelloPrima: null };
  }
  return n;
}

/** Testo del periodo: «anno scolastico 2026/27» oppure «anno 2026». */
export function etichettaPeriodo(periodo: PeriodoArrivi, oggi = new Date()): string {
  const inizio = inizioPeriodoArrivi(periodo, oggi);
  if (!inizio) return "";
  const y = Number(inizio.slice(0, 4));
  return periodo === "scolastico" ? `anno scolastico ${y}/${String(y + 1).slice(2)}` : `anno ${y}`;
}

/** Titolo della stampa: descrive la selezione scelta. */
export function titoloStampa(f: FiltriStampa, oggi = new Date()): string {
  const base = TITOLI_MODELLO[f.modello];
  const arrivi = f.arrivi !== "no";
  if (f.modello === "lavoratori") {
    if (f.senzaAttestati) {
      return `Lavoratori senza attestati minimi (${f.senzaModo === "nessuno" ? "né base né specifico" : "manca almeno uno"})`
        + (arrivi ? ` – nuovi arrivati ${etichettaPeriodo(f.arrivi, oggi)}` : "")
        + (f.incompleta ? " – anagrafica incompleta" : "");
    }
    if (arrivi && f.incompleta) return `Nuovi arrivati con anagrafica incompleta – ${etichettaPeriodo(f.arrivi, oggi)}`;
    if (arrivi) return `Elenco nuovi arrivati – ${etichettaPeriodo(f.arrivi, oggi)}`;
    if (f.incompleta) return "Lavoratori con anagrafica incompleta";
    return base;
  }
  return base + (arrivi ? " – nuovi arrivati" : "") + (f.incompleta ? " – anagrafica incompleta" : "") + (f.senzaAttestati ? " – senza attestati minimi" : "");
}

/** Messaggio mostrato quando non ci sono righe: spiega il perché se dipende dalle selezioni. */
export function messaggioVuoto(f: Pick<FiltriStampa, "arrivi" | "incompleta"> & { senzaAttestati?: boolean; senzaModo?: ModoSenza }, inizio: string | null, senzaData: number): string | undefined {
  const arrivi = f.arrivi !== "no";
  if (f.senzaAttestati) {
    const nessuno = f.senzaModo === "nessuno";
    if (arrivi) return nessuno
      ? "Nessun nuovo arrivato è privo sia del Corso base sia del Corso specifico con i filtri scelti."
      : "Nessun nuovo arrivato ha Corso base o Corso specifico mancante con i filtri scelti.";
    return nessuno
      ? "Nessun lavoratore è privo sia del Corso base sia del Corso specifico con i filtri scelti."
      : "Tutti i lavoratori hanno Corso base e Corso specifico con i filtri scelti.";
  }
  if (arrivi && f.incompleta) return "Nessun nuovo arrivato ha l'anagrafica incompleta con i filtri scelti.";
  if (f.incompleta) return "Tutte le anagrafiche sono complete con i filtri scelti.";
  if (arrivi) {
    const base = `Nessun lavoratore con data di assunzione dal ${dataIt(inizio)}.`;
    return senzaData > 0
      ? `${base} ${senzaData} lavoratori non hanno la data di assunzione: usa «Anagrafica incompleta» per trovarli.`
      : base;
  }
  return undefined;
}

/** Primo giorno del periodo scelto (AAAA-MM-GG): 1 settembre dell'anno scolastico in corso, oppure 1 gennaio. */
export function inizioPeriodoArrivi(periodo: PeriodoArrivi, oggi = new Date()): string | null {
  if (periodo === "no") return null;
  const anno = oggi.getFullYear();
  if (periodo === "solare") return `${anno}-01-01`;
  return `${oggi.getMonth() >= 8 ? anno : anno - 1}-09-01`;
}

/**
 * Lavoratori assunti dall'inizio del periodo. Chi non ha la data di assunzione non può essere
 * collocato: viene escluso e contato in «senzaData» per avvisare l'utente.
 */
export function nuoviArrivati(
  dipendenti: Pick<Dipendente, "id" | "data_assunzione" | "stato_lavoratore">[],
  periodo: PeriodoArrivi,
  oggi = new Date(),
): { ids: Set<string> | null; inizio: string | null; senzaData: number } {
  const inizio = inizioPeriodoArrivi(periodo, oggi);
  if (!inizio) return { ids: null, inizio: null, senzaData: 0 };
  const inServizio = dipendenti.filter((d) => d.stato_lavoratore !== "cessato");
  const ids = new Set(inServizio.filter((d) => d.data_assunzione && d.data_assunzione.slice(0, 10) >= inizio).map((d) => d.id));
  return { ids, inizio, senzaData: inServizio.filter((d) => !d.data_assunzione).length };
}

/** A quale voce di formazione appartiene un corso (null = nessuna delle cinque). */
export function voceFormazione(tc: Pick<TipoCorso, "codice" | "nome_corso" | "macro_categoria">): VoceFormazione | null {
  const cod = (tc.codice ?? "").toUpperCase();
  if (cod.startsWith("SIC-GEN")) return "corsoBase";
  if (cod.startsWith("SIC-SPE")) return "corsoSpecifico";
  switch (assegnaGruppoArgomento(tc).chiave) {
    case "preposti": return "preposto";
    case "antincendio": return "antincendio";
    case "primo-soccorso": return "primoSoccorso";
    default: return null;
  }
}

/** Per ogni lavoratore, per ogni voce: «Sì – data corso» (o «Scaduto – data corso») dell'attestato approvato più recente. */
function formazionePerLavoratore(attestatiGrezzi: Attestato[], oggi: Date): Map<string, Partial<Record<VoceFormazione, string>>> {
  const attestati = applicaScadenzaPreposti(attestatiGrezzi, oggi);
  const ultimo = new Map<string, Map<VoceFormazione, Attestato>>();
  for (const a of attestati) {
    if (a.stato_validazione !== "Approvato" || !a.tipi_corso) continue;
    const v = voceFormazione(a.tipi_corso);
    if (!v) continue;
    const m = ultimo.get(a.dipendente_id) ?? new Map<VoceFormazione, Attestato>();
    const p = m.get(v);
    if (!p || a.data_corso > p.data_corso) m.set(v, a);
    ultimo.set(a.dipendente_id, m);
  }
  const out = new Map<string, Partial<Record<VoceFormazione, string>>>();
  for (const [dip, m] of ultimo) {
    const voci: Partial<Record<VoceFormazione, string>> = {};
    for (const [v, a] of m) {
      const scaduto = statoValidita(a.data_scadenza_calcolata, oggi).stato === "scaduto";
      voci[v] = `${scaduto ? "Scaduto" : "Sì"} – ${dataIt(a.data_corso)}`;
    }
    out.set(dip, voci);
  }
  return out;
}

/**
 * Lavoratori senza i minimi richiesti (Corso base, Corso specifico; conta solo l'attestato approvato).
 * Modo «almeno»: ne manca almeno uno dei due. Modo «nessuno»: mancano tutti e due.
 * Un corso scaduto conta come presente («Scaduto – data»).
 */
export function lavoratoriSenzaMinimi(dipendenti: Pick<Dipendente, "id">[], attestati: Attestato[], oggi = new Date(), modo: ModoSenza = "almeno"): Set<string> {
  const formazione = formazionePerLavoratore(attestati, oggi);
  return new Set(
    dipendenti
      .filter((d) => {
        const v = formazione.get(d.id);
        return modo === "nessuno" ? !v?.corsoBase && !v?.corsoSpecifico : !v?.corsoBase || !v?.corsoSpecifico;
      })
      .map((d) => d.id),
  );
}

/** Intersezione di due insiemi di id; null = nessun vincolo. */
export function intersezioneId(a: Set<string> | null, b: Set<string> | null): Set<string> | null {
  if (!a) return b;
  if (!b) return a;
  return new Set([...a].filter((id) => b.has(id)));
}

const GIORNO = 86_400_000;

export function statoValidita(scadenza: string | null, oggi: Date): { stato: StatoValidita; giorni: number | null } {
  if (!scadenza) return { stato: "senza_scadenza", giorni: null };
  const g = Math.floor((new Date(scadenza + "T00:00:00").getTime() - new Date(oggi.toDateString()).getTime()) / GIORNO);
  if (g < 0) return { stato: "scaduto", giorni: g };
  if (g <= 90) return { stato: "in_scadenza", giorni: g };
  return { stato: "valido", giorni: g };
}

function nellaFinestra(r: RigaStampa, f: Finestra): boolean {
  if (f === "tutti") return true;
  if (r.giorniAllaScadenza === null) return false;
  if (f === "scaduti") return r.giorniAllaScadenza < 0;
  return r.giorniAllaScadenza <= Number(f);
}

type DipMinimo = Pick<Dipendente, "reparto" | "sottoreparto" | "classe_concorso" | "materia">;

/** Mansione leggibile: profilo ATA oppure classe di concorso – materia per i docenti. */
export function mansioneDi(d: DipMinimo): string {
  if (d.sottoreparto) return d.sottoreparto;
  return [d.classe_concorso, d.materia].filter(Boolean).join(" – ");
}

function ordina(a: RigaStampa, b: RigaStampa) {
  return a.cognome.localeCompare(b.cognome, "it") || a.nome.localeCompare(b.nome, "it") || a.dataCorso.localeCompare(b.dataCorso);
}

function dipendentiConRuolo(ruoloId: string, assegnazioni: AssegnazioneRuolo[]): Set<string> {
  return new Set(assegnazioni.filter((a) => a.ruolo_id === ruoloId).map((a) => a.dipendente_id));
}

/** Converte gli attestati approvati in righe filtrate e ordinate per cognome, nome, data corso. */
export function calcolaRighe(
  attestatiGrezzi: Attestato[],
  filtri: FiltriStampa,
  oggi = new Date(),
  assegnazioni: AssegnazioneRuolo[] = [],
  soloDipendenti: Set<string> | null = null,
): RigaStampa[] {
  // Solo attestati approvati; i Preposti hanno data e stato dal motore dei cicli (regime transitorio).
  const attestati = applicaScadenzaPreposti(
    attestatiGrezzi.filter((a) => a.stato_validazione === "Approvato"),
    oggi,
  );
  let righe = attestati
    .filter((a) => a.stato_validazione === "Approvato" && a.dipendenti)
    .filter((a) => filtri.includiCessati || a.dipendenti!.stato_lavoratore !== "cessato")
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
      };
    });

  if (soloDipendenti) righe = righe.filter((r) => soloDipendenti.has(r.dipendenteId));
  if (filtri.incompleta) righe = righe.filter((r) => r.mancanti.length > 0);
  if (filtri.gruppo !== TUTTI) righe = righe.filter((r) => r.gruppo === filtri.gruppo);
  if (filtri.reparto !== TUTTI) righe = righe.filter((r) => r.reparto === filtri.reparto);
  if (filtri.categoria !== TUTTI) righe = righe.filter((r) => r.sottoreparto === filtri.categoria);
  if (filtri.materia !== TUTTI) righe = righe.filter((r) => r.materia === filtri.materia);
  if (filtri.dipendenteId !== TUTTI) righe = righe.filter((r) => r.dipendenteId === filtri.dipendenteId);
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
  let elenco = dipendenti.filter((d) => filtri.includiCessati || d.stato_lavoratore !== "cessato");
  if (soloDipendenti) elenco = elenco.filter((d) => soloDipendenti.has(d.id));
  if (filtri.incompleta) elenco = elenco.filter((d) => campiMancanti(d).length > 0);
  if (filtri.reparto !== TUTTI) elenco = elenco.filter((d) => d.reparto === filtri.reparto);
  if (filtri.categoria !== TUTTI) elenco = elenco.filter((d) => d.sottoreparto === filtri.categoria);
  if (filtri.materia !== TUTTI) elenco = elenco.filter((d) => d.materia === filtri.materia);
  if (filtri.dipendenteId !== TUTTI) elenco = elenco.filter((d) => d.id === filtri.dipendenteId);
  if (filtri.ruoloId !== TUTTI) {
    const con = dipendentiConRuolo(filtri.ruoloId, assegnazioni);
    elenco = elenco.filter((d) => con.has(d.id));
  }

  const nomeRuolo = new Map(ruoli.filter((r) => r.attivo).map((r) => [r.id, r.nome]));
  const ruoliPer = new Map<string, string[]>();
  for (const a of assegnazioni) {
    const n = nomeRuolo.get(a.ruolo_id);
    if (!n) continue;
    ruoliPer.set(a.dipendente_id, [...(ruoliPer.get(a.dipendente_id) ?? []), n]);
  }

  const formazione = formazionePerLavoratore(attestati, oggi);

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
      mansione: mansioneDi(d),
      ruoli: (ruoliPer.get(d.id) ?? []).sort((a, b) => a.localeCompare(b, "it")).join(", "),
      assunzione: d.data_assunzione ?? null,
      luogoNascita: d.luogo_nascita ?? "",
      dataNascita: d.data_nascita ?? null,
      formazione: formazione.get(d.id) ?? {},
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
      stato: "senza_scadenza",
      giorniAllaScadenza: null,
    }))
    .sort(ordina);
}

/** Raggruppa le righe per una chiave mantenendo l'ordine. */
export function raggruppa<T>(righe: T[], chiave: (r: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const r of righe) {
    const k = chiave(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return [...m.entries()];
}

export function dataIt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const ETICHETTA_STATO: Record<StatoValidita, string> = {
  valido: "Valido",
  in_scadenza: "In scadenza",
  scaduto: "Scaduto",
  senza_scadenza: "Senza scadenza",
};

export const TITOLI_MODELLO: Record<Modello, string> = {
  registro: "Registro integrale della formazione",
  gruppo: "Elenco incaricati per gruppo",
  scadenze: "Scadenzario corsi",
  scheda: "Scheda formativa individuale",
  reparto: "Report formazione per reparto",
  lavoratori: "Elenco lavoratori in servizio",
};

export const INTESTAZIONI: Record<Colonna, string> = {
  lavoratore: "Lavoratore", cf: "Codice fiscale", reparto: "Reparto", mansione: "Mansione / Materia",
  ruoli: "Ruoli sicurezza", assunzione: "Data assunzione", nascita: "Luogo e data di nascita",
  corsoBase: "Corso base", corsoSpecifico: "Corso specifico", preposto: "Preposto", antincendio: "Antincendio",
  primoSoccorso: "Primo soccorso", mancano: "Cosa manca",
  fineContratto: "Fine contratto", cessazione: "Data cessazione", corso: "Corso", ore: "Ore",
  numero: "N. attestato", data: "Data corso", scadenza: "Scadenza", stato: "Stato",
};

/** Testo della cella: usato sia dall'anteprima sia dalle esportazioni (stesso contenuto). */
export function cella(r: RigaStampa, c: Colonna): string {
  if (r.mancanti.length && cellaMancante(r, c)) return cellaConMancanti(r, c);
  switch (c) {
    case "mancano": return testoMancanti(r);
    case "fineContratto": return dataIt(r.fineContratto);
    case "cessazione": return dataIt(r.cessazione);
    case "lavoratore": return `${r.cognome} ${r.nome}`;
    case "cf": return r.cf;
    case "reparto": return r.reparto;
    case "mansione": return r.mansione || "—";
    case "ruoli": return r.ruoli || "—";
    case "assunzione": return dataIt(r.assunzione);
    case "nascita": return [r.luogoNascita, r.dataNascita ? dataIt(r.dataNascita) : ""].filter(Boolean).join(", ") || "—";
    case "corsoBase":
    case "corsoSpecifico":
    case "preposto":
    case "antincendio":
    case "primoSoccorso": return r.formazione[c] ?? "No";
    case "corso": return r.codice ? `${r.codice} – ${r.corso}` : r.corso;
    case "ore": return r.ore != null ? String(r.ore) : "—";
    case "numero": return r.numero || "—";
    case "data": return dataIt(r.dataCorso);
    case "scadenza": return dataIt(r.scadenza);
    case "stato": return ETICHETTA_STATO[r.stato];
  }
}

/** Testo della cella quando in quella colonna manca qualcosa (es. «MANCA data di nascita»). */
function cellaConMancanti(r: RigaStampa, c: Colonna): string {
  const manca = (campo: CampoAnagrafica) => r.mancanti.includes(campo);
  switch (c) {
    case "lavoratore": return `${manca("cognome") ? "MANCA cognome" : r.cognome} ${manca("nome") ? "MANCA nome" : r.nome}`;
    case "nascita":
      return [
        manca("luogo_nascita") ? "MANCA luogo" : r.luogoNascita,
        manca("data_nascita") ? "MANCA data" : dataIt(r.dataNascita),
      ].join(", ");
    case "mansione":
      return [r.mansione, ...(["sottoreparto", "classe_concorso", "materia"] as const).filter(manca).map((m) => `MANCA ${ETICHETTA_CAMPO[m]}`)]
        .filter(Boolean).join(" · ");
    default: return "MANCA";
  }
}

/** Elenco a parole dei dati mancanti: «Data di nascita, Materia». */
export function testoMancanti(r: RigaStampa): string {
  const t = r.mancanti.map((m) => ETICHETTA_CAMPO[m]).join(", ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
}

/* ------------------------------------------------------------------------------------------------
 * Ordinamento per colonna e «Univoco»
 * ---------------------------------------------------------------------------------------------- */

export type DirezioneOrdine = "asc" | "desc";
export type OrdineColonna = { colonna: Colonna; direzione: DirezioneOrdine };

const CONFRONTO = new Intl.Collator("it", { numeric: true, sensitivity: "base" });
const PESO_STATO: Record<StatoValidita, number> = { scaduto: 0, in_scadenza: 1, valido: 2, senza_scadenza: 3 };

/** Valore con cui si ordina una colonna; null = dato assente (finisce sempre in fondo). */
function chiaveOrdine(r: RigaStampa, c: Colonna): string | number | null {
  switch (c) {
    case "lavoratore": return `${r.cognome} ${r.nome}`.trim() || null;
    case "scadenza": return r.scadenza;
    case "data": return r.dataCorso || null;
    case "assunzione": return r.assunzione;
    case "fineContratto": return r.fineContratto;
    case "cessazione": return r.cessazione;
    case "nascita": return r.dataNascita;
    case "ore": return r.ore;
    case "stato": return PESO_STATO[r.stato];
    case "mancano": return r.mancanti.length ? testoMancanti(r) : null;
    default: {
      const t = cella(r, c);
      return t && t !== "—" ? t : null;
    }
  }
}

function confrontaChiavi(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return CONFRONTO.compare(String(a), String(b));
}

/** Copia ordinata per la colonna scelta (stabile; i dati assenti restano in fondo in entrambe le direzioni). */
export function ordinaRighe(righe: RigaStampa[], ordine: OrdineColonna | null): RigaStampa[] {
  if (!ordine) return righe;
  const segno = ordine.direzione === "asc" ? 1 : -1;
  return righe
    .map((r, i) => ({ r, i, k: chiaveOrdine(r, ordine.colonna) }))
    .sort((x, y) => {
      if (x.k === null && y.k === null) return x.i - y.i;
      if (x.k === null) return 1;
      if (y.k === null) return -1;
      return segno * confrontaChiavi(x.k, y.k) || x.i - y.i;
    })
    .map((x) => x.r);
}

/** Giro dell'ordinamento a ogni clic sulla stessa intestazione: A→Z, poi Z→A, poi nessuno. */
export function prossimoOrdine(attuale: OrdineColonna | null, colonna: Colonna): OrdineColonna | null {
  if (!attuale || attuale.colonna !== colonna) return { colonna, direzione: "asc" };
  return attuale.direzione === "asc" ? { colonna, direzione: "desc" } : null;
}

/** Una sola riga per lavoratore: quella con la scadenza più urgente (la più vecchia; senza scadenza per ultima). */
export function unicoPerLavoratore(righe: RigaStampa[]): RigaStampa[] {
  const migliori = new Map<string, RigaStampa>();
  for (const r of righe) {
    const gia = migliori.get(r.dipendenteId);
    if (!gia) { migliori.set(r.dipendenteId, r); continue; }
    const nuova = r.scadenza ?? "9999-99-99";
    const vecchia = gia.scadenza ?? "9999-99-99";
    if (nuova < vecchia) migliori.set(r.dipendenteId, r);
  }
  // Mantiene l'ordine originale delle righe scelte.
  const scelte = new Set(migliori.values());
  return righe.filter((r) => scelte.has(r));
}

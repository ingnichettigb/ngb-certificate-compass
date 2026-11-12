/*
 * File:      stampa-tipi.ts
 * Percorso:  src/features/stampe/stampa-tipi.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: tipi, filtri iniziali e colonne predefinite. Nessun cambio di comportamento.
 *   rev 2 — 08/11/2026 — Colonne «Luogo di nascita» e «Data di nascita» separate (luogoNascita, dataNascita); RigaStampa.ruoliElenco
 *            (ruoli come elenco, per la stampa raggruppata per funzione).
 *   rev 3 — 08/11/2026 — Stato «manca» (il lavoratore non ha il corso); filtri soloCorso e conMancanti per le scadenze di Corso base / specifico.
 *   rev 4 — 09/11/2026 17:30 — Nuova colonna «inSquadra» (Sì / No / —) per le tabelle degli abilitati e per attestato; RigaStampa.inSquadra.
 *   rev 5 — 09/11/2026 20:00 — Organigramma squadre: colonne «squadra», «corsoBaseSquadra», «aggiornamentoSquadra» e relativi campi di RigaStampa.
 *   rev 6 — 11/11/2026 20:05 — Tipo FiltroStatoLavoratore ("in_forza" | "solo_cessati" | "tutti"), helper includeLavoratorePerStato e campo statoLavoratori in FiltriStampa.
 *   rev 7 — 12/11/2026 06:53 — Compatibilità dei vecchi preset «Includi cessati» con il selettore nuovo.
 */
import type { CampoAnagrafica } from "@/features/dipendenti/anagrafica-completa";

export type Modello = "registro" | "gruppo" | "scadenze" | "scheda" | "reparto" | "lavoratori";
export type Finestra = "tutti" | "scaduti" | "90" | "180" | "270" | "365";
export type StatoValidita = "valido" | "in_scadenza" | "scaduto" | "senza_scadenza" | "manca";

/** Filtro sullo stato contrattuale del lavoratore: in servizio, solo cessati o entrambi. */
export type FiltroStatoLavoratore = "in_forza" | "solo_cessati" | "tutti";

/**
 * Stabilisce se un lavoratore deve essere incluso in base allo stato impostato nei filtri.
 * Mantiene la piena compatibilità all'indietro con la proprietà booleana includiCessati.
 */
export function includeLavoratorePerStato(
  stato: string | null | undefined,
  filtri: Pick<FiltriStampa, "statoLavoratori" | "includiCessati">,
): boolean {
  const modo: FiltroStatoLavoratore = filtri.statoLavoratori === "solo_cessati"
    ? "solo_cessati"
    : filtri.includiCessati ? "tutti" : filtri.statoLavoratori ?? "in_forza";
  if (modo === "solo_cessati") {
    return stato === "cessato";
  }
  if (modo === "tutti") {
    return true;
  }
  return stato !== "cessato";
}

/** Corsi che si possono isolare per codice (SIC-GEN = Corso base generale, SIC-SPE = Corso specifico). */
export type SoloCorso = "corsoBase" | "corsoSpecifico";

/** Voci di formazione mostrate come Sì/No nell'elenco lavoratori. */
export type VoceFormazione = "corsoBase" | "corsoSpecifico" | "preposto" | "antincendio" | "primoSoccorso" | "defibrillatore";

/** Voci legate a un ruolo di sicurezza (le altre due, Corso base e specifico, valgono per tutti). */
export type VoceRuolo = "preposto" | "antincendio" | "primoSoccorso" | "defibrillatore";
export const VOCI_CON_RUOLO: readonly VoceRuolo[] = ["preposto", "antincendio", "primoSoccorso", "defibrillatore"];

export type Colonna =
  | "lavoratore" | "cf" | "reparto" | "mansione" | "ruoli" | "assunzione" | "nascita" | "luogoNascita" | "dataNascita"
  | "mancano" | "fineContratto" | "cessazione"
  | VoceFormazione
  | "corso" | "ore" | "numero" | "data" | "scadenza" | "stato"
  | "categoria" | "argomento" | "giorni" | "inSquadra"
  | "squadra" | "corsoBaseSquadra" | "aggiornamentoSquadra";

/** Esito del Corso base o dell'Aggiornamento di un lavoratore in una squadra (Organigramma). */
export type EsitoSquadra = "valido" | "in_scadenza" | "scaduto" | "fuori_termine" | "da_formare" | "non_necessario";
export type CellaSquadra = { data: string | null; etichetta: EsitoSquadra };

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
  classe: string; // classe di concorso docente o TUTTI
  dipendenteId: string; // id o TUTTI
  finestra: Finestra;
  statoLavoratori: FiltroStatoLavoratore;
  includiCessati: boolean; // conservato per retrocompatibilità test e preset
  soloUltimo: boolean; // solo l'attestato più recente per lavoratore+corso
  mostraFirme: boolean;
  arrivi: PeriodoArrivi; // selezione «Nuovi arrivati dell'anno»
  soloIncarichi: boolean; // con un gruppo corsi: tiene solo chi ha oggi il ruolo collegato assegnato
  soloCorso: SoloCorso | null; // solo gli attestati del Corso base o del Corso specifico
  conMancanti: boolean; // aggiunge i lavoratori a cui il corso manca (stato «Manca»)
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
  classe: TUTTI,
  dipendenteId: TUTTI,
  finestra: "tutti",
  statoLavoratori: "in_forza",
  includiCessati: false,
  soloIncarichi: false,
  soloCorso: null,
  conMancanti: false,
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
  /** Classe di concorso (solo Docenti); serve al filtro «Classe di concorso». */
  classe?: string;
  mansione: string;
  ruoli: string;
  /** Gli stessi ruoli di «ruoli» come elenco ordinato (solo elenco lavoratori). */
  ruoliElenco?: string[];
  assunzione: string | null;
  luogoNascita: string;
  dataNascita: string | null;
  /** Testo già pronto per le voci fatte; le voci assenti valgono «No» (o «NA» se il ruolo non è assegnato). */
  formazione: Partial<Record<VoceFormazione, string>>;
  /** Voci per cui il lavoratore ha il ruolo di sicurezza assegnato (solo elenco lavoratori). */
  ruoliVoci?: VoceRuolo[];
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
  /**
   * true = il dipendente ha attualmente assegnato il ruolo/incarico di squadra per questo corso;
   * false = dipendente abilitato ma non inserito nella squadra;
   * null = corso senza specifica squadra operativa (es. Privacy o Formazione generale).
   */
  inSquadra?: boolean | null;
  /** Solo Organigramma: la squadra di questa riga (una riga per lavoratore e per squadra) e le due celle di formazione. */
  squadra?: string;
  cellaBase?: CellaSquadra;
  cellaAggiornamento?: CellaSquadra;
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
  "lavoratore", "cf", "nascita", "assunzione", "corsoBase", "corsoSpecifico", "preposto", "antincendio", "primoSoccorso", "defibrillatore",
];

/** Colonne dell'elenco lavoratori con la selezione «Senza attestati» (senza «Nuovi arrivati»). */
export const COLONNE_SENZA_ATTESTATI: Colonna[] = [
  "lavoratore", "cf", "reparto", "mansione", "assunzione", "corsoBase", "corsoSpecifico",
];

/*
 * File:      stampe-predefinite.ts
 * Percorso:  src/features/stampe/stampe-predefinite.ts
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Le 7 stampe predefinite più usate, raggruppate per famiglia (Scadenze, Anagrafica e ruoli).
 *   rev 2 — 08/11/2026 — Raggruppamento per reparto e destinatari (Tutti / Solo docenti / Solo ATA) per le scadenze.
 *   rev 3 — 08/11/2026 — Nuove carte Scadenze Corso base (SIC-GEN) e Corso specifico (SIC-SPE), con i lavoratori senza corso come «Manca».
 *   rev 4 — 09/11/2026 17:10 — Nuova famiglia «Completati» con 6 carte di formazione completata e abilitazioni (Corso base, Corso specifico, Antincendio, Primo Soccorso, Defibrillatore DAE, Privacy).
 *   rev 5 — 09/11/2026 17:30 — Inserita la colonna «inSquadra» (Sì / No) nelle tabelle degli abilitati Antincendio, Primo Soccorso e Defibrillatore.
 *   rev 6 — 09/11/2026 20:00 — Nuova carta «Organigramma squadre di sicurezza»; famiglia «Anagrafica» (come la pagina dell'elenco, che prima
 *            risultava vuota); raggruppaPer allineato a RaggruppaPer («funzione»); campi facoltativi organigramma e messaggioVuoto.
 *   rev 7 — 10/11/2026 18:00 — Riordino della famiglia «Anagrafica»: «Organigramma squadre di sicurezza» passa in testa (carta 02, dopo la
 *            tavola A3 che è la carta 01); seguono Registro anagrafico (03), Elenco per settore (04), Stampa per funzioni e squadre (05).
 *   rev 8 — 11/11/2026 17:30 — Nuova carta «Registro lavoratori cessati» (04, subito dopo il Registro anagrafico): solo cessati con data di cessazione.
 *            Le carte successive scalano di uno (Elenco per settore 05, Stampa per funzioni 06, Scadenze dalla 07, Completati dalla 14).
 */
import type { Colonna, FiltriStampa } from "./stampa-tipi";
import { FILTRI_INIZIALI, TUTTI } from "./stampa-tipi";
import type { RaggruppaPer } from "./stampa-gruppi";

export type FamigliaPredefinita = "Anagrafica" | "Scadenze" | "Completati";
/** Nome usato in precedenza. */
export type FamigliaStampa = FamigliaPredefinita;

export type StampaPredefinita = {
  id: string;
  famiglia: FamigliaPredefinita;
  titolo: string;
  descrizione: string;
  contiene: string;
  filtri: FiltriStampa;
  colonne: Colonna[];
  raggruppaPer?: RaggruppaPer;
  destinatari?: boolean;
  /** Organigramma: una riga per lavoratore e per squadra di sicurezza (non dipende dagli attestati filtrati). */
  organigramma?: boolean;
  /** Spiegazione mostrata quando la tabella è vuota. */
  messaggioVuoto?: string;
  filtriApplicati: string[];
};

const scaduteOEntro12Mesi = "Scaduti e in scadenza nei prossimi 12 mesi";
const MANCA = "Con lavoratori a cui il corso manca (evidenziati in rosso)";
const CONTIENE_SCADENZE = "Scadenza, stato, lavoratore, codice fiscale, reparto, corso, data ultimo corso svolto.";
const CONTIENE_COMPLETATI = "Lavoratore, codice fiscale, reparto, presenza in squadra, corso svolto, ore, data, scadenza e stato.";

const scadenzeBase: FiltriStampa = {
  ...FILTRI_INIZIALI,
  modello: "scadenze",
  finestra: "365",
  soloIncarichi: false,
};

const completati: FiltriStampa = {
  ...FILTRI_INIZIALI,
  modello: "gruppo",
  finestra: "tutti",
  soloIncarichi: false,
};

export const STAMPE_PREDEFINITE: StampaPredefinita[] = [
  {
    id: "scadenze-tutte",
    famiglia: "Scadenze",
    titolo: "Tutte le scadenze dell'anno",
    descrizione: "Tutti i corsi scaduti e da rinnovare entro i prossimi 12 mesi, per l'intero istituto.",
    contiene: CONTIENE_SCADENZE,
    filtri: scadenzeBase,
    colonne: ["scadenza", "stato", "lavoratore", "cf", "reparto", "corso", "data"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi],
  },
  {
    id: "scadenze-corso-base",
    famiglia: "Scadenze",
    titolo: "Scadenze – formazione generale (Corso base)",
    descrizione: `I corsi base di formazione generale (4 ore): chi non l'ha mai fatto compare come «Manca».${NOTA_MANCA(true)}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenzeBase, soloCorso: "corsoBase", conMancanti: true },
    colonne: ["scadenza", "stato", "lavoratore", "cf", "reparto", "corso", "data"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo corso base generale (SIC-GEN)", MANCA],
  },
  {
    id: "scadenze-corso-specifico",
    famiglia: "Scadenze",
    titolo: "Scadenze – formazione specifica",
    descrizione: `I corsi di formazione specifica: chi non ha mai completato la specifica compare come «Manca».${NOTA_MANCA(true)}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenzeBase, soloCorso: "corsoSpecifico", conMancanti: true },
    colonne: ["scadenza", "stato", "lavoratore", "cf", "reparto", "corso", "data"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo corso specifico (SIC-SPE / SIC-SPI)", MANCA],
  },
  {
    id: "scadenze-preposti",
    famiglia: "Scadenze",
    titolo: "Scadenze – preposti",
    descrizione: `Le scadenze dei soli preposti con l'incarico oggi assegnato: scaduti e in scadenza entro 12 mesi.${NOTA_MANCA(false)}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenzeBase, gruppo: "preposti", soloIncarichi: true, conMancanti: true },
    colonne: ["scadenza", "stato", "lavoratore", "cf", "reparto", "corso", "data"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo preposti con incarico assegnato", MANCA],
  },
  {
    id: "scadenze-antincendio",
    famiglia: "Scadenze",
    titolo: "Scadenze – antincendio",
    descrizione: `Le scadenze degli addetti antincendio con l'incarico oggi assegnato: scaduti e in scadenza entro 12 mesi.${NOTA_MANCA(false)}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenzeBase, gruppo: "antincendio", soloIncarichi: true, conMancanti: true },
    colonne: ["scadenza", "stato", "lavoratore", "cf", "reparto", "corso", "data"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo addetti antincendio con incarico assegnato", MANCA],
  },
  {
    id: "scadenze-primo-soccorso",
    famiglia: "Scadenze",
    titolo: "Scadenze – primo soccorso",
    descrizione: `Le scadenze degli addetti al primo soccorso con l'incarico oggi assegnato: scaduti e in scadenza entro 12 mesi.${NOTA_MANCA(false)}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenzeBase, gruppo: "primo-soccorso", soloIncarichi: true, conMancanti: true },
    colonne: ["scadenza", "stato", "lavoratore", "cf", "reparto", "corso", "data"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo addetti primo soccorso con incarico assegnato", MANCA],
  },
  {
    id: "scadenze-privacy",
    famiglia: "Scadenze",
    titolo: "Scadenze – privacy",
    descrizione: "Le scadenze del gruppo privacy: corsi scaduti e in scadenza entro 12 mesi.",
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenzeBase, gruppo: "privacy" },
    colonne: ["scadenza", "stato", "lavoratore", "cf", "reparto", "corso", "data"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Gruppo Privacy"],
  },
  {
    id: "organigramma-squadre",
    famiglia: "Anagrafica",
    titolo: "Organigramma squadre di sicurezza",
    descrizione:
      "Chi fa parte delle squadre Primo soccorso, Antincendio, Defibrillatore e Privacy (incarichi assegnati in «Piano Fabbisogno Formativo e Ruoli»), con la data del Corso base e dell'Aggiornamento e il loro stato. Chi è in più squadre compare in ciascuna.",
    contiene: "Lavoratore, reparto, squadra, Corso base e Aggiornamento (data, con sotto «In scadenza», «Scaduto», «Fuori termine», «Non necessario» o «Da formare»).",
    filtri: { ...FILTRI_INIZIALI, modello: "lavoratori" },
    colonne: ["lavoratore", "reparto", "squadra", "corsoBaseSquadra", "aggiornamentoSquadra"],
    destinatari: true,
    raggruppaPer: "funzione",
    organigramma: true,
    messaggioVuoto:
      "Nessun lavoratore ha un incarico nelle squadre di sicurezza. Assegna i ruoli in «Piano Fabbisogno Formativo e Ruoli» (Dipendenti).",
    filtriApplicati: [
      "Solo componenti delle squadre (incarico assegnato)",
      "Raggruppato per squadra (con salto pagina)",
      "Aggiornamento in tempo se fatto entro il 31/12 dell'anno di scadenza",
    ],
  },
  {
    id: "anagrafica-tutti",
    famiglia: "Anagrafica",
    titolo: "Registro anagrafico generale",
    descrizione: "Tutti i lavoratori in forza con dati anagrafici completi (inclusi luogo e data di nascita), mansione o classe di concorso, data assunzione e ruoli assegnati.",
    contiene: "Lavoratore, codice fiscale, luogo e data di nascita, reparto, mansione/classe di concorso, data assunzione, ruoli di sicurezza ricoperti.",
    filtri: { ...FILTRI_INIZIALI, modello: "lavoratori" },
    colonne: ["lavoratore", "cf", "luogoNascita", "dataNascita", "reparto", "mansione", "assunzione", "ruoli"],
    filtriApplicati: ["Solo lavoratori in forza", "Tutti i dati anagrafici"],
  },
  {
    id: "anagrafica-cessati",
    famiglia: "Anagrafica",
    titolo: "Registro lavoratori cessati",
    descrizione: "Solo i lavoratori che non sono più in servizio (dimessi, pensionati, contratti scaduti), con dati anagrafici, data di assunzione, fine contratto e data di cessazione.",
    contiene: "Lavoratore, codice fiscale, luogo e data di nascita, reparto, mansione/classe di concorso, data assunzione, fine contratto, data di cessazione.",
    filtri: { ...FILTRI_INIZIALI, modello: "lavoratori", statoLavoratori: "solo_cessati", includiCessati: true },
    colonne: ["lavoratore", "cf", "luogoNascita", "dataNascita", "reparto", "mansione", "assunzione", "fineContratto", "cessazione"],
    filtriApplicati: ["Solo lavoratori cessati", "Tutti i dati anagrafici"],
  },
  {
    id: "anagrafica-settori",
    famiglia: "Anagrafica",
    titolo: "Elenco lavoratori per settore",
    descrizione: "I lavoratori divisi per reparto (Docenti, ATA, Studenti, ecc.): ogni reparto inizia su una nuova pagina. Ideale per la consegna ai responsabili di plesso o DSGA.",
    contiene: "Lavoratore, codice fiscale, mansione/classe di concorso, ruoli ricoperti, data assunzione.",
    filtri: { ...FILTRI_INIZIALI, modello: "lavoratori" },
    colonne: ["lavoratore", "cf", "mansione", "ruoli", "assunzione"],
    raggruppaPer: "reparto",
    filtriApplicati: ["Solo lavoratori in forza", "Raggruppato per reparto (con salto pagina)"],
  },
  {
    id: "anagrafica-gruppi",
    famiglia: "Anagrafica",
    titolo: "Stampa per funzioni e squadre di sicurezza",
    descrizione: "I lavoratori divisi per gruppo di sicurezza (preposti, antincendio, primo soccorso, defibrillatore, evacuazione, privacy…): ogni gruppo parte su una pagina nuova. Chi appartiene a più gruppi compare in ciascuno.",
    contiene: "Lavoratore, codice fiscale, reparto, mansione, ruolo ricoperto.",
    filtri: { ...FILTRI_INIZIALI, modello: "lavoratori" },
    colonne: ["lavoratore", "cf", "reparto", "mansione", "ruoli"],
    raggruppaPer: "funzione",
    filtriApplicati: ["Solo lavoratori con almeno un ruolo assegnato", "Raggruppato per funzione/squadra (con salto pagina)"],
  },
  {
    id: "completati-corso-base",
    famiglia: "Completati",
    titolo: "Formazione generale (Corso base)",
    descrizione: "Lavoratori che hanno completato regolarmente il Corso base di formazione generale (4 ore), con data attestato e numero.",
    contiene: "Lavoratore, codice fiscale, reparto, corso, ore, data, numero attestato, stato.",
    filtri: { ...completati, soloCorso: "corsoBase" },
    colonne: ["lavoratore", "cf", "reparto", "corso", "ore", "numero", "data", "stato"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: ["Solo attestati approvati", "Corso base generale (SIC-GEN)"],
  },
  {
    id: "completati-corso-specifico",
    famiglia: "Completati",
    titolo: "Formazione specifica (Rischio medio/alto)",
    descrizione: "Lavoratori con formazione specifica completata, con data corso, ore svolte, scadenza quinquennale e stato di validità.",
    contiene: CONTIENE_COMPLETATI,
    filtri: { ...completati, soloCorso: "corsoSpecifico" },
    colonne: ["lavoratore", "cf", "reparto", "corso", "ore", "data", "scadenza", "stato"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: ["Solo attestati approvati", "Formazione specifica (SIC-SPE / SIC-SPI)"],
  },
  {
    id: "completati-antincendio",
    famiglia: "Completati",
    titolo: "Addetti Antincendio abilitati",
    descrizione: "Lavoratori con formazione antincendio completata e in corso di validità (base o aggiornamento), con data, ore, presenza in squadra e scadenza.",
    contiene: CONTIENE_COMPLETATI,
    filtri: { ...completati, gruppo: "antincendio" },
    colonne: ["lavoratore", "cf", "reparto", "inSquadra", "corso", "ore", "data", "scadenza", "stato"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: ["Solo attestati approvati", "Gruppo Antincendio"],
  },
  {
    id: "completati-primo-soccorso",
    famiglia: "Completati",
    titolo: "Addetti Primo Soccorso abilitati",
    descrizione: "Lavoratori con attestato di primo soccorso in corso di validità (Gruppo A o B/C, base o aggiornamento), con ore, presenza in squadra e scadenza triennale.",
    contiene: CONTIENE_COMPLETATI,
    filtri: { ...completati, gruppo: "primo-soccorso" },
    colonne: ["lavoratore", "cf", "reparto", "inSquadra", "corso", "ore", "data", "scadenza", "stato"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: ["Solo attestati approvati", "Gruppo Primo Soccorso"],
  },
  {
    id: "completati-defibrillatore",
    famiglia: "Completati",
    titolo: "Abilitati Defibrillatore (DAE / BLSD)",
    descrizione: "Lavoratori abilitati all'uso del defibrillatore semiautomatico esterno (BLSD/DAE), con data rilascio/retraining, presenza in squadra e scadenza biennale.",
    contiene: CONTIENE_COMPLETATI,
    filtri: { ...completati, gruppo: "defibrillatore" },
    colonne: ["lavoratore", "cf", "reparto", "inSquadra", "corso", "ore", "data", "scadenza", "stato"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: ["Solo attestati approvati", "Gruppo Defibrillatore (BLSD/DAE)"],
  },
  {
    id: "completati-privacy",
    famiglia: "Completati",
    titolo: "Formazione Privacy completata",
    descrizione: "Lavoratori che hanno svolto regolarmente la formazione Privacy / GDPR, con data attestato, ore e stato di validità.",
    contiene: CONTIENE_COMPLETATI,
    filtri: { ...completati, gruppo: "privacy" },
    colonne: ["lavoratore", "cf", "reparto", "corso", "ore", "data", "scadenza", "stato"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: ["Solo attestati approvati", "Gruppo Privacy"],
  },
];

function NOTA_MANCA(tutti: boolean) {
  return tutti
    ? " Chi non ha l'attestato viene inserito con stato «Manca» (in rosso), così da avere il quadro di chi deve ancora iniziare."
    : " Chi ha l'incarico ma non ha ancora svolto il corso viene inserito con stato «Manca» (in rosso).";
}

export function trovaPredefinita(id: string): StampaPredefinita | undefined {
  return STAMPE_PREDEFINITE.find((s) => s.id === id);
}

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
 */
import type { Colonna, FiltriStampa } from "./stampa-tipi";
import { FILTRI_INIZIALI, TUTTI } from "./stampa-tipi";

export type FamigliaStampa = "Scadenze" | "Completati" | "Anagrafica e ruoli";

export type StampaPredefinita = {
  id: string;
  famiglia: FamigliaStampa;
  titolo: string;
  descrizione: string;
  contiene: string;
  filtri: FiltriStampa;
  colonne: Colonna[];
  raggruppaPer?: "reparto" | "gruppo";
  destinatari?: boolean;
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
    id: "anagrafica-tutti",
    famiglia: "Anagrafica e ruoli",
    titolo: "Registro anagrafico generale",
    descrizione: "Tutti i lavoratori in forza con dati anagrafici completi (inclusi luogo e data di nascita), mansione o classe di concorso, data assunzione e ruoli assegnati.",
    contiene: "Lavoratore, codice fiscale, luogo e data di nascita, reparto, mansione/classe di concorso, data assunzione, ruoli di sicurezza ricoperti.",
    filtri: { ...FILTRI_INIZIALI, modello: "lavoratori" },
    colonne: ["lavoratore", "cf", "luogoNascita", "dataNascita", "reparto", "mansione", "assunzione", "ruoli"],
    filtriApplicati: ["Solo lavoratori in forza", "Tutti i dati anagrafici"],
  },
  {
    id: "anagrafica-settori",
    famiglia: "Anagrafica e ruoli",
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
    famiglia: "Anagrafica e ruoli",
    titolo: "Stampa per funzioni e squadre di sicurezza",
    descrizione: "I lavoratori divisi per gruppo di sicurezza (preposti, antincendio, primo soccorso, defibrillatore, evacuazione, privacy…): ogni gruppo parte su una pagina nuova. Chi appartiene a più gruppi compare in ciascuno.",
    contiene: "Lavoratore, codice fiscale, reparto, mansione, ruolo ricoperto.",
    filtri: { ...FILTRI_INIZIALI, modello: "lavoratori" },
    colonne: ["lavoratore", "cf", "reparto", "mansione", "ruoli"],
    raggruppaPer: "gruppo",
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

/*
 * File:      stampe-predefinite.ts
 * Percorso:  src/features/stampe/stampe-predefinite.ts
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Le 7 stampe predefinite: filtri già impostati, colonne di partenza, raggruppamento e spiegazione per le carte.
 *   rev 3 — 08/11/2026 — Tre nuove scadenze (Corso base generale, Corso specifico, Privacy); tutte le carte di scadenza hanno la scelta
 *            Tutti / Solo docenti / Solo ATA (destinatari), con Docenti e ATA su pagine separate; chi non ha il corso compare con «Manca».
 *   rev 2 — 08/11/2026 14:40 — Aggiornata la stampa per-funzioni in «Stampa per gruppi di sicurezza» con supporto a Privacy e macro-gruppi.
 *   rev 4 — 09/11/2026 17:10 — Nuova famiglia «Completati» con 6 carte di formazione completata e abilitazioni (Corso base, Corso specifico, Antincendio, Primo Soccorso, Defibrillatore DAE, Privacy).
 */
import { COLONNE_PREDEFINITE, FILTRI_INIZIALI, type Colonna, type FiltriStampa } from "./stampa-tipi";
import type { RaggruppaPer } from "./stampa-gruppi";

export type FamigliaPredefinita = "Anagrafica" | "Scadenze" | "Completati";

export type StampaPredefinita = {
  id: string;
  famiglia: FamigliaPredefinita;
  titolo: string;
  /** Spiegazione mostrata sulla carta: cosa fa questa stampa. */
  descrizione: string;
  /** Cosa compare nelle colonne di partenza (a parole, per la carta). */
  contiene: string;
  /** Filtri già applicati: nella pagina della stampa non sono modificabili. */
  filtri: FiltriStampa;
  /** Colonne di partenza (l'utente può toglierne, aggiungerne e ridimensionarle in anteprima). */
  colonne: Colonna[];
  /** Mostra la scelta Tutti / Solo docenti / Solo ATA sopra l'anteprima (carte di scadenza). */
  destinatari?: boolean;
  /** Raggruppamento con salto pagina (elenco lavoratori e carte di scadenza per reparto). */
  raggruppaPer?: RaggruppaPer;
  /** Filtri applicati, in parole, per il sottotitolo del foglio e la striscia sopra l'anteprima. */
  filtriApplicati: string[];
  messaggioVuoto?: string;
};

const ANAGRAFICA: Colonna[] = ["lavoratore", "cf", "luogoNascita", "dataNascita", "reparto", "mansione", "assunzione"];
const COLONNE_SCADENZE: Colonna[] = [...COLONNE_PREDEFINITE.scadenze];
const CONTIENE_ANAGRAFICA = "Cognome e nome, codice fiscale, luogo e data di nascita, reparto, mansione, data di assunzione.";
const CONTIENE_SCADENZE = "Scadenza, stato, lavoratore, codice fiscale, reparto, corso, data del corso.";
const CONTIENE_COMPLETATI = "Lavoratore, codice fiscale, reparto, corso, ore, data, scadenza, stato.";

const lavoratori: FiltriStampa = { ...FILTRI_INIZIALI, modello: "lavoratori" };
const scadenze: FiltriStampa = { ...FILTRI_INIZIALI, modello: "scadenze", finestra: "365" };
const completati: FiltriStampa = { ...FILTRI_INIZIALI, modello: "registro", soloUltimo: true, finestra: "tutti" };
const scaduteOEntro12Mesi = "Scaduti e in scadenza entro 12 mesi";
const MANCA = "Chi non ha il corso compare con «Manca»";
const NOTA_MANCA = " Chi non ha il corso compare in cima con «Manca».";

export const STAMPE_PREDEFINITE: StampaPredefinita[] = [
  {
    id: "anagrafica-tutti",
    famiglia: "Anagrafica",
    titolo: "Anagrafica di tutti i lavoratori",
    descrizione: "L'elenco completo dei lavoratori in servizio con tutti i dati anagrafici, in ordine alfabetico.",
    contiene: CONTIENE_ANAGRAFICA,
    filtri: lavoratori,
    colonne: ANAGRAFICA,
    filtriApplicati: ["Lavoratori in servizio"],
  },
  {
    id: "anagrafica-reparti",
    famiglia: "Anagrafica",
    titolo: "Anagrafica per settori",
    descrizione: "Come l'anagrafica completa, ma divisa per reparto (Docente, ATA…): ogni reparto parte su una pagina nuova.",
    contiene: CONTIENE_ANAGRAFICA,
    filtri: lavoratori,
    colonne: ANAGRAFICA,
    raggruppaPer: "reparto",
    filtriApplicati: ["Lavoratori in servizio", "Divisi per reparto"],
  },
  {
    id: "per-funzioni",
    famiglia: "Anagrafica",
    titolo: "Stampa per gruppi di sicurezza",
    descrizione:
      "I lavoratori divisi per gruppo di sicurezza (preposti, antincendio, primo soccorso, defibrillatore, evacuazione, privacy…): ogni gruppo parte su una pagina nuova. Chi appartiene a più gruppi compare in ciascuno.",
    contiene: "Cognome e nome, codice fiscale, reparto, mansione, ruoli di sicurezza.",
    filtri: lavoratori,
    colonne: ["lavoratore", "cf", "reparto", "mansione", "ruoli"],
    raggruppaPer: "funzione",
    filtriApplicati: ["Solo lavoratori con un gruppo assegnato", "Divisi per gruppo"],
    messaggioVuoto: "Nessun lavoratore appartiene a un gruppo di sicurezza.",
  },
  {
    id: "scadenze-tutte",
    famiglia: "Scadenze",
    titolo: "Scadenze – tutte",
    descrizione: "Tutti gli attestati già scaduti o che scadono nei prossimi 12 mesi, dal più urgente.",
    contiene: CONTIENE_SCADENZE,
    filtri: scadenze,
    colonne: COLONNE_SCADENZE,
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo l'attestato più recente per lavoratore e corso"],
  },
  {
    id: "scadenze-corso-base",
    famiglia: "Scadenze",
    titolo: "Scadenze – corso base (generale)",
    descrizione: `Le scadenze del Corso base di formazione generale, calcolate con il ciclo come nella pagina Scadenze: scaduti e in scadenza entro 12 mesi.${NOTA_MANCA}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenze, soloCorso: "corsoBase", conMancanti: true },
    colonne: COLONNE_SCADENZE,
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo Corso base (formazione generale)", MANCA],
  },
  {
    id: "scadenze-corso-specifico",
    famiglia: "Scadenze",
    titolo: "Scadenze – corso specifico",
    descrizione: `Le scadenze del Corso specifico (rischio basso, medio, alto), calcolate con il ciclo come nella pagina Scadenze: scaduti e in scadenza entro 12 mesi.${NOTA_MANCA}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenze, soloCorso: "corsoSpecifico", conMancanti: true },
    colonne: COLONNE_SCADENZE,
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo Corso specifico", MANCA],
  },
  {
    id: "scadenze-preposti",
    famiglia: "Scadenze",
    titolo: "Scadenze – preposti",
    descrizione: `Le scadenze dei preposti con l'incarico oggi assegnato: scaduti e in scadenza entro 12 mesi.${NOTA_MANCA}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenze, gruppo: "preposti", soloIncarichi: true, conMancanti: true },
    colonne: COLONNE_SCADENZE,
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo preposti con incarico assegnato", MANCA],
  },
  {
    id: "scadenze-antincendio",
    famiglia: "Scadenze",
    titolo: "Scadenze – antincendio",
    descrizione: `Le scadenze degli addetti antincendio con l'incarico oggi assegnato: scaduti e in scadenza entro 12 mesi.${NOTA_MANCA}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenze, gruppo: "antincendio", soloIncarichi: true, conMancanti: true },
    colonne: COLONNE_SCADENZE,
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo addetti antincendio con incarico assegnato", MANCA],
  },
  {
    id: "scadenze-primo-soccorso",
    famiglia: "Scadenze",
    titolo: "Scadenze – primo soccorso",
    descrizione: `Le scadenze degli addetti al primo soccorso con l'incarico oggi assegnato: scaduti e in scadenza entro 12 mesi.${NOTA_MANCA}`,
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenze, gruppo: "primo-soccorso", soloIncarichi: true, conMancanti: true },
    colonne: COLONNE_SCADENZE,
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo addetti primo soccorso con incarico assegnato", MANCA],
  },
  {
    id: "scadenze-privacy",
    famiglia: "Scadenze",
    titolo: "Scadenze – privacy",
    descrizione:
      "Le scadenze degli attestati Privacy, calcolate con il ciclo: scaduti e in scadenza entro 12 mesi. Se nella Matrice c'è un ruolo Privacy, restano solo i lavoratori con quel ruolo e chi non ha il corso compare con «Manca».",
    contiene: CONTIENE_SCADENZE,
    filtri: { ...scadenze, gruppo: "privacy", soloIncarichi: true, conMancanti: true },
    colonne: COLONNE_SCADENZE,
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: [scaduteOEntro12Mesi, "Solo attestati Privacy", "Con un ruolo Privacy: solo chi lo ha assegnato; chi non ha il corso compare con «Manca»"],
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
    descrizione: "Lavoratori con formazione antincendio completata e in corso di validità (base o aggiornamento), con data, ore e scadenza.",
    contiene: CONTIENE_COMPLETATI,
    filtri: { ...completati, gruppo: "antincendio" },
    colonne: ["lavoratore", "cf", "reparto", "corso", "ore", "data", "scadenza", "stato"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: ["Solo attestati approvati", "Gruppo Antincendio"],
  },
  {
    id: "completati-primo-soccorso",
    famiglia: "Completati",
    titolo: "Addetti Primo Soccorso abilitati",
    descrizione: "Lavoratori con attestato di primo soccorso in corso di validità (Gruppo A o B/C, base o aggiornamento), con ore e scadenza triennale.",
    contiene: CONTIENE_COMPLETATI,
    filtri: { ...completati, gruppo: "primo-soccorso" },
    colonne: ["lavoratore", "cf", "reparto", "corso", "ore", "data", "scadenza", "stato"],
    destinatari: true,
    raggruppaPer: "reparto",
    filtriApplicati: ["Solo attestati approvati", "Gruppo Primo Soccorso"],
  },
  {
    id: "completati-defibrillatore",
    famiglia: "Completati",
    titolo: "Abilitati Defibrillatore (DAE / BLSD)",
    descrizione: "Lavoratori abilitati all'uso del defibrillatore semiautomatico esterno (BLSD/DAE), con data rilascio/retraining e scadenza biennale.",
    contiene: CONTIENE_COMPLETATI,
    filtri: { ...completati, gruppo: "defibrillatore" },
    colonne: ["lavoratore", "cf", "reparto", "corso", "ore", "data", "scadenza", "stato"],
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

export function trovaPredefinita(id: string): StampaPredefinita | undefined {
  return STAMPE_PREDEFINITE.find((s) => s.id === id);
}

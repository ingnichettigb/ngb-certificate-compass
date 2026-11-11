/*
 * File:      suggerimenti.ts
 * Percorso:  src/features/stampe/suggerimenti.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Testi dei suggerimenti (tooltip al passaggio del mouse) di filtri, selezioni e opzioni della pagina Stampe & Report.
 *                        Un solo posto per i testi: li usano i pannelli e la guida.
 *   rev 2 — 11/11/2026 20:05 — Aggiunti suggerimenti per statoLavoratori (In forza / Solo cessati / Tutti).
 */
import type { Modello } from "./dati-stampa";

export const SUGGERIMENTI = {
  // Selezione rapida
  arrivi:
    "Lavoratori assunti nel periodo scelto (anno scolastico dal 1° settembre oppure anno solare). Chi non ha la data di assunzione non è incluso.",
  incompleta:
    "Lavoratori a cui manca almeno un dato anagrafico obbligatorio (reparto, profilo o classe di concorso, nascita, fine contratto). L'email non conta. Nella tabella compare cosa manca.",
  senzaAttestati:
    "Lavoratori a cui manca il Corso base e/o il Corso specifico, i minimi richiesti a tutti. Conta solo l'attestato approvato; un corso scaduto conta come presente.",
  // Filtri
  gruppo:
    "Cerca per ATTESTATO. Mostra chi ha fatto un corso di questo gruppo, anche anni fa e anche se oggi non ha più l'incarico.",
  ruolo:
    "Cerca per INCARICO. Mostra chi ha oggi questo ruolo assegnato nella scheda o nella Matrice abilitazioni, con o senza attestato.",
  soloIncarichi:
    "Toglie chi ha l'attestato ma non ricopre più il ruolo collegato al gruppo (per esempio gli ex preposti). Consigliata per gli elenchi operativi.",
  reparto: "Restringe l'elenco a un reparto (Docenti, ATA, …).",
  categoria: "Profilo dei lavoratori ATA (collaboratore scolastico, assistente amministrativo, …).",
  classe: "Classe di concorso dei docenti (per esempio A027). Utile per distinguere un tipo di preposti da un altro.",
  lavoratore: "Limita l'elenco a una sola persona.",
  scadenza: "Mostra i corsi già scaduti più quelli che scadono entro il periodo scelto.",
  statoLavoratori:
    "Filtra tra personale attualmente in servizio («Solo in forza»), personale cessato (dimessi, pensionati, contratti scaduti), o l'intero archivio storico («Tutti»).",
  // Opzioni
  soloUltimo: "Nasconde i vecchi attestati superati da un rinnovo successivo dello stesso corso.",
  includiCessati: "Aggiunge agli elenchi anche chi non è più in servizio (dimessi, pensionati, contratti scaduti).",
  mostraFirme: "Aggiunge in fondo alla stampa lo spazio per le firme.",
  univoco: "Mostra ogni lavoratore una sola volta, con la scadenza più urgente.",
} as const;

export const SUGGERIMENTI_MODELLO: Record<Modello, string> = {
  registro: "Tutti gli attestati conseguiti, uno per riga, in ordine di lavoratore e data. Adatto a controlli e verifiche complete.",
  gruppo: "Gli attestati raggruppati per gruppo di corsi (Preposti, Antincendio, Primo soccorso…). Non è l'elenco dei nominati: per quello usa il filtro Ruolo di sicurezza.",
  scadenze: "I corsi scaduti o in scadenza (di base entro 1 anno), da rinnovare.",
  scheda: "Una scheda per ogni lavoratore con tutto il suo percorso formativo.",
  reparto: "Riepilogo della formazione raggruppato per reparto.",
  lavoratori: "Un lavoratore per riga con Corso base, Corso specifico, Preposto, Antincendio, Primo soccorso e Defibrillatore (Sì con data / No / NA).",
};

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
 *   rev 12 — 07/11/2026 — Filtro «Materia» sostituito da «Classe di concorso»; spunta «Solo incarichi attualmente assegnati» valida per
 *                         ogni gruppo corsi che abbia un ruolo collegato (ruoliDelGruppo); RigaStampa.classe.
 *   rev 11 — 06/11/2026 — Colonne Preposto / Antincendio / Primo soccorso / Defibrillatore legate al ruolo di sicurezza assegnato:
 *                         ruolo + attestato = data, ruolo senza attestato = «No», nessun ruolo e nessun attestato = «NA»;
 *                         attestato senza ruolo = data in neretto (vedi attestatoSenzaRuolo).
 *   rev 10 — 06/11/2026 — Colonna «Mansione / Classe di concorso»: ATA = mansione (profilo), Docenti = classe di concorso (senza materia).
 *   rev 13 — 07/11/2026 — Colonne aggiungibili dal «+» dell'intestazione: nuove colonne Categoria, Argomento corso, Giorni alla scadenza;
 *                         elenco delle colonne disponibili per documento, raggruppato per funzione e in ordine alfabetico (gruppiColonne).
 *                         Nessun cambio alle colonne predefinite né ai calcoli esistenti.
 *   rev 14 — 07/11/2026 — Diviso in file per responsabilità (stampa-*.ts); questo file riesporta gli stessi nomi di prima.
 */

// La regola dei dati mancanti vive in dipendenti/anagrafica-completa.ts (condivisa con la coda «Da completare»).
export { campiMancanti, ETICHETTA_CAMPO } from "@/features/dipendenti/anagrafica-completa";
export type { CampoAnagrafica } from "@/features/dipendenti/anagrafica-completa";
export { VOCI_CON_RUOLO, TUTTI, FILTRI_INIZIALI, COLONNE_PREDEFINITE, COLONNE_NUOVI_ARRIVATI, COLONNE_SENZA_ATTESTATI } from "./stampa-tipi";
export type { Modello, Finestra, StatoValidita, VoceFormazione, VoceRuolo, Colonna, PeriodoArrivi, ModoSenza, FiltriStampa, RigaStampa } from "./stampa-tipi";
export { colonnePerVista, cellaMancante, conSelezione, etichettaPeriodo, titoloStampa, messaggioVuoto } from "./stampa-vista";
export { inizioPeriodoArrivi, nuoviArrivati, voceFormazione, voceDelRuolo, lavoratoriSenzaMinimi, intersezioneId, statoValidita, mansioneDi, ruoliDelGruppo } from "./stampa-selezioni";
export { calcolaRighe, calcolaRigheLavoratori } from "./stampa-calcolo";
export { dataIt, ETICHETTA_STATO, TITOLI_MODELLO } from "./stampa-formati";
export { raggruppa, INTESTAZIONI, cella, testoTotale, attestatoSenzaRuolo, testoMancanti } from "./stampa-testo";
export { ordinaRighe, prossimoOrdine, unicoPerLavoratore } from "./stampa-ordine";
export type { DirezioneOrdine, OrdineColonna } from "./stampa-ordine";
export { colonneDisponibili, gruppiColonne } from "./stampa-colonne";
export type { GruppoColonne } from "./stampa-colonne";

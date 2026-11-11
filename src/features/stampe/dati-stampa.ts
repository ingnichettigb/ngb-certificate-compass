/*
 * File:      dati-stampa.ts
 * Percorso:  src/features/stampe/dati-stampa.ts
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Tipi, filtri iniziali, colonne predefinite e calcolo righe di stampa.
 *   rev 14 — 07/11/2026 — Diviso in file per responsabilità (stampa-*.ts); questo file riesporta gli stessi nomi di prima.
 *   rev 15 — 09/11/2026 20:00 — Riesportati Organigramma squadre (calcolaRigheOrganigramma, LEGENDA_SQUADRE) e stile delle celle (righeCella).
 *   rev 16 — 11/11/2026 20:05 — Riesportati includeLavoratorePerStato e tipo FiltroStatoLavoratore.
 */

// La regola dei dati mancanti vive in dipendenti/anagrafica-completa.ts (condivisa con la coda «Da completare»).
export { campiMancanti, ETICHETTA_CAMPO } from "@/features/dipendenti/anagrafica-completa";
export type { CampoAnagrafica } from "@/features/dipendenti/anagrafica-completa";
export { VOCI_CON_RUOLO, TUTTI, FILTRI_INIZIALI, COLONNE_PREDEFINITE, COLONNE_NUOVI_ARRIVATI, COLONNE_SENZA_ATTESTATI, includeLavoratorePerStato } from "./stampa-tipi";
export type { CellaSquadra, EsitoSquadra, Modello, Finestra, StatoValidita, VoceFormazione, VoceRuolo, Colonna, PeriodoArrivi, ModoSenza, FiltriStampa, RigaStampa, FiltroStatoLavoratore } from "./stampa-tipi";
export { colonnePerVista, cellaMancante, conSelezione, etichettaPeriodo, titoloStampa, messaggioVuoto } from "./stampa-vista";
export { inizioPeriodoArrivi, nuoviArrivati, voceFormazione, voceDelRuolo, lavoratoriSenzaMinimi, intersezioneId, statoValidita, mansioneDi, ruoliDelGruppo } from "./stampa-selezioni";
export { calcolaRighe, calcolaRigheLavoratori } from "./stampa-calcolo";
export { dataIt, ETICHETTA_STATO, TITOLI_MODELLO } from "./stampa-formati";
export { raggruppa, INTESTAZIONI, cella, testoTotale, attestatoSenzaRuolo, testoMancanti } from "./stampa-testo";
export { ordinaRighe, prossimoOrdine, unicoPerLavoratore } from "./stampa-ordine";
export type { DirezioneOrdine, OrdineColonna } from "./stampa-ordine";
export { calcolaRigheOrganigramma } from "./stampa-organigramma";
export { LEGENDA_SQUADRE, SQUADRE, celleSquadra } from "./stampa-squadre";
export type { SquadraDefinizione } from "./stampa-squadre";
export { righeCella } from "./stampa-stile-celle";

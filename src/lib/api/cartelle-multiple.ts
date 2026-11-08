/*
 * File:          cartelle-multiple.ts
 * Percorso:      src/lib/api/cartelle-multiple.ts
 * Data creazione: 2026-10-27
 * Revisioni:
 *   - Rev 1 (2026-10-27 21:00): Creazione modulo gestione multi-cartella archivio attestati.
 *   - Rev 2 (2026-10-27 22:30): Funzioni elencoCartelle, aggiungiCartella, rimuoviCartella, rinominaCartella.
 *   - Rev 3 (2026-10-27 22:45): Cerca in tutte le cartelle con ordinamento decrescente data modifica.
 *   - Rev 4 (2026-10-28 14:15): Funzione rinominaFileNelPercorso per rinomina fisica cartella origine.
 *   - Rev 5 (2026-10-28 14:35): Ripristino ricerca ricorsiva, rimozione prefisso radice e gestione percorso vuoto come «mancante».
 *   - Rev 6 (2026-10-29 13:25): Aggiunta duplicaFileNelPercorso (copia nella stessa cartella per «Sdoppia corso cumulativo»).
 *   - Rev 7 (2026-10-30 11:10): Apertura potenziata con fallback a ricerca ricorsiva per nome file ed esportazione apriFileLocale.
 *   - Rev 8 (2026-10-30 11:35): Ripristinati getUltimaCartella, setUltimaCartella e salvaInCartellaScelta.
 *   - Rev 9 (2026-10-30 19:30): apriDaPercorsoInTutte restituisce l'esito dettagliato; apertura solo file identico; popup control.
 *   - Rev 10 (2026-10-30 20:30): Esiti con motivo per rinomina/copia (EsitoRinomina) e salvataggio locale.
 *   - Rev 11 (2026-10-30 21:00): recuperaFileDaPercorsoInTutte in sola lettura senza richiedere permessi.
 *   - Rev 12 (2026-11-01 12:20): Aggiunta gestione percorsi completi per cartelle secondarie (aggiornaPercorsoCartella).
 *   Rev 13 (2026-11-07): Diviso in file per responsabilità (cartelle-*.ts); questo file riesporta gli stessi nomi di prima.
 */

export { verificaPermessi, apriFileLocale } from "./cartella-locale";
export { elencoCartelle, aggiungiCartella, aggiornaPercorsoCartella, rimuoviCartella, rimuoviCartellaAggiuntiva, cercaInTutteLeCartelle } from "./cartelle-archivio";
export type { CartellaCollegata } from "./cartelle-archivio";
export { apriFileConControllo, apriDaPercorsoInTutte, recuperaFileDaPercorsoInTutte } from "./cartelle-apertura";
export type { MotivoApertura, EsitoApertura } from "./cartelle-apertura";
export { rinominaFileNelPercorso, duplicaFileNelPercorso } from "./cartelle-rinomina";
export type { MotivoRinomina, EsitoRinomina } from "./cartelle-rinomina";
export { risolviDocumentoAttestato } from "./cartelle-risoluzione";
export type { RisoluzioneDocumento } from "./cartelle-risoluzione";
export { getUltimaCartella, setUltimaCartella, getUltimaCartellaSalvataggio, salvaInCartellaSceltaEsito, preautorizzaCartellaScelta, salvaInCartellaScelta, salvaInCartellaSpecifica } from "./cartelle-salvataggio";
export type { EsitoSalvataggioLocale } from "./cartelle-salvataggio";

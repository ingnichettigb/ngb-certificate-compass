# Stampa globale — indice cliccabile e segnalibri (rev 12/11/2026)

Base: `main` di GitHub al commit e995a48 («Add files via upload»). Solo file della cartella `globale`.

## Cosa cambia nei PDF
1. **Indice in fondo cliccabile:** ogni nome porta alla scheda del lavoratore.
2. **«Torna all'indice»** in alto a destra su ogni pagina della scheda (anche le pagine «continua»).
3. **Segnalibri nel pannello laterale** (si apre da solo): Copertina · Organigramma A3 (solo blocco 01) · ogni lavoratore con sotto i suoi attestati (si va dritti al primo foglio del documento) · Indice e controlli.

Nessun cambio a: divisione in blocchi, nome file, ordine degli attestati, copyright e logo dell'anagrafica (restano quelli di GitHub).

## File
NUOVI
- `src/features/stampe/globale/segnalibri.ts` — link interni e albero dei segnalibri (struttura /Outlines scritta a mano, pdf-lib non ha l'API)
- `src/features/stampe/globale/segnalibri.test.ts`
- `src/features/stampe/globale/genera.test.ts` — prova di un blocco intero con file finti

MODIFICATI
- `src/features/stampe/globale/genera.ts` — raccoglie pagine e segnalibri, aggiunge link e segnalibri a fine blocco
- `src/features/stampe/globale/pagine-fisse.ts` rev 3 — «Torna all'indice», la pagina finale restituisce dove ha scritto le righe dell'indice

## Verifiche
tsc e eslint puliti sui file toccati; 22 test della cartella `globale` passati. PDF generato riletto con pypdf (segnalibri e link verso le pagine giuste) e controllato con qpdf (nessun errore).
Nota: in `tsc` restano errori su `exceljs` in `modello-excel.ts`, non toccato da questa modifica (pacchetto non installato nel mio ambiente).

## Limiti
- L'indice resta in fondo al file (non all'inizio).
- Il link «Torna all'indice» è su ogni pagina della scheda, non sui documenti allegati (sono pagine altrui, non le tocchiamo).

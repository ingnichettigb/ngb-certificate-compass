# Nomine: nomi in MAIUSCOLO, doppioni ed eliminazione dei nominati (rev 16/11/2026)

## Cosa è stato trovato
Nella pagina Nomine (es. Custodia SDS) «BARDELLI MARIA CRISTINA» (ATA) compariva due volte. Dal database risulta un solo lavoratore (BARDELLI MARIA CRISTINA).
Il secondo nome è scritto a mano nelle voci dell'organigramma come «Bardelli Mariacristina» (registro antincendio, custodia SDS, distribuzione DPI).
Il programma confronta i nomi lettera per lettera: «MARIA CRISTINA» e «MARIACRISTINA» sono diversi e non vanno fusi, quindi i due nomi restavano separati.
La causa sta nei dati, non nel confronto: il nome va corretto nelle voci (vedi `sql/correggi-nome-organigramma-bardelli.sql`).

## Cosa cambia nel codice
- `src/features/nomine/nominativi.ts` (rev 4): cognome e nome sempre in MAIUSCOLO; confronto per i doppioni che ignora solo maiuscole/minuscole e spazi in eccesso (mai unire o dividere parole).
- `src/features/nomine/components/IndiceNominati.tsx` (rev 3): cestino su ogni nominato, «Ripristina eliminati», nome scritto a mano in MAIUSCOLO, etichetta «Organigramma» sui nominati che arrivano dalle voci dell'organigramma.
- `src/features/nomine/NominaPage.tsx` (rev 3): gestione dei nominati eliminati. La cancellazione vale solo per questa pagina e per la stampa: non tocca database né organigramma. Ricaricando la pagina i nominati tornano.
- `src/features/stampe/components/PannelloVociOrganigramma.tsx` (rev 3): nelle caselle dei nominativi gli spazi e gli «a capo» non vengono più tolti mentre si scrive (prima un nome con due parole non si poteva digitare con lo spazio finale); la pulizia avviene all'uscita dalla casella. Nei ruoli i nomi sono in MAIUSCOLO.
- Test: `nomine.test.ts` (rev 2) e `nomine.miglioramenti.test.ts` (rev 2) con attese in maiuscolo; nuovo `nomine-maiuscolo-doppioni.test.ts`.

## SQL (da eseguire a mano, nell'ordine)
1. `sql/correggi-nome-organigramma-bardelli.sql` — corregge il nome nelle 3 voci.
2. `sql/maiuscolo-cognomi-nomi-lavoratori.sql` — porta in maiuscolo i lavoratori già in archivio (anteprima prima, correzione dopo).

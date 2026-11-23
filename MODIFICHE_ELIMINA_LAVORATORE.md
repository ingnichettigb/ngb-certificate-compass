# Elimina definitivamente un lavoratore (rev 23/11/2026)

## Cosa fa
Nella scheda del lavoratore, in fondo al riquadro **Contratto**, compare una **«Zona di pericolo»** (separata da una linea sottile)
con il pulsante **«Elimina definitivamente lavoratore»** (icona cestino, bordo e testo rossi tenui).
Il pulsante c'è per i lavoratori **in forza** e per i **cessati**; si nasconde solo mentre si sta modificando il contratto.

## Doppia conferma (finestra a due passi)
1. **Primo passo** — riepilogo (Nome, Cognome, Reparto, Codice fiscale) e avviso:
   - senza attestati: «Questa scheda non ha attestati registrati e verrà rimossa dal programma…»;
   - con attestati: riquadro arancione «Attenzione: questo lavoratore ha N attestati registrati…».
   Pulsanti: `Annulla` e `Elimina per sempre` (rosso). Il secondo **non cancella nulla**: porta al passo 2.
2. **Secondo passo** — «Sei sicuro di volerlo eliminare per sempre?» con il nome del lavoratore.
   Pulsanti: `No, annulla` e `Sì, elimina per sempre` (rosso, «Eliminazione...» mentre lavora).
   Solo questo secondo «sì» cancella.

## Cosa viene cancellato (tutto nel programma)
1. **Anagrafica** in `dipendenti`. Seguono per `ON DELETE CASCADE`: `dipendenti_ruoli`, `attestati_caricati`, `documenti_attestati`, `integrazioni_dvr`.
2. **Coda operatore** (`coda_valutazioni`): le righe con lo stesso codice fiscale (confronto senza badare a maiuscole/minuscole).
3. **Organigramma**: il nominativo scritto a mano nelle voci (`ditta.organigramma_voci`), nei due ordini «COGNOME NOME» / «NOME COGNOME»,
   senza badare a maiuscole e spazi in eccesso; «MARIA CRISTINA» e «MARIACRISTINA» restano due nomi diversi (stessa regola di `nominativi.ts`).

## Cosa NON viene toccato
**I file nello storage (bucket privato `attestati`) restano dove sono**: PDF di `documenti_attestati`, foto `url_foto_fronte` / `url_foto_retro`
e file della coda operatore. Il programma non chiama mai lo storage in questa operazione (c'è un test che lo verifica).

## Ordine e errori
- Prima si cancella l'anagrafica: se fallisce, appare l'errore e non si tocca altro.
- Poi coda operatore e organigramma: se una di queste pulizie fallisce, il lavoratore resta eliminato e compare un avviso
  («non sono riuscito a pulire: …»).

## Dopo l'eliminazione
Notifica «Lavoratore eliminato definitivamente», scheda deselezionata (la colonna destra torna allo stato neutro) e liste aggiornate:
`dipendenti`, `attestati`, `documenti`, `integrazioni-dvr`, `coda`, `stats`, `ditta`, `stampe-attestati`, `export-attestati`,
`ditta_anagrafica`, `lavoratori-in-forza`, `dipendenti-ruoli`.

## File (con revisione)
| File | Percorso | Revisione |
| --- | --- | --- |
| dipendenti.ts | `src/lib/api/dipendenti.ts` | rev 5 — 23/11/2026 08:55 — `eliminaDipendente`, `togliNominativoDalleVoci` |
| EliminaLavoratore.tsx | `src/features/contratti/EliminaLavoratore.tsx` | rev 1 — 23/11/2026 08:55 — nuovo: zona di pericolo e finestra a due passi |
| BloccoContratto.tsx | `src/features/contratti/BloccoContratto.tsx` | rev 2 — 23/11/2026 08:55 — zona di pericolo in fondo; prop `nAttestati`, `onEliminato` |
| SchedaDipendente.tsx | `src/features/dipendenti/components/SchedaDipendente.tsx` | rev 7 — 23/11/2026 08:55 — prop `onEliminato`, numero attestati al riquadro Contratto |
| DipendentiPage.tsx | `src/features/dipendenti/DipendentiPage.tsx` | rev 6 — 23/11/2026 08:55 — deseleziona la scheda dopo l'eliminazione |
| elimina-dipendente.test.ts | `src/lib/api/elimina-dipendente.test.ts` | rev 1 — 23/11/2026 08:55 — nuovo (10 test) |
| EliminaLavoratore.test.tsx | `src/features/contratti/EliminaLavoratore.test.tsx` | rev 1 — 23/11/2026 08:55 — nuovo (5 test) |
| dipendenti.flusso.test.tsx.snap | `src/routes/__snapshots__/dipendenti.flusso.test.tsx.snap` | solo il testo nuovo «Zona di pericolo Elimina definitivamente lavoratore» (5 punti) |

## Nota sullo snapshot
Lo snapshot del flusso Dipendenti era **già non allineato** nel deposito prima di questa modifica (testi come «8 h», «Formazione da valutare»,
pulsanti diversi). Non l'ho rigenerato per intero, per non nascondere quelle differenze: ho aggiunto a mano solo il testo del nuovo riquadro.
Il test resta rosso per i motivi che aveva già.

## Controllo
- Test nuovi: 15 passati (10 + 5); test del riquadro contratto già esistenti: passati.
- Tipi: nessun errore nei file toccati (resta un errore già presente in `aggancia-allegato/SchermoAgganciaAllegato.tsx`, non toccato).
- Eslint: nessun errore nuovo (i file originali avevano già errori di formattazione, lasciati com'erano).
- Suite completa: 1035 passati, 16 falliti. **Sono gli stessi 16 che falliscono anche sul deposito senza queste modifiche**
  (flusso Impostazioni, Documenti, Dipendenti, HR, Home, Scadenze; test Nomine in maiuscolo; preavviso di 9 mesi). Nessun fallimento nuovo.

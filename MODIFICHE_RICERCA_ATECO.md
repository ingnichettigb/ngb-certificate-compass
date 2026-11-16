# Tabelle di raccordo e scheda Ditta: ricerca, catalogo ATECO, evidenziazione

Data: 2026-11-15

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/tabelle-raccordo/definizioni.ts` | sostituisce (rev 2: tolta la colonna «Fonte» dalla 06) |
| `src/features/tabelle-raccordo/TabellaRaccordo.tsx` | sostituisce (rev 4: ricerca e evidenziazione «In uso Ditta») |
| `src/features/tabelle-raccordo/TabelleRaccordo.test.tsx` | sostituisce (rev 4) |
| `src/features/ditta/regole-ditta.ts` | sostituisce (Rev 2: divisione ATECO e rischio dal catalogo) |
| `src/features/ditta/regole-ditta.test.ts` | sostituisce (Rev 2) |
| `src/features/impostazioni/ditta/RiquadroAtecoRischio.tsx` | sostituisce (rev 2: catalogo con ricerca, rischio suggerito) |
| `src/features/impostazioni/ditta/RiquadroAtecoRischio.test.tsx` | **nuovo** |
| `src/components/__snapshots__/ImpostazioniDialog.flusso.test.tsx.snap` | sostituisce (solo 24 righe aggiunte: la lettura del catalogo `rischio_ateco`) |

Nessuna modifica a database, API o `package.json`.

## Come funziona

1. **Tabelle di raccordo:** casella «Cerca nella tabella» accanto a «Esporta». Cerca nel testo mostrato in cella; il contatore diventa «1 di 2 record».
2. **Riga nascosta:** se la ricerca nasconde la riga selezionata, Modifica, Duplica e Cancella si disattivano (non si agisce su righe che non si vedono).
3. **Esporta:** scarica sempre tutti i record, anche con la ricerca attiva.
4. **Tabella 06:** le righe la cui divisione corrisponde a un codice ATECO della Ditta sono evidenziate con «In uso Ditta» («85.31.20» evidenzia la riga «85»).
5. **Colonna «Fonte»:** non si mostra più nella 06, né nel modulo né nell'esportazione; il dato resta nel database.
6. **Scheda Ditta › Codici ATECO:** pulsante «Scegli dal catalogo» con ricerca per numero o descrizione. La scelta compila codice e descrizione; il codice entra nell'elenco solo con «Aggiungi», come prima.
7. **Rischio:** ogni codice mostra il rischio della sua divisione. Se il rischio più alto dei codici differisce dal «Grado di Rischio Aziendale», compare il suggerimento con il pulsante **Applica**: il grado non cambia mai da solo.

## Note sui test

Restano i 9 test che fallivano già prima di queste modifiche (vedi `MODIFICHE_ESPORTA_TABELLE.md`). I test nuovi passano.

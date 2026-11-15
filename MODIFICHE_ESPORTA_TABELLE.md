# Impostazioni generali › Tabelle di raccordo: bottone «Esporta» (Excel o CSV)

Data: 2026-11-15

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/components/tabella-comune/esporta-tabella.ts` | **nuovo** (crea il file Excel `.xlsx` o il CSV e lo scarica) |
| `src/components/tabella-comune/PulsanteEsporta.tsx` | **nuovo** (bottone «Esporta» con la scelta Excel / CSV) |
| `src/components/tabella-comune/esporta-tabella.test.ts` | **nuovo** |
| `src/features/tabelle-raccordo/esporta-raccordo.ts` | **nuovo** (dati di una tabella di raccordo: N, colonne, Applica) |
| `src/features/tabelle-raccordo/esporta-raccordo.test.ts` | **nuovo** |
| `src/features/tabelle-raccordo/TabellaRaccordo.tsx` | sostituisce (rev 3: bottone «Esporta» accanto a «Ripristina colonne») |
| `src/features/tabelle-raccordo/TabelleRaccordoTab.tsx` | sostituisce (rev 3: bottone «Esporta» anche nella 09 – Corsi) |
| `src/features/tabelle-raccordo/TabelleRaccordo.test.tsx` | sostituisce (rev 2: test del bottone) |
| `src/features/tipi-corso/esporta-excel.ts` | sostituisce (rev 3: formato Excel vero oltre al CSV, CSV invariato) |
| `src/features/tipi-corso/TabellaTipiCorsoDialog.tsx` | sostituisce («Esporta in Excel» diventa «Esporta» con la scelta) |
| `src/features/tipi-corso/__snapshots__/TabellaTipiCorsoDialog.flusso.test.tsx.snap` | sostituisce (solo il testo del bottone: «Esporta in Excel» → «Esporta») |

Nessuna modifica a database, API, `package.json` (usa `exceljs`, già presente) o altre pagine.

## Come funziona

1. Dalla 01 alla 08 il bottone **Esporta** sta nella barra, subito dopo «Ripristina colonne».
2. Nella 09 – Corsi sta accanto a «Tabella corsi» e anche dentro la finestra «Tabella tipi di corso».
3. Al clic si sceglie **Excel (.xlsx)** oppure **CSV (.csv)**.
4. Il file contiene la colonna **N**, le colonne nell'ordine mostrato a schermo, la colonna **Applica**, tutti i record nell'ordinamento scelto.
5. Campi vero/falso come «sì»/«no»; numeri come numeri veri; codici con lo zero iniziale (es. ATECO «01») come testo.
6. Excel: intestazione in grassetto su fondo blu, prima riga bloccata, filtro automatico, larghezze adatte, nome del foglio = «numero titolo».
7. CSV: separatore «;» e BOM, si apre correttamente in Excel italiano. Il CSV della 09 resta identico a prima.
8. Nome file: `030ArchAttestati_AAMMGGhhmm_raccordo-01-ruoli-di-sicurezza.xlsx` (la 09: `…_tipi-corso.xlsx`).

## Note sui test

Nel mio ambiente di prova (dipendenze reinstallate, senza `xlsx`) 9 test fallivano già sul commit di partenza, senza queste modifiche; con le modifiche l'elenco dei test che falliscono è identico:

- `TabellaTipiCorsoDialog.flusso.test.tsx` (2 test): lo snapshot non contiene la riga «ASPP / RSPP» tra gli argomenti. Va rigenerato con `bunx vitest run -u` dopo averne controllato il contenuto.
- altri 7 test di flusso (modello-excel, DocumentiAttestati, operatore, dipendenti, hr, index, scadenze).

I 14 test nuovi passano.

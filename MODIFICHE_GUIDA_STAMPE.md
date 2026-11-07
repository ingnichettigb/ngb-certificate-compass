# Stampe & Report: guida, suggerimenti, incarichi per ogni gruppo, classe di concorso, totale

Data: 2026-11-07

Questo zip è **completo e cumulativo**: sostituisce tutti gli zip precedenti (include «Senza attestati», «Mansione / Classe di concorso»,
colonne legate al ruolo + Defibrillatore). Se avevi applicato `materia-scheda-docenti.zip`, elimina
`src/features/dipendenti/components/SelezioneReparto.materia.test.tsx`.

## File (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/stampe/suggerimenti.ts` | **nuovo** (testi dei suggerimenti, usati da pannello e guida) |
| `src/features/stampe/guida-ricette.ts` | **nuovo** (10 ricette rapide) |
| `src/features/stampe/components/GuidaStampe.tsx` | **nuovo** (pulsante «Guida» e pannello) |
| `src/features/stampe/guida.test.tsx` | **nuovo** (test guida, totale, suggerimenti) |
| `src/features/stampe/dati-stampa.ts` | sostituisce |
| `src/features/stampe/dati-stampa.test.ts` | sostituisce |
| `src/features/stampe/StampePage.tsx` | sostituisce |
| `src/features/stampe/components/FiltriStampa.tsx` | sostituisce |
| `src/features/stampe/components/ContenutoStampa.tsx` | sostituisce |
| `src/features/stampe/components/TabellaStampa.tsx` | sostituisce |
| `src/features/dipendenti/anagrafica-completa.ts` | sostituisce |
| `src/features/da-completare/regola-coda.test.ts` | sostituisce |

Nessuna modifica a database o API.

## Cosa c'è di nuovo

1. **Pulsante «Guida» (i)** nell'intestazione: pannello con attestato vs incarico (colori azzurro/ambra), selezione, documenti, filtri,
   opzioni, come leggere le colonne (Sì / No / NA / neretto) e **ricette rapide**.
2. **Indice in cima alla guida** con link alle sezioni e a ogni ricetta (es. «Stampa solo l'elenco dei preposti con incarico assegnato»).
   Ogni ricetta spiega i passi e ha il pulsante **«Applica questi filtri»**, che imposta tutto in un clic e chiude la guida.
   Le ricette che servono un ruolo della Matrice (es. Preposto) sono spente, con spiegazione, se il ruolo non esiste.
3. **Suggerimenti (tooltip)** su pulsanti di selezione, tipi di documento, filtri e opzioni. Testi corretti rispetto alla bozza:
   «Elenco incaricati per gruppo» raggruppa gli attestati (non elenca i nominati); «Anagrafica incompleta» elenca i campi reali.
4. **Sottotitoli sotto i filtri**: «Cerca per attestato conseguito (storico)» sotto Gruppo corsi, «Cerca per incarico formale attivo» sotto Ruolo di sicurezza.
   La striscia «Filtri attivi» ora dice «Per attestato: …» e «Per incarico: …».
5. **Spunta «Solo incarichi attualmente assegnati»** sotto Gruppo corsi, valida per **ogni gruppo** che abbia un ruolo collegato nella Matrice
   (confronto tra gruppo e macro-categoria/nome del ruolo: Preposti ↔ Preposto, Antincendio, Primo soccorso, Defibrillatore, Sicurezza lavoratori…).
   Si estende da sola: creando un ruolo con macro-categoria «Privacy» la spunta funziona anche per la Privacy. Senza ruolo collegato resta spenta
   e dice come crearlo. Non vale per il gruppo «Altro».
6. **Filtro «Classe di concorso»** al posto di «Materia» (legge la classe di concorso del lavoratore).
7. **Totale in fondo al documento**, anche in stampa: «Totale: N lavoratori» nell'elenco lavoratori, «N righe · M lavoratori» negli altri.

## Attenzione

- Il filtro per incarico e le colonne Preposto/Antincendio/… sono fedeli solo se i ruoli sono spuntati bene nella Matrice abilitazioni.
- Il neretto e i colori valgono in anteprima/PDF; CSV ed Excel hanno solo il testo. Il totale è nella stampa, non nei file CSV/Excel.
- I suggerimenti compaiono al passaggio del mouse: su telefono/tablet valgono i sottotitoli grigi e la guida.

## Verifiche eseguite

- `vitest` su `src/features` e `src/routes/dipendenti`: 347 test passati. Restano rossi solo `dipendenti.flusso.test.tsx` e
  `DocumentiAttestati.flusso.test.tsx`, **già rossi sul codice originale**, non collegati.
- `tsc`: nessun errore nei file toccati (restano gli errori già presenti in `DialogAggiungiAttestatoConValidazione.tsx`, non toccato).
- `eslint`: nessun errore nuovo.
- **Non provato nel browser**: l'aspetto della guida e dei suggerimenti va guardato dopo la pubblicazione.

## Dopo il push

Pubblica dal pulsante **Publish** dell'editor Lovable.

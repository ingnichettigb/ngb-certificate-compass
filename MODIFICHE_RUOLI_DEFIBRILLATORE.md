# Stampe & Report: colonne legate al ruolo + Defibrillatore

Data: 2026-11-06

Questo zip è **completo e cumulativo**: include anche «Senza attestati» e «Mansione / Classe di concorso» già consegnati,
quindi sostituisce gli zip precedenti. (Se avevi applicato `materia-scheda-docenti.zip`, elimina
`src/features/dipendenti/components/SelezioneReparto.materia.test.tsx`.)

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/stampe/dati-stampa.ts` | sostituisce (ruoli di sicurezza per voce, colonna Defibrillatore, `attestatoSenzaRuolo`) |
| `src/features/stampe/components/TabellaStampa.tsx` | sostituisce (neretto) |
| `src/features/stampe/components/ContenutoStampa.tsx` | sostituisce (legenda) |
| `src/features/stampe/components/FiltriStampa.tsx` | sostituisce («Senza attestati») |
| `src/features/stampe/StampePage.tsx` | sostituisce («Senza attestati») |
| `src/features/stampe/dati-stampa.test.ts` | sostituisce (test nuovi e aggiornati) |
| `src/features/dipendenti/anagrafica-completa.ts` | sostituisce (ai Docenti non si chiede la materia) |
| `src/features/da-completare/regola-coda.test.ts` | sostituisce |

## Colonne Preposto, Antincendio, Primo soccorso, Defibrillatore

Nuova colonna **Defibrillatore** (corsi BLS-/BLSD) nell'elenco dei nuovi arrivati, dopo Primo soccorso.
Il ruolo si legge dalle assegnazioni dell'app (Matrice abilitazioni / scheda lavoratore), solo ruoli attivi:

| Situazione | Cella |
|---|---|
| ha il ruolo e l'attestato | «Sì – data» (o «Scaduto – data») |
| ha il ruolo, manca l'attestato | «No» |
| non ha il ruolo e non ha l'attestato | «NA» |
| ha l'attestato ma **non** il ruolo | la data, **in neretto** (anche in stampa) |

Riconoscimento dei ruoli (stesse parole già usate dalla Matrice): Defibrillatore = «defibrillatore» o «BLSD»; Preposto = «Preposto»;
Antincendio; Primo soccorso. Il ruolo «Addetto BLSD / Defibrillatore» non vale come Primo soccorso.
Corso base e Corso specifico restano Sì/No per tutti. La legenda sotto la tabella spiega NA, No e neretto.

## Attenzione

- Il risultato è fedele solo se i ruoli sono spuntati bene nella Matrice abilitazioni: un preposto senza il ruolo e senza attestato risulta «NA», non «No».
- Il **neretto vale per anteprima e PDF**. In **CSV ed Excel** il testo è lo stesso (la data) ma senza grassetto.

## Verifiche eseguite

- `vitest` su `src/features`: 326 test passati; restano rossi solo `dipendenti.flusso.test.tsx` e `DocumentiAttestati.flusso.test.tsx`,
  **già rossi sul codice originale**, non collegati.
- `tsc` ed `eslint`: nessun errore nei file toccati.
- Il vecchio test «preposto = No» senza ruolo ora attende «NA» (nuova regola).

## Dopo il push

Pubblica dal pulsante **Publish** dell'editor Lovable.

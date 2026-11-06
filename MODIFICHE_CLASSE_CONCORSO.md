# Stampe & Report: «Senza attestati» + classe di concorso al posto della materia

Data: 2026-11-06

Questo zip è **completo**: include anche il pulsante «Senza attestati» già consegnato, quindi sostituisce i due zip precedenti.

## Prima di copiare i file

Se hai già applicato lo zip `materia-scheda-docenti.zip`, **elimina** il file
`src/features/dipendenti/components/SelezioneReparto.materia.test.tsx`
(testava il campo Materia nella scheda, che qui viene tolto e rimesso come in origine).

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/dipendenti/anagrafica-completa.ts` | sostituisce (ai Docenti non si chiede più la materia, solo la classe di concorso) |
| `src/features/stampe/dati-stampa.ts` | sostituisce («Senza attestati»; colonna «Mansione / Classe di concorso») |
| `src/features/stampe/StampePage.tsx` | sostituisce («Senza attestati») |
| `src/features/stampe/components/FiltriStampa.tsx` | sostituisce (pulsante «Senza attestati») |
| `src/features/stampe/dati-stampa.test.ts` | sostituisce (test aggiornati e nuovi) |
| `src/features/da-completare/regola-coda.test.ts` | sostituisce (i test usano la classe di concorso invece della materia) |
| `src/features/dipendenti/components/SelezioneReparto.tsx` | rimesso com'era in origine (senza campo Materia) |
| `src/routes/__snapshots__/dipendenti.flusso.test.tsx.snap` | rimesso com'era in origine |

## Regole cambiate

1. **Dati mancanti dei Docenti**: conta solo la **classe di concorso**. La materia non viene più segnalata come mancante,
   né in «Anagrafica incompleta» delle Stampe né nella coda «Da completare» (regola unica condivisa).
2. **Colonna «Mansione / Classe di concorso»**: per gli **ATA** compare la mansione (profilo); per i **Docenti** la classe di concorso
   (es. «A027»), anche se hanno un profilo come SEC2. Prima compariva «classe – materia».
3. Il filtro «Materia» nel pannello Stampe resta, ma senza materie in archivio non compare.

## Pulsante «Senza attestati» (invariato rispetto allo zip precedente)

Selezione con scelta «Manca almeno uno dei due» / «Nessuno dei due» tra Corso base e Corso specifico; colonne Lavoratore, Codice fiscale,
Reparto, Mansione, Data assunzione, Corso base, Corso specifico («Sì – data» / «Scaduto – data» / «No»). Conta solo l'attestato Approvato.

## Verifiche eseguite

- `vitest` su `src/features`: tutti verdi tranne due test di flusso (`dipendenti.flusso.test.tsx`, `DocumentiAttestati.flusso.test.tsx`)
  che erano **già rossi sul codice originale**, per motivi non collegati.
- `tsc`: nessun errore nei file toccati.

## Dopo il push

Pubblica dal pulsante **Publish** dell'editor Lovable.

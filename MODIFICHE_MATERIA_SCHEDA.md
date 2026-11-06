# Scheda lavoratore: campo «Materia» visibile per i Docenti

Data: 2026-11-06

## Problema

Nella scheda del lavoratore il riquadro in alto mostrava Reparto, Profilo e Classe di concorso,
ma non la **Materia**. Il testo accanto alla classe (es. «A027 — Matematica e fisica») è la
denominazione della classe di concorso, non la materia del lavoratore. Stampe & Report
(«Anagrafica incompleta») e la coda «Da completare» controllano invece il campo `materia`
del lavoratore, giustamente, ma dalla scheda non si vedeva che era vuoto.

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/dipendenti/components/SelezioneReparto.tsx` | sostituisce (campo Materia per i Docenti) |
| `src/features/dipendenti/components/SelezioneReparto.materia.test.tsx` | nuovo (5 test) |
| `src/routes/__snapshots__/dipendenti.flusso.test.tsx.snap` | sostituisce (una sola riga: compare l'etichetta «Materia» nella scheda del docente) |

Nessuna modifica alle regole dei dati mancanti, a Stampe & Report, al database o alle API.

## Come funziona

- Solo se il reparto è **Docente**, accanto a «Classe di concorso» compare il campo **Materia**.
- Se è vuoto ha il bordo giallo (come i dati mancanti in «Modifica anagrafica»).
- Si salva uscendo dal campo o premendo Invio, con la stessa funzione già usata per la classe
  (`aggiornaInsegnamentoDipendente`): aggiorna anche l'elenco materie dei suggerimenti.
- Se il testo non cambia non salva nulla. Per gli ATA e gli altri reparti il campo non compare.

## Verifiche eseguite

- `vitest` su stampe, dipendenti e da-completare: 100 test passati.
- `tsc` ed `eslint`: nessun errore nei file toccati.
- Nota: `src/routes/dipendenti.flusso.test.tsx` **era già rosso prima** di questa modifica
  (differenze sul pulsante «Aggancia attestato» e sulle query `tipi_corso`, non collegate).
  La parte della scheda del docente ora coincide con lo snapshot.

## Dopo il push

Pubblica dal pulsante **Publish** dell'editor Lovable. Poi apri una scheda docente, compila
la Materia e riapri «Anagrafica incompleta» in Stampe & Report: quel lavoratore sparisce dall'elenco.

# Scadenze: linea temporale essenziale (AA-MM + ore) e colori dei cicli

Data: 2026-11-07

Questo zip è **completo e cumulativo**: sostituisce tutti gli zip precedenti (Stampe & Report, guida, ruoli, «Senza attestati», ecc.).
Se avevi applicato `materia-scheda-docenti.zip`, elimina `src/features/dipendenti/components/SelezioneReparto.materia.test.tsx`.

## File della modifica Scadenze (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/scadenze/components/LineaCicloFormativo.tsx` | sostituisce |
| `src/features/scadenze/calcolo-ciclo.ts` | sostituisce (nessun cambio a scadenze e ore) |
| `src/features/scadenze/types.ts` | sostituisce (nuovi campi di sola visualizzazione) |
| `src/features/scadenze/calcolo-ciclo.test.ts` | sostituisce (test nuovi e uno aggiornato) |

Gli altri file dello zip sono quelli già consegnati per Stampe & Report (vedi `MODIFICHE_GUIDA_STAMPE.md`).

## Targhette sopra la linea

Per ogni corso fatto (la partenza e ogni aggiornamento), nel punto esatto del giorno:
- riga 1: **data «AA-MM»** (anno a due cifre, es. `22-03`);
- riga 2: **ore** (`1h`, `2h`, `4h`…); `~4h` se le ore sono stimate (ore minime di legge), `ore n.d.` se non note;
- niente titolo «Corso Base» / «Agg.» e niente riga «parziale / completo»;
- **pallino** verde (partenza o ore complete), arancione (parziale), vuoto grigio (non contato);
- **stanghetta** verticale dello stesso colore, fino alla linea, sul giorno esatto (il giorno completo resta nel suggerimento al passaggio del mouse).
Livelli sfalsati più compatti per evitare sovrapposizioni.

## Colori della linea (per ciclo)

| Colore | Quando |
|---|---|
| **Verde** | ciclo coperto (ore complete) |
| **Arancione** | ciclo in corso non ancora coperto, **oppure ciclo concluso con ore parziali** (prima era rosso); diventa verde quando si completa |
| **Rosso** | ciclo concluso senza alcun aggiornamento |
| **Nero** | ciclo futuro, non attivo |
| Bordeaux | decaduto (invariato) |

L'etichetta sotto il ciclo mostra le ore fatte («Ciclo 1 · 2/4 ore») anche per i cicli conclusi con ore parziali.

## Attenzione

- Cambia solo l'aspetto del ciclo. Lo **stato della riga** (es. «Scaduto») e le scadenze non cambiano: un ciclo concluso con ore parziali può quindi essere
  arancione sulla linea mentre la riga è ancora «Scaduto».
- Il vecchio test «rosso con ore parziali» è stato aggiornato alla nuova regola.

## Verifiche eseguite

- `vitest` su `src/features` e `src/routes`: 356 test passati. Restano rossi solo 4 test di flusso (`dipendenti`, `hr`, `scadenze`, `DocumentiAttestati`),
  **già rossi sul codice originale** (controllato rilanciandoli sull'originale).
- `tsc` ed `eslint`: nessun errore nuovo nei file toccati.
- **Non provato nel browser**: guarda l'aspetto delle targhette dopo la pubblicazione.

## Dopo il push

Pubblica dal pulsante **Publish** dell'editor Lovable.

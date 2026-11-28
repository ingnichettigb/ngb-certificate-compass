# Scadenze: vista «Da formare / Mancanti»

File:      MODIFICHE_DA_FORMARE.md
Percorso:  (radice del progetto)
Revisione: 1 — 28/11/2026 10:01

## Il problema

La pagina Scadenze (`/scadenze`) nasce solo dagli attestati registrati: chi ha un incarico (es. Preposto) ma nessun corso non genera nessuna riga, quindi non compare mai, nemmeno in «Scaduti».

## Cosa fa adesso

Nel menù periodo c'è la voce nuova **«Da formare / Mancanti»** (subito dopo «Scaduti»). Elenca i lavoratori in forza che hanno un corso dovuto e **nessun attestato** nello stesso ciclo formativo.

Che cosa è «dovuto» lo decide la **matrice abilitazioni e ruoli** (Piano Fabbisogno Formativo e Ruoli): stesse funzioni di base, nessuna regola nuova sui corsi. Sono le caselle «!» della matrice.

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/scadenze/types.ts` | sostituisce (vista `VISTA_DA_FORMARE`, stato `da_formare`, dati `daFormare` della riga) |
| `src/features/scadenze/da-formare.ts` | nuovo (calcolo delle righe, testo «Da svolgere entro…», nomi dei corsi attesi) |
| `src/features/scadenze/obblighi-matrice.ts` | nuovo (obbligo, esenzione RSPP, «in attesa» con le funzioni della matrice) |
| `src/features/scadenze/hooks/useRigheDaFormare.ts` | nuovo (legge anagrafica, corsi e ditta solo a vista attiva) |
| `src/features/scadenze/hooks/useScadenze.ts` | sostituisce |
| `src/features/scadenze/filtri.ts` | sostituisce |
| `src/features/scadenze/components/FiltriScadenze.tsx` | sostituisce (voce nel menù) |
| `src/features/scadenze/components/RigaScadenza.tsx` | sostituisce |
| `src/features/scadenze/components/TabellaScadenze.tsx` | sostituisce (messaggio di elenco vuoto) |
| `src/features/scadenze/ScadenzePage.tsx` | sostituisce |
| `src/features/scadenze/esporta-scadenze.ts` | sostituisce |
| `src/features/scadenze/da-formare.test.ts` | nuovo (13 test) |
| `src/routes/__snapshots__/scadenze.flusso.test.tsx.snap` | sostituisce (una riga in più: la nuova voce del menù) |

Nessuna modifica a database, API, matrice o altre pagine.

## Regole

1. Si considerano i lavoratori non cessati.
2. Un corso dovuto genera la riga solo se il lavoratore non ha **nessun** attestato (escluso il respinto, conta anche «In attesa») nello stesso ciclo formativo, con la stessa chiave di raggruppamento della tabella Scadenze. Se c'è anche solo il base, la riga c'è già e dice lei se è scaduto o in scadenza.
3. Esenti (RSPP valido: casella «E») e corsi «in attesa» della formazione Lavoratore (casella grigia «…») non generano la riga.
4. Una riga per lavoratore e ciclo. Se sono dovuti sia il base sia l'aggiornamento si mostra il corso di partenza (base, poi specifico, poi aggiornamento).
5. Colonna **Scadenza**: «Da svolgere entro <data di assunzione>» se la data è in anagrafica (rossa se già passata), altrimenti solo «Da svolgere».
6. Colonna **Data corso**: «—». Stato: badge rosso «Da formare» (distinto da «Scaduto»: il corso base non scade).
7. Filtri Reparto, Ruolo, Corso e ricerca valgono come per le altre viste. Con la vista attiva il menù Corso propone i corsi attesi, anche se nessuno li ha mai svolti. Cambiando vista il corso scelto si azzera.
8. «Solo incarichi attualmente assegnati»: le righe «Da formare» nascono già solo da incarichi assegnati (o ruoli obbligatori per tutti), quindi la spunta non ne cambia il numero.
9. Esporta (Excel/CSV) e Stampa includono le righe, con le stesse colonne degli altri elenchi: stato «Da formare», scadenza «Da svolgere entro…», nota «Nessun attestato registrato».

## Verifiche eseguite

- `tsc`: nessun errore nei file di Scadenze.
- `vitest` su `src/features/scadenze` e `src/routes/scadenze`: tutti passati (da-formare 13 test; le altre viste non cambiano).
- Suite completa: 17 test falliscono, **gli stessi 17 che falliscono sul codice di partenza** (Impostazioni, Dipendenti, HR, Home, Documenti, Nomine); nessun test nuovo fallito.
- Non l'ho aperta in un browser con i dati veri: conviene un controllo a vista sui 7 Preposti e sui 3 neoassunti.

## Da sapere

- `obblighi-matrice.ts` ripete la colla di `useDatiMatrice.ts` (3 funzioni) per non toccare la matrice e per leggere i dati solo a vista attiva. Le regole vere restano nelle funzioni condivise. Se vuoi un solo punto anche per la colla, il passo dopo è far usare questo file alla matrice.
- Esporta e Stampa usano i meccanismi già presenti nella pagina Scadenze (esportatore comune e stampa del browser), non il PDF a colori delle stampe predefinite.
- Chi è stato assunto in passato mostra una data «entro» già superata, quindi in rosso: è la regola scelta («subito», data di assunzione).

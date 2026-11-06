# Stampe & Report: pulsante «Senza attestati»

Data: 2026-11-06

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/stampe/dati-stampa.ts` | sostituisce (campi `senzaAttestati` e `senzaModo`, `lavoratoriSenzaMinimi`, `intersezioneId`, colonne, titolo, messaggio vuoto, `conSelezione`) |
| `src/features/stampe/StampePage.tsx` | sostituisce (calcolo dei lavoratori senza minimi, intersezione con «Nuovi arrivati», striscia «Filtri attivi») |
| `src/features/stampe/components/FiltriStampa.tsx` | sostituisce (pulsante «Senza attestati» con selettore di modalità) |
| `src/features/stampe/dati-stampa.test.ts` | sostituisce (nuovi test, 35 in tutto nel file) |

Nessuna modifica a database, API o altre pagine.

## Come funziona

Nel pannello **Selezione**, sotto «Anagrafica incompleta», c'è il pulsante **Senza attestati**. Acceso, la pagina passa all'Elenco lavoratori e compare un selettore:

| Modalità | Chi compare |
|---|---|
| Manca almeno uno dei due (predefinita) | chi non ha il Corso base **oppure** non ha il Corso specifico |
| Nessuno dei due | chi non ha **né** il Corso base **né** il Corso specifico |

Colonne: Lavoratore, Codice fiscale, Reparto, Mansione, Data assunzione, **Corso base**, **Corso specifico**.
Nelle ultime due: «Sì – data» se c'è, «Scaduto – data» se è scaduto, «No» se manca.

## Regole

1. Conta solo l'attestato con stato **Approvato** (come i Sì/No già presenti). «In attesa» e «Respinto» non contano.
2. Un corso **scaduto** conta come presente: il lavoratore non compare per quel corso, la cella mostra «Scaduto – data».
3. Corso base = codici `SIC-GEN…`, Corso specifico = codici `SIC-SPE…` (stessa regola dei Sì/No esistenti).
4. Si combina con «Nuovi arrivati dell'anno» (intersezione), con «Anagrafica incompleta» e con reparto, ruolo, categoria, materia, lavoratore.
5. Cessati esclusi, salvo la spunta «Includi cessati».
6. Anteprima, Stampa/PDF, Excel e CSV seguono la stessa vista. «Univoco» resta non applicabile (un lavoratore per riga).

## Verifiche eseguite

- `vitest` sulla cartella stampe: 43 test passati (dati-stampa 35, ordinamento 8).
- `tsc`: nessun errore nei file toccati.
- `eslint`: nessun errore nuovo (restano gli avvisi `exhaustive-deps` su `tutti` e `assegnazioni`, già presenti prima).
- Non eseguito: `TabellaStampa.ordine.test.tsx` (nel mio ambiente manca una dipendenza dei test di rotta, non legata a questa modifica). Lancialo in locale prima della pubblicazione.

## Dopo il push

Pubblica dal pulsante **Publish** dell'editor Lovable.

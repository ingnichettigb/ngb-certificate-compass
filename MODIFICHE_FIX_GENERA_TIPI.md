# Correzione: errore di tipo (e TypeError) in «Stampa selezione» con l'argomento scelto

Data: 2026-11-25

## Il problema

`src/features/stampe/globale/genera.ts`, riga 105 (introdotto dal commit `5854b12`, filtro per argomento): `appartieneAGruppo(a.tipi_corso, filtroArgomento)`.
L'attestato può non avere i dati del corso (`tipi_corso` assente), ma `appartieneAGruppo` si aspetta sempre un corso e legge `c.codice`.

- **Compilatore**: `TS2345` («Type 'undefined' is not assignable…»): era l'unico errore di tipo del progetto.
- **A runtime**: `TypeError: Cannot read properties of undefined (reading 'codice')`: la «Stampa selezione» con un argomento scelto si ferma se anche un solo attestato è senza corso.
  Verificato con un test sul codice com'era (falliva con questo errore).

## La correzione (una riga)

Con un argomento scelto, un attestato senza i dati del corso non appartiene a nessun argomento e **resta fuori**; senza filtro («Tutti») restano tutti, come prima.

```
conScadenza.filter((a) => a.tipi_corso != null && appartieneAGruppo(a.tipi_corso, filtroArgomento))
```

## File

| File | Stato |
|---|---|
| `src/features/stampe/globale/genera.ts` | sostituisce (una riga e il commento di revisione; il file non è cambiato nel deposito dopo `5854b12`) |
| `src/features/stampe/globale/genera.filtro-argomento.test.ts` | nuovo (2 test: con filtro, senza filtro) |

## Controllo

- Tipi: **nessun errore** su tutto il progetto (prima ce n'era uno). Cartella `stampe`: tutti i test passano.
- Il test nuovo fallisce sul codice vecchio e passa con la correzione. ESLint: nessun errore.

# Scadenze: ciclo rigido, decadenza, somma ore e sanatoria tardiva

Data: 2026-11-06

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/scadenze/types.ts` | sostituisce (nuovi campi e tipo `RigaScadenzaDati`) |
| `src/features/scadenze/calcolo-ciclo.ts` | nuovo (motore puro, senza dipendenze dall'app) |
| `src/features/scadenze/raggruppa.ts` | nuovo (una riga per lavoratore + corso) |
| `src/features/scadenze/filtri.ts` | sostituisce |
| `src/features/scadenze/components/RigaScadenza.tsx` | sostituisce |
| `src/features/scadenze/calcolo-ciclo.test.ts` | nuovo (22 test vitest) |

## Regole

1. **Ancora**: data dell'ultimo Corso Base (`livello_specifico = "base"`); se nessun attestato è Base, il più vecchio.
2. **Cicli rigidi**: il ciclo k finisce in `ancora + k × N anni`, sempre calcolato dall'ancora.
3. **Somma ore**: le ore degli aggiornamenti si sommano. Raggiunto il monte ore, il ciclo in cui cade l'ultimo attestato è coperto e la scadenza diventa la fine del ciclo successivo.
4. **Stato parziale**: sotto il monte ore lo stato è "Parziale (X/Y ore)" e la scadenza non si sposta.
5. **Sanatoria tardiva**: un aggiornamento fatto dopo la scadenza vale per il ciclo in cui cade la sua data (il ciclo in corso) e sana i cicli arretrati. Disattivabile con `consentiSanatoriaTardiva: false`.
6. **Decadenza**: se dall'ultima evidenza (Base, oppure aggiornamento che ha completato il monte ore) passano più di 10 anni, gli aggiornamenti successivi non contano e serve un nuovo Base. Un Base rifatto riparte da zero.
7. **Ore in eccesso**: non si riportano al ciclo successivo.
8. **Ore mancanti**: se `ore_dichiarate` è vuoto si usano le ore minime di legge del corso, ma la riga mostra "Ore da verificare".
9. Attestati respinti, con data futura o precedenti al Base corrente non contano.

## Parametri per tipo di corso

- `durata_validita_anni` e `ore_aggiornamento` (o `ore_minime_legge`) sono letti dal tipo di corso del Base.
- Colonna **facoltativa** `tipi_corso.decadenza_anni`: se assente vale 10; `null` = nessuna decadenza.
- **Da verificare con la normativa di ogni corso**: periodicità, ore richieste e decadenza non sono uguali per tutte le figure.

## Modifica da fare nella pagina Scadenze

`filtraScadenze` ora restituisce una riga per lavoratore + corso (`RigaScadenzaDati[]`), non più un attestato. Nella pagina che lo usa:

```tsx
// prima
{righe.map((a, i) => <RigaScadenza key={a.id} a={a} numero={i + 1} tuttiAttestatiDipendente={...} />)}

// dopo
{righe.map((r, i) => <RigaScadenza key={r.chiave} riga={r} numero={i + 1} />)}
```

Il resto della firma di `filtraScadenze` è invariato.

## Applicare e fare push

```bash
git checkout -b feature/scadenze-cicli
unzip -o ngb-scadenze-cicli.zip -d .
npx vitest run src/features/scadenze
git add src/features/scadenze MODIFICHE_SCADENZE.md
git commit -m "feat(scadenze): ciclo rigido, decadenza, somma ore e sanatoria tardiva"
git push -u origin feature/scadenze-cicli
```

Nessun force-push né rebase: come richiesto da `AGENTS.md`, la storia già pubblicata resta intatta.

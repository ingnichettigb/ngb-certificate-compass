# Scadenze: ciclo rigido, decadenza, somma ore, sanatoria tardiva e linea temporale

Data: 2026-11-06

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/scadenze/types.ts` | sostituisce (campi, `RigaScadenzaDati`, `CicloVisuale`, `EventoCiclo`) |
| `src/features/scadenze/calcolo-ciclo.ts` | nuovo (motore puro; restituisce anche cicli ed eventi classificati) |
| `src/features/scadenze/raggruppa.ts` | nuovo (una riga per lavoratore + corso) |
| `src/features/scadenze/filtri.ts` | sostituisce |
| `src/features/scadenze/components/RigaScadenza.tsx` | sostituisce (pulsante per aprire la linea temporale) |
| `src/features/scadenze/components/LineaCicloFormativo.tsx` | nuovo |
| `src/features/scadenze/calcolo-ciclo.test.ts` | nuovo (34 test vitest) |

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

## Linea temporale (colori per ciclo)

Il grafico disegna solo ciò che calcola il motore (`ciclo.cicli`, `ciclo.eventi`), quindi non può contraddire la tabella.

| Colore | Significato |
|---|---|
| Verde | ciclo completato (somma ore raggiunta, anche con ore in più o con sanatoria tardiva) |
| Arancione | ciclo in corso, da completare (mostra X/Y ore sul ciclo che definisce la scadenza, anche a 0 ore) |
| Rosso | scadenza passata e ciclo non completato |
| Nero | ciclo successivo, non ancora attivo |
| Bordeaux | decaduto (dopo la data di decadenza; non si mostra il ciclo successivo) |

- Pallini: verde = Corso Base o aggiornamento che completa il monte ore; arancione = parziale; vuoto = non contato (decaduto, ore in eccesso, data futura, tardivo non ammesso). Ogni pallino è sulla data reale.
- Tacche annuali senza testo; sotto, Partenza e Fine ciclo n con le date; indicatore "Oggi" e legenda.
- Etichette ravvicinate si dispongono su tre livelli; la linea scorre in orizzontale su schermi stretti.
- `TabellaScadenze.tsx` non è incluso: la versione che hai già (con `righe`, `key={r.chiave}` e `colSpan={8}`) va bene com'è.
- Serve `lucide-react` (icona del pulsante), già presente nei progetti Lovable.

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

---

## Aggiornamento 2026-11-06 (16:00): correzione crash «This page didn't load»

Causa: `TabellaScadenze.tsx` passava ancora `a={a}` a `RigaScadenza`, che ora riceve `riga={r}` (riga raggruppata con ciclo già calcolato). La nota sopra, secondo cui `TabellaScadenze.tsx` andava bene com'era, non corrispondeva al file presente nel repository.

| File | Stato | Cosa cambia |
|---|---|---|
| `src/features/scadenze/components/TabellaScadenze.tsx` | modificato | `righe: RigaScadenzaDati[]`, `riga={r}`, `key={r.chiave}`, colonna ordinabile «Stato», `colSpan={8}` |
| `src/features/scadenze/calcolo-ciclo.ts` | modificato | guardia su `dataCorso` mancante o non valida (record scartato); parametro `dataTaglio` |
| `src/features/scadenze/raggruppa.ts` | modificato | regola Preposti (ciclo 2 anni, taglio 19/05/2026); protezione su `data_corso` nulla |
| `src/features/scadenze/types.ts` | modificato | `dataTaglio`, `scadenzaPortataAlTaglio` |
| `src/features/scadenze/components/RigaScadenza.tsx` | modificato | nota «termine transitorio» sotto la scadenza |
| `src/features/scadenze/components/LineaCicloFormativo.tsx` | modificato | linea tratteggiata e etichetta «Taglio 19/05/2026», voce in legenda |
| `src/features/home/components/IntestazioneHome.tsx` | modificato | pulsante «Scadenze & Piano Corsi» |
| `src/features/scadenze/calcolo-ciclo.test.ts` | modificato | +6 test (taglio, date mancanti) |
| `src/features/scadenze/filtri.test.ts` | modificato | riscritto per le righe raggruppate (era rimasto al vecchio formato) |
| `src/routes/scadenze.flusso.test.tsx` | modificato | dati adeguati al motore, ordinamento «Stato» |
| `src/routes/__snapshots__/scadenze.flusso.test.tsx.snap` | rigenerato | |
| `src/routes/__snapshots__/index.flusso.test.tsx.snap` | rigenerato | aggiunge i pulsanti Scadenze e Stampe |

Nessun file nuovo.

### Regola Preposti
Ciclo biennale ancorato al Corso Base; se la fine ciclo cade prima del 19/05/2026, la scadenza mostrata è il 19/05/2026 (regime transitorio dell'Accordo Stato-Regioni 17/04/2025). Vale per ogni corso riconosciuto come Preposto (macro-categoria, codice `PRP-` o nome). Le ore di aggiornamento sono quelle del tipo di corso, altrimenti 6.

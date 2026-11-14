# Logica degli aggiornamenti e delle scadenze

Riepilogo delle regole con cui il programma calcola scadenze e aggiornamenti dei corsi di sicurezza.
Aggiornato al 14/11/2026. Il calcolo sta in un solo punto: `src/features/scadenze/calcolo-ciclo.ts`
(motore), alimentato da `raggruppa.ts`; le stampe lo usano tramite `preposti.ts` (`applicaScadenzaCicli`).

## 1. Il principio

- Il **corso di partenza** (base) vale N anni. Entro la scadenza si fa l'**aggiornamento**, che abilita altri N anni.
- Le scadenze si contano **dalla data del corso base**, non dalla data degli aggiornamenti: il ciclo *k* termina
  alla data del base + *k* × N anni (cicli «rigidi»). L'aggiornamento fatto in anticipo non sposta le scadenze.
- Se **non c'è un base** a cui fare riferimento, si parte dalla data dell'attestato più vecchio (di solito il primo aggiornamento).
- Se ci sono più corsi base, vale l'**ultimo**.
- Il calcolo è per **lavoratore + gruppo di corsi** (stessa macro-categoria), non per singolo attestato:
  è il ciclo, non l'attestato, a essere valido o scaduto. Un attestato anteriore all'ultima evidenza è «superato» e non conta come scaduto.

## 2. Regole per corso

| Corso | Partenza | Validità | Aggiornamento | Ritardo | Decadenza |
|---|---|---|---|---|---|
| **Formazione generale** (SIC-GEN) | Base | **Nessuna scadenza** | Nessuno | — | Mai. C'è o manca |
| **Specifico** (4 / 8 / 12 ore secondo il rischio) | Base | 5 anni | 6 ore, entro i 5 anni | Sanabile fino a 10 anni | 10 anni dall'ultima evidenza: si rifà il base |
| **Antincendio** | Base | 5 anni (dal catalogo) | Come lo specifico | Come lo specifico | Come lo specifico |
| **Preposto** | Base (richiede prima lo specifico) | Cicli di 2 anni | 6 ore | Come lo specifico | Come lo specifico |
| **Primo soccorso** | Base (12 ore) | 3 anni | Entro i 3 anni | **Massimo 4 mesi** | Oltre 4 mesi di ritardo: si rifà il base |
| **Altri corsi** (Evacuazione, BLSD, ecc.) | Base | Da catalogo | Da catalogo | Come lo specifico | 10 anni dall'ultima evidenza |

Durata, ore di aggiornamento e corso collegato di ogni tipo sono nella **Tabella tipi di corso** (database).
Le ore del corso specifico (4, 8, 12) dipendono dal rischio dell'azienda; con rischi differenziati si applicano per lavoratore.

## 3. Ore degli aggiornamenti

Le ore di più aggiornamenti dentro lo stesso ciclo **si sommano**. Sotto il monte ore lo stato è
«Incompleto: X/Y ore» e la scadenza non si sposta. Raggiunto il monte ore, il ciclo risulta coperto e la scadenza
passa al ciclo successivo. Le ore in eccesso non si riportano al ciclo dopo.

Esempio: base 15/09/2018 (5 anni), monte ore 6. Aggiornamento di 4 ore il 10/05/2022 + 2 ore il 20/01/2023
→ ciclo coperto, nuova scadenza **15/09/2028**.

## 4. Preposto (Accordo Stato-Regioni 17/04/2025)

- Ciclo **biennale** con aggiornamento di 6 ore.
- Chi ha un base **anteriore al 19/05/2023** segue il vecchio ciclo di 5 anni fino al **19/05/2026**: il ciclo che
  attraversa quella data è troncato al 19/05/2026 (scadenza tassativa per chi non ha aggiornato), poi cicli di 2 anni.
- Il base Preposto richiede prima il corso specifico.

## 5. Primo soccorso

- Il base (12 ore) vale 3 anni; l'aggiornamento va fatto entro i 3 anni.
- Un aggiornamento in ritardo di **massimo 4 mesi** sana il ciclo e **non sposta** le scadenze successive (restano ancorate al base).
- Oltre i 4 mesi il gruppo **decade**: gli aggiornamenti successivi non contano e si rifà il base.
- La tolleranza è la colonna `tipi_corso.tolleranza_ritardo_mesi` (4 sul Primo soccorso); in assenza vale la regola predefinita in `regole-corso.ts`.

## 6. Esonero dall'aggiornamento Preposto (RSPP / ASPP)

- Chi ha un **RSPP valido** (modulo C o aggiornamento RSPP) o un **ASPP valido** (modulo B o aggiornamento ASPP) non deve fare l'aggiornamento Preposto.
- Il **base Preposto resta obbligatorio**; se il ciclo è decaduto non c'è esonero.
- La scadenza mostrata diventa quella dell'RSPP/ASPP, se più lontana.
- Nelle **stampe** la colonna Stato lo indica: «Valido – Esente dall'aggiornamento Preposto: RSPP/ASPP valido fino al GG/MM/AAAA»
  (non solo «Valido» o «aggiornato»). Lo stesso motivo compare in scheda dipendente, matrice abilitazioni e Scadenze.

## 7. Stati

| Stato | Significato |
|---|---|
| Valido | Ciclo coperto, scadenza oltre 90 giorni |
| In scadenza | Scadenza entro 90 giorni |
| Scaduto (sanabile) | Scadenza superata, un aggiornamento in ritardo può ancora sanare |
| Incompleto ore | Ore di aggiornamento parziali, sotto il monte ore |
| Decaduto | Passati 10 anni dall'ultima evidenza (o il limite di ritardo): si rifà il base |
| Senza scadenza | Corso permanente (SIC-GEN) |
| Manca | Il lavoratore in servizio non ha il corso (stampe Corso base / Corso specifico) |

## 8. Punto aperto da decidere

Per i corsi **senza tolleranza** (tutti tranne il Primo soccorso) l'aggiornamento fatto in ritardo conta per il ciclo
in cui cade la sua data e sana i cicli arretrati. Con base 15/09/2018 e 5 anni, il comportamento attuale è:

| Aggiornamento | Nuova scadenza |
|---|---|
| In tempo (01/05/2023) | 15/09/2028 |
| In ritardo di 4 mesi (10/01/2024) | 15/09/2033 |
| In ritardo di 3 anni (01/06/2026) | 15/09/2033 |

Quindi un aggiornamento in ritardo sposta la scadenza **più avanti** di uno in tempo. Se la regola voluta è che l'aggiornamento
tardivo sani il ciclo dovuto e le scadenze restino ancorate al base (come per il Primo soccorso), il risultato atteso sarebbe 15/09/2028.
Da confermare prima di toccare il motore.

## 9. Dove sta nel codice

| Cosa | File |
|---|---|
| Motore dei cicli, decadenza, sanatoria, transitorio Preposto | `src/features/scadenze/calcolo-ciclo.ts` |
| Raggruppamento per lavoratore e corso, parametri del ciclo, riga per riga | `src/features/scadenze/raggruppa.ts` |
| Scadenza applicata agli attestati (stampe, scheda dipendente), SIC-GEN permanente, motivo dell'esonero | `src/features/scadenze/preposti.ts` |
| Tolleranza sul ritardo (Primo soccorso) | `src/features/scadenze/regole-corso.ts` |
| Esonero RSPP/ASPP | `src/features/scadenze/esenzioni-rspp.ts` |
| Testo della colonna Stato nelle stampe | `src/features/stampe/stampa-testo.ts` |

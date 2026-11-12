# Stampe & Report: filtro «Stato lavoratore» e carta 04 «Registro lavoratori cessati»

Data: 2026-11-11

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/stampe/stampa-tipi.ts` | sostituisce (tipo `FiltroStatoLavoratore`, campo `statoLavoratori`, `statoEffettivo`, `includeLavoratorePerStato`) |
| `src/features/stampe/stampa-calcolo.ts` | sostituisce (3 filtri sullo stato) |
| `src/features/stampe/stampa-organigramma.ts` | sostituisce (filtro sullo stato) |
| `src/features/stampe/stampa-vista.ts` | sostituisce (colonna «Data cessazione» automatica con «Solo cessati») |
| `src/features/stampe/dati-stampa.ts` | sostituisce (riesporta i nuovi nomi) |
| `src/features/stampe/suggerimenti.ts` | sostituisce (tooltip `statoLavoratori`) |
| `src/features/stampe/components/FiltriStampa.tsx` | sostituisce (selettore «Stato lavoratore») |
| `src/features/stampe/components/GuidaStampe.tsx` | sostituisce (voce di guida) |
| `src/features/stampe/StampePage.tsx` | sostituisce (elenco filtrato, badge) |
| `src/features/stampe/stampe-predefinite.ts` | sostituisce (carta `anagrafica-cessati`) |
| `src/features/stampe/numerazione-carte.ts` | sostituisce (solo intestazione) |
| `src/features/stampe/numerazione-carte.test.ts`, `stampe-predefinite.test.ts` | sostituiscono (numeri slittati, carta nuova) |
| `src/features/stampe/stato-lavoratore.test.ts` | nuovo |

Nessuna modifica a database, API o altre pagine.

## Come funziona

Nella **Stampa personalizzata** la casella «Includi lavoratori cessati» diventa il selettore **Stato lavoratore**:

| Voce | Chi compare |
|---|---|
| Solo in forza (predefinito) | chi è in servizio |
| Solo cessati | solo i cessati; con elenco lavoratori e registro compare da sola la colonna **Data cessazione** |
| Tutti | in forza e cessati insieme |

La scelta vale per anteprima, stampa, PDF, CSV ed Excel, e per l'Organigramma squadre.
`includiCessati` resta valido e vale «Tutti» (precedenza a «Solo cessati»): test e preset esistenti non cambiano.

## Nuova carta 04

«Registro lavoratori cessati» (famiglia Anagrafica, dopo il Registro anagrafico). Colonne: Lavoratore, Codice fiscale, Luogo e Data di nascita, Reparto, Mansione, Data assunzione, Fine contratto, Data cessazione.

| Carta | Prima | Dopo |
|---|---|---|
| Elenco per settore | 04 | 05 |
| Stampa per funzioni e squadre | 05 | 06 |
| Scadenze | 06–12 | 07–13 |
| Completati | 13–18 | 14–19 |

La numerazione è automatica (posizione nell'elenco): i numeri scritti a mano nei test sono stati aggiornati.

## Cosa non cambia

«Anagrafica incompleta», «Senza attestati» e la tavola A3 restano solo per chi è in forza (i loro filtri sono in `stampa-selezioni.ts` e `organigramma-a3.ts`, non toccati).

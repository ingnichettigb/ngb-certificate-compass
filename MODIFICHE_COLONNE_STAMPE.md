# Stampe & Report: larghezza delle colonne e pulsante «+» per le colonne

Data: 2026-11-07

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/stampe/dati-stampa.ts` | sostituisce (3 colonne nuove, `colonneDisponibili`, `gruppiColonne`; nessun calcolo esistente toccato) |
| `src/features/stampe/preferenze-colonne.ts` | **nuovo** (colonne tolte/aggiunte e larghezze, ricordate per documento) |
| `src/features/stampe/larghezze-colonne.ts` | **nuovo** (adattamento al contenuto, limiti, percentuali per la stampa) |
| `src/features/stampe/StampePage.tsx` | sostituisce (usa le preferenze al posto dello stato «colonne tolte») |
| `src/features/stampe/components/TabellaStampa.tsx` | sostituisce (maniglie sul bordo, colonne a larghezza fissa, cella «+») |
| `src/features/stampe/components/SelettoreColonne.tsx` | **nuovo** (elenco a spunte del «+») |
| `src/features/stampe/components/ContenutoStampa.tsx` | sostituisce (passa le nuove proprietà alla tabella) |
| `src/features/stampe/components/BarraEsportazione.tsx` | sostituisce («Ripristina colonne» conta anche aggiunte e larghezze) |
| `src/features/stampe/dati-stampa.colonne.test.ts` | **nuovo** (colonne aggiungibili e colonne nuove) |
| `src/features/stampe/preferenze-colonne.test.ts` | **nuovo** |
| `src/features/stampe/larghezze-colonne.test.ts` | **nuovo** |
| `src/features/stampe/components/TabellaStampa.colonne.test.tsx` | **nuovo** |

Nessuna modifica a database, API, `package.json`, Matrice Abilitazioni e Ruoli o altre pagine.

## Come funziona

**Restringere una colonna.** Nell'intestazione, sul bordo destro di ogni colonna, il cursore diventa ↔.
- Trascinando si cambia la larghezza (minimo 48 px).
- Con il **doppio clic** la colonna si adatta al contenuto più lungo di tutta la colonna. L'intestazione può andare a capo: conta solo la sua parola più lunga.
- Alla prima modifica le altre colonne restano dove sono. Le larghezze valgono anche per la stampa: sul foglio le colonne mantengono le stesse proporzioni e la tabella sta sempre nella larghezza della pagina.

**Aggiungere o togliere colonne.** In fondo all'intestazione, a destra, c'è il pulsante **+** (non si stampa). Apre un elenco a spunte:

| Gruppo | Colonne |
|---|---|
| Anagrafica | Categoria / Profilo, Codice fiscale, Lavoratore, Luogo e data di nascita, Mansione / Classe di concorso, Reparto |
| Attestato | Argomento corso, Corso, Data corso, Giorni alla scadenza, N. attestato, Ore, Scadenza, Stato |
| Contratto | Data assunzione, Data cessazione, Fine contratto |
| Controllo dati | Cosa manca |
| Formazione e incarichi | Antincendio, Corso base, Corso specifico, Defibrillatore, Preposto, Primo soccorso, Ruoli sicurezza |

Gruppi e colonne sono in ordine alfabetico. Ogni documento mostra solo le colonne che lì hanno un dato:
- **Elenco lavoratori**: Anagrafica, Contratto, Controllo dati, Formazione e incarichi.
- **Registro, scadenze, gruppi, reparti, schede**: Anagrafica, Attestato, Contratto (fine contratto e cessazione), Controllo dati.

Le colonne aggiunte vanno in fondo, nell'ordine in cui le spunti. Una colonna predefinita tolta con ✕ si rimette dal «+» al suo posto. L'ultima colonna rimasta non si può togliere.

**Ricordare le scelte.** Colonne e larghezze si ricordano per ogni tipo di documento (anche per le varianti «Nuovi arrivati», «Anagrafica incompleta», «Senza attestati»), nel browser di questo computer. Cambiando documento si ritrovano le scelte fatte per quello. **Ripristina colonne** azzera le scelte del documento che hai davanti.

Anteprima, Stampa/PDF, Excel e CSV seguono la stessa vista.

## Cosa non cambia

- Le colonne predefinite, l'ordinamento, «Univoco», ✕, i filtri e tutti i calcoli sono gli stessi di prima.
- Tutte le nuove proprietà della tabella sono facoltative: senza di esse la tabella è identica a prima (verificato con un test).
- Finché non ridimensioni nessuna colonna, la tabella resta a larghezza automatica come oggi.

## Verifiche eseguite

- `vitest` cartella stampe: **112 test passati** (erano 74; i 74 esistenti sono invariati e passano).
- `vitest` intero progetto: gli stessi 9 test che erano già rossi prima delle modifiche (SelezioneReparto.materia, DocumentiAttestati.flusso, api.test riepilogoIncarichi, dipendenti/hr/scadenze.flusso); nessuno nuovo.
- `tsc`: nessun errore nuovo (restano quelli già presenti in `DialogAggiungiAttestatoConValidazione.tsx`).
- `vite build`: compilazione riuscita; le classi per la stampa in percentuale sono presenti nel CSS.

## Da provare a mano nel browser

Non ho potuto aprire una finestra del browser: il trascinamento e il doppio clic sono provati con test automatici, non con il mouse. Da controllare:
1. Trascinare il bordo di una colonna e vedere che le altre non si spostano.
2. Doppio clic su «Codice fiscale» e su «Mansione / Classe di concorso».
3. Anteprima di stampa con colonne ridimensionate (orizzontale e scheda individuale).
4. «+» con tabella molto larga e con una sola colonna.

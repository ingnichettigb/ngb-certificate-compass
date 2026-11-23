# DB F — Stampe predefinite: nuova carta 21 «Stampa selezione»

File:       DB_F.md
Percorso:   DB_F.md (radice del deposito)
Data creaz: 23/11/2026
Revisioni:
  rev 1 — 23/11/2026 — Nuova carta «Stampa selezione» (fascicolo PDF dei soli lavoratori scelti, con attestati).

## Cosa ho fatto
Nella pagina **Stampe → Stampe predefinite → «Fascicolo completo»**, accanto a «Stampa globale», c'è una nuova carta **21 «Stampa selezione»** (rotta `/stampe/selezione`).
Scegli uno o più lavoratori e ottieni lo stesso fascicolo PDF della Stampa globale, ma solo per loro, attestati compresi.

Dentro ogni file:
1. **Copertina** con logo, ditta, «BLOCCO NN DI NN», indicazioni modificabili e **l'elenco numerato dei nomi** contenuti nel file, su due colonne. Se i nomi non entrano nella copertina, l'elenco continua su una o più pagine subito dopo.
2. **Niente organigramma A3.**
3. Per ogni lavoratore, in ordine alfabetico: **scheda** (dati anagrafici, funzioni, attestati) + **PDF degli attestati** (fronte e retro).
4. **Pagina finale** con indice cliccabile e controlli, «Torna all'indice» su ogni scheda, segnalibri (Copertina · lavoratori con i loro attestati · Indice e controlli), piè di pagina «Blocco N di M · Pagina X di Y».

Nome file: `NN-AAMMGGhh-STAMPA SELEZIONE-DITTA-DA X a Y.pdf`. Esempio: `01-26112309-STAMPA SELEZIONE-ROSSI SRL-DA B a V.pdf`.

## Pagina di scelta
- Bottoni **Tutti / In forza / Nuovi arrivati / Cessati**, ognuno con il suo conteggio (stesse regole di `filtraPerStato`: «Nuovi arrivati» = assunti dal 1 settembre dell'anno scolastico in corso).
- Ricerca per cognome o nome; **Seleziona tutti quelli mostrati**, **Deseleziona quelli mostrati**, **Nessuno**; contatore «N scelti».
- La scelta resta quando cambi filtro o ricerca. Ogni cambio di scelta azzera il calcolo già fatto: va rifatto «Calcola dimensione e blocchi».
- Un lavoratore **cessato** che spunti viene incluso (la scelta è esplicita, non serve la spunta «Includi cessati»).
- Limite di MB per file (predefinito 100) e indicazioni sulla copertina (testo predefinito senza riferimento all'A3). Se i lavoratori scelti superano il limite il fascicolo si divide in blocchi; un lavoratore non viene mai spezzato.

## Numero della carta
La carta ha il badge numerico come le altre ed è la **21**, dopo l'ultima carta di tabella (la 20): i numeri 01–20 non cambiano. «Stampa globale» resta senza numero, come prima. Il numero lo dà `numeriCarte()` (la carta non è in `tutteLeCarte()`, perché apre una pagina di scelta e non un'anteprima di tabella).

## Come è fatto (il motore è lo stesso della globale)
Nessuna copia del motore. Tre opzioni **facoltative** in `OpzioniStampaGlobale`; senza di esse la Stampa globale si comporta esattamente come prima:
- `soloIds` — `preparaLavoratori()` tiene solo quegli id.
- `includiOrganigramma` — `false` toglie la pagina A3, il segnalibro A3 e il peso `BYTE_A3` del blocco 1 (`pesoFisso`, `dividiInBlocchi`).
- `tipo` — `"SELEZIONE"` cambia titolo della copertina, titolo del PDF e nome file.

## File (percorsi identici al deposito)
| File | Stato | Rev |
|---|---|---|
| src/features/stampe/components/StampaSelezionePage.tsx | NUOVO | 1 |
| src/routes/stampe.selezione.tsx | NUOVO | 1 |
| src/routeTree.gen.ts | modificato (rotta `/stampe/selezione`, aggiunta a mano come la scrive il generatore) | — |
| src/features/stampe/components/ElencoStampePredefinite.tsx | modificato (carta con badge) | 7 |
| src/features/stampe/numerazione-carte.ts | modificato (numero della carta 21) | 4 |
| src/features/stampe/numerazione-carte.test.ts | modificato | 4 |
| src/features/stampe/globale/genera.ts | modificato (opzioni `soloIds`, `includiOrganigramma`, `tipo`) | 3 |
| src/features/stampe/globale/genera.test.ts | modificato (3 test nuovi) | 2 |
| src/features/stampe/globale/pagine-fisse.ts | modificato (copertina: `titolo`, `elencoNomi`) | 5 |
| src/features/stampe/globale/pagine-fisse.test.ts | modificato (3 test nuovi) | 2 |
| src/features/stampe/globale/piano-blocchi.ts | modificato (`conA3`, `tipo` nel nome file) | 2 |
| src/features/stampe/globale/piano-blocchi.test.ts | modificato (3 test nuovi) | 2 |
| DB_F.md | NUOVO | 1 |

Nota: dove `eslint --fix` ha riformattato righe già presenti (3 avvisi prettier in `numerazione-carte.ts` e `numerazione-carte.test.ts`, che c'erano già prima) il cambio è solo di spaziatura.

## Verifiche
- Test della cartella `stampe`: **306 passati**, compresi quelli nuovi (filtro sugli id con un cessato, blocco senza A3, nome file SELEZIONE, numero 21, copertina con pochi e con molti nomi, globale invariata).
- `tsc` pulito sui file toccati. `eslint` pulito sui file toccati.
- Ho generato due copertine di prova (5 e 60 nomi) e le ho guardate come immagine: titolo, elenco su due colonne, continuazione sulla seconda pagina.

## Non verificato
- **Non ho provato la pagina con i tuoi dati reali su Supabase** (lavoratori, attestati e file veri): provala in anteprima Lovable e scarica un PDF con 2–3 lavoratori, uno cessato compreso.
- Non ho potuto eseguire 4 file di test di interfaccia già presenti (`TabellaStampa.colonne`, `TabellaStampa.ordine`, `colonne-spostabili`, `guida`): nel mio ambiente manca `@testing-library/dom`. Falliscono allo stesso modo anche senza le mie modifiche. Eseguili tu con `bun run test`.
- Non c'è un test di interfaccia per la nuova pagina, per lo stesso motivo.
- `routeTree.gen.ts` l'ho aggiornato a mano nello stesso formato del generatore; se Lovable/Vite lo rigenera, il risultato deve essere equivalente.

## Push
    cd ngb-certificate-compass
    unzip -o ../ngb-stampa-selezione-rev1.zip
    git add -A
    git commit -m "Nuova carta 21 Stampa selezione: fascicolo PDF dei lavoratori scelti con attestati"
    git push origin main

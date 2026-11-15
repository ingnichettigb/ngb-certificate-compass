# Allineamenti: «Applica» nelle Tabelle di raccordo, icone Sedi, conferma in uscita, test (15/11/2026)

Sopra la versione su `main` (commit `2d1292d`). **Nessuna nuova migrazione**: lo script `sql/allinea-spunte-applica-ditta.sql` sistema solo i dati (colonna `applica`).

## 1. Colonna «Applica» (tabelle 03, 04, 05, 07)
- Intestazione **«Applica»** su tutte le tabelle (prima «In uso Ditta» nelle 03, 04, 05 e nella 06).
- La riga calcolata per la Ditta è gialla (badge «In uso Ditta») **e ha la spunta**. Il programma la salva: `applica = true` sulla fascia attiva e `false` sulle altre della stessa tabella.
  Non scrive finché non sono arrivati tutti i dati della Ditta (lavoratori in forza, sedi, soglie), per non salvare una fascia provvisoria; un solo tentativo per ogni differenza, nessun ciclo.
- 03, 04, 05: la spunta resta **non modificabile a mano** (è un risultato di calcolo).
- 07: più righe possono avere stessa fascia e stesso gruppo (cambia l'indice INAIL): se l'utente ne ha spuntata una tra quelle vale la sua scelta (esclusiva); altrimenti sono spuntate tutte. Le righe fuori dalla fascia/gruppo della Ditta sono bloccate.
- 06 (ATECO): la spunta continua ad associare il codice alla Ditta (`ditta.codici_ateco`); il primo codice è «principale».
- **Bottone «Esporta» riparato** (non funzionava: prop `alClic` al posto di `onEsporta` e `esportaTabella` chiamata con 4 argomenti). Ora esporta con `tabellaRaccordoDaEsportare`, con «Applica» come a schermo.

## 2. Sedi (`RiquadroSedi.tsx`)
- Ordine icone: **matita (modifica) poi occhio (risultati)**.
- Tolto il campo numerico inline: sulla riga resta un'etichetta di sola lettura con il massimo di presenti (o l'avviso «da compilare con la matita»). La modifica è solo nel form della matita.

## 3. Conferma in uscita (`useDittaTab.ts`)
- «N. lavoratori» (dall'anagrafica) e «Presenze contemporanee max» (somma sedi) restano allineati nel form, ma fanno parte della **base di confronto** di `isDirty`: aprire Impostazioni e premere «Torna» non chiede più conferma. Una modifica dell'utente sì.
- (Anche la somma delle presenze dalle sedi sporcava lo stato allo stesso modo: corretta insieme.)

## 4. Test e tipi
- `useDittaTab.test.tsx`: `principale: true` sul primo ATECO; 4 nuovi test su `isDirty`.
- `TabelleRaccordo.test.tsx`: colonna «Applica», 06 (associa alla Ditta), 03/04/05/07 (spunta + scrittura nel DB, scelta manuale 07, righe bloccate), esportazione; titolo «09 – Tipi di corso» e PDF fonte della 08 (è un collegamento, non un bottone).
- `esporta-raccordo.test.ts`: id `soglie-antincendio`, colonne attuali della tabella 01 e della 05.
- `lib/api/ditta.ts`: `CodiceAteco` ora ha `principale` e usa gli stessi campi opzionali di `regole-ditta` (16 errori `tsc` → 0).

## File
modificati: `src/features/tabelle-raccordo/{TabellaRaccordo.tsx, definizioni.ts, TabelleRaccordo.test.tsx, esporta-raccordo.test.ts}`,
`src/features/impostazioni/ditta/{RiquadroSedi.tsx, useDittaTab.ts, useDittaTab.test.tsx}`, `src/lib/api/ditta.ts`
nuovi: `sql/allinea-spunte-applica-ditta.sql`, questo file.

## Controllo
`tsc --noEmit`: 0 errori. Test di `tabelle-raccordo` e `impostazioni/ditta`: 32 passati (i nuovi falliscono sul codice precedente).
Intera suite: 764 passati, **10 rossi già presenti su `main`** (test «flusso» con snapshot vecchi: Impostazioni, carica, dipendenti, hr, home, scadenze, documenti, operatore, tipi-corso). Non toccati.

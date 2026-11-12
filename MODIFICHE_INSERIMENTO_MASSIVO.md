# Inserimento massivo: modello Excel, colonna unica Classe/Profilo, funzioni con la X

Finestra «Importa elenco Word/Excel» (modalità «Solo nuovi»).

## Cosa cambia
- **Pulsante «Scarica modello Excel»** sotto il campo file. Foglio «Elenco» con le colonne
  Cognome, Nome, Codice fiscale, Luogo di nascita, Data di nascita, **Classe di concorso / Profilo ATA**,
  Preposto, Antincendio, Primo soccorso, Defibrillatore (BLSD), Addetto all'evacuazione, Privacy.
  Tre righe di esempio di fantasia (da cancellare), menu a tendina «X», foglio «Istruzioni».
- **Colonna unica Classe/Profilo**: `CS`, `AA`, `AT`, `DSGA` → reparto ATA con il profilo; una classe di concorso
  presente in archivio (A027, AB24, IRC…) → reparto Docente con la classe. I 4 codici ATA si controllano per primi,
  così «AA» (profilo) non si confonde con «AA24» (classe). Nessuna modifica al database: restano `reparto`,
  `sottoreparto` e `classe_concorso`.
- **Colonne con la X** (X, x, ✓, SI, 1): diventano ruoli del catalogo. Valgono per i nuovi, per i già presenti in forza
  selezionati e per i cessati riesumati. Solo aggiunta, mai rimozione di ruoli.
- Se un ruolo non esiste nel catalogo viene creato (es. «Referente Privacy», macro-categoria Privacy;
  «Addetto all'evacuazione», macro-categoria Emergenze). L'esito finale li elenca.
- Anteprima: nuove colonne «Classe / Profilo» e «Funzioni (X)».

## File
Modificati: `leggi-file.ts` (rev 4), `analisi-elenco.ts` (rev 4), `registra-nuovi.ts` (rev 4), `PannelloSoloNuovi.tsx` (rev 4),
`ControlliElenco.tsx` (rev 2), `DialogImportaElenco.tsx`, `EsitoImportazione.tsx` (rev 3), `elenco-presenti.test.ts`,
`package.json` + `bun.lock` (nuova dipendenza `exceljs`, per colori e menu a tendina del modello).
Nuovi: `funzioni-sicurezza.ts`, `modello-excel.ts`, test `inserimento-massivo`, `modello-excel`, `registra-funzioni`.

## Da sapere
- Le intestazioni del modello e quelle lette dall'importazione vengono dallo stesso file (`funzioni-sicurezza.ts`).
- Una classe non presente in archivio non viene mai creata: la riga resta nel reparto predefinito con un avviso.
- Per ATA/Docenti senza valore nella colonna resta il «Reparto predefinito» e il dato si completa da «Da completare».

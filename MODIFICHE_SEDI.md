# Sedi e plessi (rev 13/11/2026)

Stessa Ditta, stesso Datore di Lavoro, stesso RSPP: la formazione è unica, le **squadre di emergenza** si organizzano per sede.

## Regole
- Esiste sempre **una sola sede principale** («Sede Centrale», indirizzo = anagrafica Ditta). Nessun lavoratore e nessun incarico resta senza sede.
- Senza plessi il programma si comporta **come prima**: nessun selettore, nessun pulsante in più, matrice/import/scheda invariati.
- Chi non ha sede (anche inserito da codice vecchio o da import) va alla sede principale: lo garantisce il database (trigger).
- Con più sedi: selettore plesso e «Squadre per sede» nell'Organigramma A3; tavola, titolo, firma e PDF seguono il plesso scelto.
- Eliminando un plesso: i lavoratori tornano alla principale, gli incarichi di quel plesso vengono tolti. La principale non si elimina né si declassa.

## Comportamento dei punti che non conoscono le sedi
- Matrice / scheda / import: **spuntare** = incarico nella sede principale; **togliere** = incarico tolto da tutte le sedi.
- Stampa globale e altre stampe: contano gli incarichi di tutte le sedi (una persona in due sedi compare una volta).

## File
- `drizzle/migrations/0012_sedi_multi_sede.sql` (da lanciare PRIMA del push; idempotente)
- nuovi: `src/lib/api/sedi.ts`, `src/features/impostazioni/ditta/RiquadroSedi.tsx`, `src/features/stampe/components/DialogAssegnaRuoliSede.tsx`, test `organigramma-a3-sedi.test.ts`
- modificati: `src/lib/api/ruoli.ts`, `src/lib/api/index.ts`, `src/features/stampe/organigramma-a3.ts`, `src/features/stampe/components/OrganigrammaA3Page.tsx`, `src/features/impostazioni/DittaTab.tsx`
- snapshot aggiornati (solo la colonna `sede_id` nella select): `src/routes/__snapshots__/dipendenti.flusso…snap`, `hr.flusso…snap`

## Backup completo (rev 2)
Il backup salvava solo 10 tabelle su 19 e leggeva al massimo 1000 righe per tabella. Ora (versione 5) salva **tutte** le tabelle,
comprese sedi, incarichi (`dipendenti_ruoli`), `ruoli_sicurezza`, `modelli_nomina`, `documenti_attestati`, `integrazioni_dvr`,
`coda_valutazioni`, `argomenti_corso`, `note_valutazione`, `opzioni_integrazione`.
- Ripristino nell'ordine delle dipendenze, solo aggiunta/aggiornamento (non cancella nulla); id di sedi/ruoli/lavoratori ricondotti a quelli del database.
- Un errore di ripristino ora nomina la tabella (prima molti errori erano ignorati).
- Backup vecchi (versione ≤ 4) si ripristinano come prima.
- `src/lib/api/backup-copertura.test.ts` fallisce se una tabella nuova delle migrazioni non è nel backup.
- Restano FUORI dal file JSON i file veri degli attestati (bucket «attestati»): vedi sotto.
- Limite noto: i file veri degli attestati (PDF/immagini nel bucket «attestati») non stanno nel JSON; il JSON ha solo i riferimenti (`percorso_file`). Per quelli serve la copia della cartella archivio.

## Correzioni (14/11/2026)
- **Ripristino backup con lavoratori misti**: se il file conteneva lavoratori già presenti nel database insieme a lavoratori mancanti
  (caso tipico: ripristino dopo una cancellazione accidentale), il database rifiutava il blocco («id» nullo) e il ripristino si fermava
  sulla tabella «dipendenti». Ora ogni riga ha l'id (quello del database se la persona esiste, quello del file se manca).
  Provato con la vera `importaDb` su PostgreSQL + PostgREST: ripristino misto, ripetuto due volte (nessun doppione), backup versione 4.
- `backup-copertura.test.ts`: il test sul lavoratore esistente pretendeva «senza id» (cioè il comportamento errato) e ora verifica l'id del database;
  nuovo test sul file con lavoratori presenti e mancanti.

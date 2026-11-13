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

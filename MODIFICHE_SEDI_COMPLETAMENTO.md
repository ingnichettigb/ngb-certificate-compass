# Sedi: completamento (14/11/2026)

Sopra la versione già su `main` (migrazione `0012_sedi_multi_sede.sql`). **Nessuna nuova migrazione**: il database è quello di `main`.

## Cosa aggiunge
- **Nomine per sede**: con più sedi compare il menu «Sede / plesso». I nominati sono gli incarichi di quel plesso (gli attestati restano quelli centrali del lavoratore).
  Firmatario e intestazione restano quelli della ditta. Nuovo segnaposto `{{sede}}` utilizzabile nei testi delle nomine; il plesso va anche nel nome del file.
- **PDF A3**: il nome del plesso compare nella riga di testata, nel titolo del documento PDF e nel nome del file (prima c'era solo l'indirizzo).
  A video e in stampa il nome compare ora anche per la sede principale quando esistono più sedi, così i fogli non sono ambigui.
- **Avviso squadre da completare**: con più sedi, se «primo soccorso» o «antincendio» della sede scelta non hanno addetti, o hanno solo addetti «da formare», compare un avviso (non si stampa).
- **Test rossi sistemati**: il pulsante «Aggiungi plesso» diventa «Crea plesso» (rendeva ambigua la ricerca `/Aggiungi/` nei 4 test di conferma di Impostazioni);
  snapshot di `ImpostazioniDialog.flusso` aggiornato (solo le 30 righe della nuova lettura `sedi`).

## File
- nuovi: `src/features/stampe/copertura-squadre.ts` (+ test), `src/features/nomine/nomine-sedi.test.ts`
- modificati: `NominaPage.tsx`, `documento.ts`, `tipi.ts`, `genera-pdf.ts`, `OrganigrammaA3Page.tsx`, `esporta-organigramma-a3-pdf.ts` (+ test), `RiquadroSedi.tsx`, snapshot Impostazioni

## Limiti noti
- Le voci libere dell'organigramma (registro antincendio, DPI, SDS…) restano uniche per tutta la ditta: compaiono uguali in ogni plesso e nelle nomine di ogni plesso.
- RLS e ASPP sono unici (quelli della ditta). Se servissero per plesso: due colonne in `sedi` e un'altra migrazione.
- Soglie (numero lavoratori, livello antincendio, gruppo di primo soccorso) calcolate ancora a livello ditta.
- Matrice, scheda lavoratore e import: spuntare = incarico nella sede principale; togliere = tolto da tutte le sedi (come già documentato in `MODIFICHE_SEDI.md`).

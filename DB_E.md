# DB E — Stampe: viste «Tutti gli addetti» / «Richiedono formazione» (Fase 1: solo Defibrillatore)

File:       DB_E.md
Percorso:   DB_E.md (radice del deposito)
Data creaz: 22/11/2026
Revisioni:
  rev 1 — 22/11/2026 — Fase 1, carta 13 «Scadenze – defibrillatore (DAE / BLSD)».
  rev 4 — 22/11/2026 — Avviso rosso se il caricamento dei dati fallisce (StampePage rev 16).
  rev 3 — 22/11/2026 — Correzione di getAttestati (relazione ambigua dopo la migrazione 0018).
  rev 2 — 22/11/2026 — Pannello «Controllo addetti» e test del caso reale (19 addetti, 6 da formare).

## Cosa ho fatto
Nella carta 13 ci sono due pulsanti esclusivi, con il componente `Button` (variante `selezione`, `aria-pressed`) e il conteggio dei lavoratori distinti:
- **Tutti gli addetti (N)** — l'intera squadra con incarico DAE.
- **Richiedono formazione (N)** — solo chi ha il corso scaduto, chi non ha nessun corso («Manca», rosso) e chi ha solo l'aggiornamento («Manca corso base»).

Tabella, Stampa, PDF, Excel e CSV seguono la vista attiva (titolo, sottotitolo e nome file riportano «richiedono formazione»). Parte sempre da «Tutti gli addetti». «Tutti / Solo docenti / Solo ATA» resta e si combina con le due viste.

## Regole
- Richiede formazione = almeno una riga del lavoratore è «Scaduto» o «Manca». Gli «In scadenza» (arancione) NON rientrano.
- Entrambe le viste mostrano tutte le righe dei lavoratori scelti (es. Bertuccioli: «Manca corso base» + aggiornamento). I numeri dei pulsanti e il totale «N addetti» contano lavoratori, non righe.
- Le due viste partono da tutte le righe del gruppo, senza il limite dei 12 mesi (nuovo flag `senzaFinestra`, usato solo da questa carta). Gli altri filtri della carta restano com'erano; il test esistente su `finestra: "365"` è invariato.

## File (percorsi identici al deposito)
| File | Stato | Rev |
|---|---|---|
| src/features/stampe/stampa-addetti.ts | NUOVO | 3 |
| src/features/stampe/components/BarraVistaAddetti.tsx | NUOVO | 1 |
| src/features/stampe/stampa-addetti.test.ts | NUOVO | 2 |
| src/features/stampe/stampa-tipi.ts | modificato (campo `senzaFinestra`) | 9 |
| src/features/stampe/stampa-calcolo.ts | modificato (usa `senzaFinestra`) | 10 |
| src/features/stampe/stampe-predefinite.ts | modificato (campo `vistaAddetti`, carta 13) | 10 |
| src/features/stampe/StampePage.tsx | modificato (barra, filtri, titolo, conteggi, controllo, avviso errore) | 16 |
| src/features/stampe/components/PannelloControlloAddetti.tsx | NUOVO | 1 |
| src/features/stampe/stampa-addetti.caso-reale.test.ts | NUOVO | 1 |
| src/lib/api/attestati.ts | modificato (relazione esplicita con tipi_corso, 3 query) | 6 |
| src/routes/__snapshots__/hr.flusso.test.tsx.snap, dipendenti.flusso…snap, scadenze.flusso…snap | aggiornati (testo della query) | — |
| DB_E.md | NUOVO | 4 |

## Causa del «19 su 19» (errore preesistente, non della Fase 1)
La migrazione `0018_decisione_formazione_specifica.sql` ha aggiunto due chiavi esterne da `attestati_caricati` a `tipi_corso(codice)` (`equivalenza_corso_svolto`, `equivalenza_corso_atteso`). Con tre relazioni, la query `tipi_corso(*)` non è più univoca e il backend risponde PGRST201: `getAttestati()` non carica nulla e tutti gli addetti risultano «Manca». Il difetto tocca tutta l'app (anagrafiche, scadenze, HR), non solo le Stampe.
Correzione: `tipi_corso!attestati_caricati_tipo_corso_id_fkey(*)` nelle 3 query di `src/lib/api/attestati.ts`; il risultato resta sotto la chiave `tipi_corso`.
Non verificato: non posso interrogare il tuo database né eseguire i test di interfaccia (mancano pacchetti nel mio ambiente). Verifica che il nome del vincolo esista: `select conname from pg_constraint where conrelid='public.attestati_caricati'::regclass and contype='f';` deve elencare `attestati_caricati_tipo_corso_id_fkey`.

## Verifiche sul database (22/11/2026)
Eseguite sul database reale: 19 addetti, 13 in regola (Bretani e Valenzi «in scadenza»), 6 da formare (Alquati, Bodini, Ferrari, Guernelli, Somenzi scaduti; Bertuccioli «Manca corso base»). Le chiavi esterne di `attestati_caricati` verso `tipi_corso` sono 3: confermata l'ambiguità.
Se il caricamento fallisce, la pagina ora mostra un avviso rosso con il motivo e il pulsante «Riprova», invece di numeri falsi.

## Controllo addetti (sequenza di controllo)
Sotto i due pulsanti c'è un pannello a tendina «Controllo addetti — N nominati, M richiedono formazione» (solo a schermo, non si stampa). Per ogni addetto mostra le righe lette dagli attestati (corso, stato, data corso, scadenza), SÌ/no e il motivo (es. «Scaduto il 04/03/2026 (BLS-BAS-05 del 04/03/2024)», «Manca corso base», «Corso in regola»).
Se «Richiedono formazione» mostra più persone del previsto, il motivo di ciascuna dice quale riga la fa entrare.

## Verifiche
Test della cartella stampe: 181 passati, compreso il caso reale (19 addetti, 6 da formare: Alquati, Bertuccioli, Bodini, Ferrari, Guernelli, Somenzi). Non ho potuto eseguire 7 file di test che richiedono pacchetti non installabili nel mio ambiente (pdf-lib, supabase). Non li ho toccati, ma eseguili tu con `bun run test`. Non ho controllato l'aspetto grafico: guarda la pagina in anteprima Lovable.

## Fase 2 (non inclusa)
Antincendio, Primo soccorso e Privacy: aggiungere `vistaAddetti: true` alla carta e togliere «Scaduti e in scadenza…» da `filtriApplicati`. Le carte Preposti e Privacy vanno verificate: Privacy non ha `soloIncarichi`, quindi «tutti gli addetti» andrebbe definito.

## Push
    cd ngb-certificate-compass
    unzip -o ../ngb-dae-viste-addetti-rev4.zip
    git add -A && git commit -m "Stampe DAE: viste Tutti gli addetti / Richiedono formazione" && git push origin main

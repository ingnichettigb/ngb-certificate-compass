# DB E — Stampe: viste «Tutti gli addetti» / «Richiedono formazione» (Fase 1: solo Defibrillatore)

File:       DB_E.md
Percorso:   DB_E.md (radice del deposito)
Data creaz: 22/11/2026
Revisioni:
  rev 1 — 22/11/2026 — Fase 1, carta 13 «Scadenze – defibrillatore (DAE / BLSD)».

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
| src/features/stampe/stampa-addetti.ts | NUOVO | 2 |
| src/features/stampe/components/BarraVistaAddetti.tsx | NUOVO | 1 |
| src/features/stampe/stampa-addetti.test.ts | NUOVO | 2 |
| src/features/stampe/stampa-tipi.ts | modificato (campo `senzaFinestra`) | 9 |
| src/features/stampe/stampa-calcolo.ts | modificato (usa `senzaFinestra`) | 10 |
| src/features/stampe/stampe-predefinite.ts | modificato (campo `vistaAddetti`, carta 13) | 10 |
| src/features/stampe/StampePage.tsx | modificato (barra, filtri, titolo, conteggi) | 15 |
| DB_E.md | NUOVO | 1 |

## Verifiche
Test della cartella stampe: 180 passati. Non ho potuto eseguire 7 file di test che richiedono pacchetti non installabili nel mio ambiente (pdf-lib, supabase). Non li ho toccati, ma eseguili tu con `bun run test`. Non ho controllato l'aspetto grafico: guarda la pagina in anteprima Lovable.

## Fase 2 (non inclusa)
Antincendio, Primo soccorso e Privacy: aggiungere `vistaAddetti: true` alla carta e togliere «Scaduti e in scadenza…» da `filtriApplicati`. Le carte Preposti e Privacy vanno verificate: Privacy non ha `soloIncarichi`, quindi «tutti gli addetti» andrebbe definito.

## Push
    cd ngb-certificate-compass
    unzip -o ../ngb-dae-viste-addetti-rev1.zip
    git add -A && git commit -m "Stampe DAE: viste Tutti gli addetti / Richiedono formazione" && git push origin main

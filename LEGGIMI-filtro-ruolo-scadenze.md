<!--
File:      LEGGIMI-filtro-ruolo-scadenze.md
Percorso:  radice del progetto ngb-certificate-compass (accanto a package.json)
Revisione: 1 — 28/11/2026 09:11
-->
# Filtro «Ruolo» nella pagina Scadenze — istruzioni

## Come applicare lo zip
1. Estrai lo zip **nella radice del progetto**: le cartelle `src/...` si sovrappongono a quelle esistenti.
2. Conferma la sostituzione dei file già presenti (sono 10, elencati sotto). I 5 nuovi file vengono semplicemente aggiunti.
3. Esegui `npm run dev` (o `bun run dev`) e apri /scadenze. Per i test: `npx vitest run src/features/scadenze src/routes/scadenze`.
4. Se usi Lovable: carica i file su un ramo separato prima di unirli a `main`, poi verifica la pagina.

## Ordine dei menù
Periodo → Reparto → **Ruolo** → Corso → Ricerca.

## File sostituiti (stesso percorso)
- src/features/scadenze/ScadenzePage.tsx — Rev 3
- src/features/scadenze/components/FiltriScadenze.tsx — Rev 3
- src/features/scadenze/components/IntestazioneScadenze.tsx — Rev 3
- src/features/scadenze/components/TabellaScadenze.tsx — Rev 3
- src/features/scadenze/filtri.ts — Rev 5
- src/features/scadenze/hooks/useScadenze.ts — Rev 4
- src/features/scadenze/types.ts — Rev 6
- src/features/scadenze/filtri.test.ts — Rev 3
- src/routes/scadenze.flusso.test.tsx — Rev 3
- src/routes/__snapshots__/scadenze.flusso.test.tsx.snap — rigenerato

## File nuovi
- src/features/scadenze/ruolo-corsi.ts — Rev 1 (legame ruolo → corsi, incarichi assegnati)
- src/features/scadenze/esporta-scadenze.ts — Rev 1 (esportazione Excel/CSV)
- src/features/scadenze/ruolo-corsi.test.ts — Rev 1
- src/features/scadenze/esporta-scadenze.test.ts — Rev 1
- src/routes/scadenze.ruolo.flusso.test.tsx — Rev 1

## Cosa fa
- **Ruolo**: un solo ruolo, preso dal catalogo `ruoli_sicurezza` (Tabella 01). I corsi del ruolo (base e aggiornamento) vengono dalla Tabella 02 (`regole_ruolo_corso`). Se la Tabella 02 è vuota vale il riconoscimento di prima.
- **Incarichi**: con un ruolo scelto compaiono solo le persone con l'incarico realmente assegnato in `dipendenti_ruoli` (o ruolo obbligatorio per tutti). La spunta «Solo incarichi attualmente assegnati» si blocca su attiva.
- **Corso**: propone solo i corsi del ruolo (prima il base, poi gli aggiornamenti) e si azzera cambiando ruolo.
- **Periodo**: nuove voci «Scaduti o in scadenza» (90 gg, 6 mesi, 1 anno) = unione esatta di «Scaduti» e «In scadenza».
- **Ordine con un ruolo scelto**: per persona; per ogni persona prima il corso base, poi gli altri per data. Cliccando una colonna si ordina come sempre.
- **Esporta** (Excel/CSV) e **Stampa**: usano l'elenco così com'è filtrato e ordinato; in stampa spariscono menù e filtri.

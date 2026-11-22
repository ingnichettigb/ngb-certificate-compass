# Punto di verità ruoli ↔ corsi: Fase 5 (decisione dell'operatore sulla formazione specifica diversa)

Data: 2026-11-21

Prerequisiti: Fasi 1-4 pubblicate. **Ordine di pubblicazione: prima si esegue `0018` sul database, poi si fa il push del codice.**

## Idea

Se un lavoratore ha una formazione specifica DIVERSA da quella attesa per il grado di rischio della ditta (es. 12 ore con ditta a rischio medio, atteso 8 ore),
non si accetta da sola: la decisione spetta all'operatore, che la registra con una nota obbligatoria.

## Database (migrazione `0018`): solo colonne, nessuna tabella nuova

Sei colonne su `attestati_caricati`, sull'attestato del corso «diverso»:
`equivalenza_esito` (`accettata`, `integrazione`, `non_valida`), `equivalenza_corso_svolto`, `equivalenza_corso_atteso`, `equivalenza_rischio`, `equivalenza_nota`, `equivalenza_data`.
Il database fa rispettare: sono o tutte vuote o tutte compilate; nota non vuota; esiti e rischi ammessi; i due corsi devono esistere nel catalogo (chiavi esterne per codice).
Idempotente e provata su una copia: rilanciata due volte, rifiuta decisioni incomplete, esiti inventati, note vuote e corsi inesistenti.
`verifica_0018.sql` (sola lettura) controlla il risultato: deve dare TUTTO OK.

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `drizzle/migrations/0018_decisione_formazione_specifica.sql` | nuovo (da eseguire sul database PRIMA del push) |
| `src/features/formazione-valutazione/decisioni.ts` (+ `.test.ts`) | nuovo (regole: decisione valida, errori, dati da salvare) |
| `src/features/formazione-valutazione/elenco.ts` (+ `.test.ts`) | nuovo (elenco «da valutare» e «decise») |
| `src/features/formazione-valutazione/useFormazioneDaValutare.ts` | nuovo (dati con le cache della pagina Dipendenti) |
| `src/features/formazione-valutazione/RigaDaValutare.tsx` | nuovo |
| `src/features/formazione-valutazione/DialogFormazioneDaValutare.tsx` (+ `.test.tsx`) | nuovo (la finestra) |
| `src/features/dipendenti/formazione-lavoratore.ts` (+ `.test.ts`) | sostituisce (tiene conto delle decisioni) |
| `src/features/dipendenti/components/IntestazioneDipendenti.tsx` | sostituisce (bottone «Formazione da valutare» con contatore) |
| `src/lib/api/attestati.ts` | sostituisce (campi della decisione; `salvaEquivalenzaAttestato`) |

## Come funziona

- Pagina **Dipendenti** → bottone **«Formazione da valutare»** (con il numero dei lavoratori in attesa).
- **Da valutare**: per ogni lavoratore in forza si vede il corso che ha, il rischio della ditta e il corso atteso. Tre scelte, con nota obbligatoria:
  **Accettata come equivalente** (vale come completa), **Serve integrazione**, **Non valida**. Il pulsante «Salva decisione» resta spento finché mancano scelta e nota.
- **Decise**: le decisioni prese, con nota e data, e **«Annulla decisione»** (torna da valutare).
- **La decisione decade da sola** se cambia il grado di rischio della ditta, il corso atteso o il corso dell'attestato: il lavoratore torna da valutare.
- Senza grado di rischio della ditta la finestra lo dice e non propone decisioni. Se la ditta non è mai stata salvata, l'app usa «medio» come già fa la scheda Ditta.
- **Esiti per il prerequisito Lavoratore** (usato dalle attrezzature, Fase 6): accettata = completo; integrazione e non valida = non completo; senza decisione = «diversa», non completo.
- Un attestato **non approvato** o un lavoratore **cessato** non entra nell'elenco. Il backup (legge tutte le colonne) include le decisioni.

## Controllo

- Tipi: OK. ESLint: nessun errore oltre alla formattazione `prettier` già presente.
- Test nuovi o ampliati: 46, tutti passati (decisioni, elenco, formazione lavoratore con le decisioni, finestra con finto database).
- Suite completa: nessun nuovo fallimento rispetto alla tua versione pubblicata (restano i file con istantanee a data fissa, non toccati).
- Non provato nel browser: **controllalo dopo il push** (vedi sotto).

## Da controllare nel browser dopo il push

1. Dipendenti → «Formazione da valutare»: con un lavoratore che ha un'altra specifica rispetto al rischio della ditta, compare in «Da valutare».
2. Prova una decisione di prova su di lui, poi «Annulla decisione».
3. Cambia il «Grado di Rischio Aziendale» nella scheda Ditta: la decisione presa decade.

## Non incluso (fasi successive)

- Attrezzature in Matrice e Scadenze con stato «in attesa formazione lavoratore» (Fase 6), maschera di aggancio (Fase 7), `NOT NULL` sui codici (Fase 8).
- Un corso di integrazione dedicato (forse `SIC-SPI-04`): oggi «Serve integrazione» è solo un esito registrato.

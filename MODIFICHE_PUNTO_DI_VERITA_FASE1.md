# Punto di verità ruoli ↔ corsi: Fase 1 (ruoli per codice, stop ai ruoli doppi)

Data: 2026-11-21

Prerequisito: la migrazione `0017` è già stata eseguita sul database (verifica: 27 controlli su 27 OK, 307 assegnazioni intatte).
Questo zip contiene il codice che ne trae vantaggio. Non tocca la Tabella 02 e le sue pagine (Fasi 2 e 3).

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `drizzle/migrations/0017_punto_di_verita_ruoli_corsi.sql` | nuovo (già eseguita sul DB: serve per tenere la storia nel repo) |
| `src/lib/api/codici-ruoli.ts` | nuovo (codici stabili, `trovaRuoloPerCodice`, codice ruolo delle attrezzature) |
| `src/lib/api/codici-ruoli.test.ts` | nuovo |
| `src/lib/api/index.ts` | sostituisce (esporta codici-ruoli) |
| `src/lib/api/ruoli.ts` | sostituisce (`RuoloSicurezza` con `codice`/`tipo`/`richiede`; `aggiungiRuolo` e `creaRuoloSicurezza` accettano il codice) |
| `src/features/dipendenti/matrice/mappatura-ruoli-corsi.ts` | sostituisce (ricerca per codice senza cast; attrezzature mai sul Lavoratore) |
| `src/features/dipendenti/matrice/mappatura-ruoli-corsi.test.ts` | nuovo |
| `src/features/dipendenti/components/SelettoreCorsiDipendente.tsx` | sostituisce (niente più ruoli creati col nome del corso) |
| `src/features/dipendenti/import-elenco/funzioni-sicurezza.ts` | sostituisce (ogni funzione ha il codice del ruolo) |
| `src/features/dipendenti/import-elenco/funzioni-sicurezza.test.ts` | nuovo |
| `src/features/dipendenti/import-elenco/ruoli-nuovi-ingressi.ts` | sostituisce (Lavoratore per codice) |
| `src/components/BackupBar.tsx` | sostituisce (avviso se il backup resta in attesa) |

## Cosa cambia

**1. Il ruolo di un corso si trova per codice, mai per nome.**
Nella scheda lavoratore, `SelettoreCorsiDipendente` cercava il ruolo con «nome ruolo = nome corso». Dopo la bonifica dei 12 ruoli ufficiali
non coincidono più: l'obbligo risultava sempre assente e, spuntando un corso, **veniva creato un nuovo ruolo col nome del corso** (si ricreavano i
ruoli spazzatura). Ora usa `trovaRuoloPerCorso` (codice). Se un corso non ha un ruolo, compare un messaggio che rimanda alla Tabella 02 e
non si crea nulla. Anche aggiungere un corso al catalogo non crea più un ruolo; il **codice scritto nel dialogo ora viene salvato** (prima si perdeva).

**2. Attrezzature: mai più obbligatorie per tutti.**
I corsi `LAV-…` non avevano un prefisso noto e il ripiego «Sicurezza lavoratori» li legava al ruolo Lavoratore (obbligatorio per tutti), quindi la Matrice
li avrebbe chiesti a ogni lavoratore. Ora un corso `LAV-…` va solo al suo ruolo `OPER_…` (stesso codice, `LAV-` → `OPER_`, `-` → `_`, senza `-AGG`);
se il ruolo non esiste o è disattivato, **nessun ruolo = nessun obbligo**. Regola di transizione: nella Fase 2 la fonte diventa la Tabella 02.

**3. Import elenco (le X): ruoli trovati per codice.**
Ogni funzione ha il codice del ruolo (`PREPOSTO`, `ADD_ANTINCENDIO`, `ADD_PRIMO_SOCCORSO`, `ADD_DAE`, `ADD_EVACUAZIONE`, `INC_PRIVACY`). Se un ruolo viene rinominato,
l'import non ne crea più un doppione. Per nome si cerca solo se il codice manca. Un ruolo creato dall'import nasce col suo codice.
Il ruolo Lavoratore dei nuovi ingressi si trova per codice `LAVORATORE`. Il ruolo «specifica medio» non esiste più tra i 12 ruoli: l'assegnazione è un
no-op (la formazione specifica dipenderà dal rischio della ditta, Fase 4).

**4. Tipi.** `RuoloSicurezza` ha `codice`, `tipo`, `richiede` (opzionali nel tipo, sempre presenti nel DB): tolti i cast manuali.

**5. Backup.** Se «Salva DB su cartella» resta in attesa oltre 8 secondi compare un avviso con cosa controllare (permesso della cartella).

## Controllo

- Tipi dei file non di test: OK.
- Test nuovi: 19, tutti passati (per codice, ruolo rinominato, attrezzature, import).
- Suite completa: stessi file falliti prima e dopo le modifiche (nessuna regressione; i fallimenti dipendono dall'ambiente di prova: librerie di interfaccia e `xlsx`).
- ESLint: nessun errore oltre alla formattazione `prettier` già presente nei file toccati.

## Attenzione

- Le colonne `codice` di ruoli e corsi **non sono ancora obbligatorie** (`NOT NULL`): oggi si possono ancora creare ruoli senza codice dalle Impostazioni. Il vincolo arriva in Fase 8.
- Finché non c'è la Fase 3, aggiungere o modificare righe della Tabella 02 dalla pagina dà errore (serve `ruolo_codice`). Lo stesso per il campo «Richiede» della Tabella 01 (ora è un codice).
- Un corso nuovo creato dal selettore non è obbligatorio per nessuno finché non lo si collega a un ruolo nella Tabella 02.

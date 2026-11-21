# Punto di verità ruoli ↔ corsi: Fase 2 (il codice legge la Tabella 02)

Data: 2026-11-21

Prerequisiti: migrazione `0017` eseguita (Tabella 02 con `ruolo_codice` e chiavi esterne) e Fase 1 pubblicata.

## Idea

Da quale ruolo dipende un corso lo decide **solo la Tabella 02** (`regole_ruolo_corso`), per codice di ruolo e codice di corso.
Prima ogni schermata lo ricostruiva per conto suo: prefissi dei codici, nomi dei ruoli, parole nel nome del corso.

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/lib/api/regole-ruolo-corso.ts` | nuovo (tipo `RegolaRuoloCorso`, `getRegoleRuoloCorso`, chiave cache) |
| `src/lib/api/index.ts` | sostituisce (esporta il nuovo modulo) |
| `src/features/dipendenti/matrice/regole-ruolo-corso.ts` | nuovo (mappe corso→ruolo e ruolo→corsi, funzioni pure) |
| `src/features/dipendenti/matrice/useRegoleRuoloCorso.ts` | nuovo (hook con cache condivisa) |
| `src/features/dipendenti/matrice/mappatura-ruoli-corsi.ts` | sostituisce (usa la Tabella 02; gruppo per codice) |
| `src/features/dipendenti/matrice/useDatiMatrice.ts` | sostituisce |
| `src/features/dipendenti/matrice/MatriceAbilitazioniRuoli.tsx` | sostituisce |
| `src/features/dipendenti/matrice/RigaLavoratoreMatrice.tsx` | sostituisce |
| `src/features/dipendenti/components/SelettoreCorsiDipendente.tsx` | sostituisce |
| `src/features/scadenze/filtri.ts` | sostituisce |
| `src/features/scadenze/hooks/useScadenze.ts` | sostituisce |
| `src/features/stampe/stampa-selezioni.ts` | sostituisce (`voceDelRuolo` per codice) |
| test nuovi | `regole-ruolo-corso.test.ts`, `mappatura-ruoli-corsi.test.ts` (ampliato), `stampa-selezioni.test.ts` |

## Come si comporta

- **Tabella 02 caricata e non vuota**: il ruolo di un corso è quello che la tabella indica per il suo codice (base o aggiornamento).
  Un corso che nessuna regola cita **non è obbligatorio per nessuno**. Se il ruolo indicato è disattivato, nessun ruolo.
- **Tabella 02 non ancora caricata, vuota o lettura fallita**: vale il riconoscimento di prima (prefissi, regola `LAV-` → `OPER_`, nomi).
  La schermata non si rompe e non lampeggia con dati sbagliati mentre carica.
- **Ruolo di un gruppo** (`trovaRuoloPerChiaveGruppo`) e **voci delle stampe** (`voceDelRuolo`): prima per codice, per nome solo se il codice manca.
- La cache della tabella si rinfresca ogni 60 secondi e al ritorno sulla finestra. La Fase 3 la invaliderà subito quando si modifica la Tabella 02 dalla pagina.

## Effetti visibili da controllare dopo il push

1. **Matrice abilitazioni**: le attrezzature compaiono come obbligatorie solo a chi ha il ruolo `OPER_…` assegnato; cliccando la casella di un'attrezzatura si assegna quel ruolo.
2. **Corsi fuori dalla Tabella 02** (oggi `COVID19-02` e `SIC-SPI-04`): non risultano più obbligatori per nessuno.
   Prima `SIC-SPI-04` finiva sul ruolo Lavoratore per un ripiego. Va collegato alla Tabella 02 o gestito nella Fase 5 (decisione dell'operatore).
3. **Formazione specifica del Lavoratore**: `SIC-SPE-04`, `-08` e `-12` sono tutti nelle regole del ruolo Lavoratore, quindi restano tutti obbligatori per tutti,
   come prima. Sceglierne uno solo in base al rischio della ditta è la Fase 4.
4. **Scadenze → «Solo incarichi attualmente assegnati»**: un corso senza ruolo resta visibile (come prima).

## Controllo

- Tipi dei file non di test: OK. ESLint: nessun errore oltre alla formattazione `prettier` già presente.
- Test nuovi o ampliati: 34, tutti passati. Suite completa: stessi file falliti prima e dopo (dipendono dall'ambiente di prova: librerie di interfaccia e `xlsx`).
- Non provato nel browser: i test di interfaccia non girano nel mio ambiente. Dopo il push controlla la Matrice e la scheda di un lavoratore.

## Non incluso (fasi successive)

- Pagina Tabelle di raccordo con selettori e invalidazione immediata della cache (Fase 3).
- Scelta della formazione specifica in base a `rischio_ditta` e prerequisito Lavoratore (Fase 4), decisione dell'operatore (Fase 5), attrezzature in Matrice e Scadenze (Fase 6).

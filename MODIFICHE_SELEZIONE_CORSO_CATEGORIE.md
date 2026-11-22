# Elenco corsi con categorie (Postazione operatore, Aggiungi attestato PDF, Modifica attestato)

File:       MODIFICHE_SELEZIONE_CORSO_CATEGORIE.md
Percorso:   MODIFICHE_SELEZIONE_CORSO_CATEGORIE.md (radice del deposito)
Data creaz: 22/11/2026
Revisioni:
  rev 1 — 22/11/2026 — Prima versione.

## Cosa cambia
La finestra «Seleziona corso…» ora ha in alto i pulsanti delle categorie che filtrano l'elenco, una casella di ricerca (codice o nome) e questo ordine:
**ultimo corso scelto** → **tutti i corsi** → **tutti gli aggiornamenti** (ogni gruppo in ordine di codice).
Ogni riga mostra codice, nome e ore come prima. Si possono accendere più categorie insieme (due categorie = i corsi di entrambe); «Tutte» le spegne.
L'ultimo corso e le ultime categorie scelte sono ricordati in questo browser (se la memoria del browser non c'è, si parte da «Tutte»).
Resta tutto il resto: ore proposte dal corso, codice e nome del corso, riconoscimento dal Codice Fiscale, salvataggio, ricalcolo scadenza, voce «Altro (corso fuori catalogo)».

## Da dove vengono le categorie (solo database, nessun elenco nel codice)
- **Categoria di un corso** = `tipi_corso.macro_categoria`, tranne i corsi collegati nella Tabella 02 (`regole_ruolo_corso`) a un ruolo della categoria «Attrezzature» (i 40 corsi `LAV-…`): vanno in **Attrezzature** e non in «Sicurezza Lavoratori».
- **Corso abilitato per la Ditta** = collegato ad almeno un ruolo attivo (`ruoli_sicurezza.attivo`). Un corso senza ruolo collegato (COVID19-02, SIC-SPI-04) resta abilitato. Se un ruolo viene disattivato i suoi corsi spariscono dall'elenco e dai pulsanti.
- **Aggiornamento** = livello «Aggiornamento», oppure codice con «AGG», oppure nome con «aggiornamento» (copre anche EME-EAA-02 e i PRIVACY-A01/A02, che hanno livello «Base»).
- Ordine dei pulsanti: alfabetico. Le varianti di maiuscole («Privacy» / «PRIVACY») sono una sola categoria.
- Se la lettura di ruoli o Tabella 02 fallisce, l'elenco usa la categoria scritta sul corso e mostra tutti i corsi (nessun blocco).
- Nessuna migrazione, nessuna colonna nuova, nessun SQL da eseguire.

Con il catalogo del 22/11/2026 i pulsanti sono: Antincendio (6), Attrezzature (40), COVID (1), Defibrillatore (2), Emergenze (3), Preposto (3), PRIVACY (3), Primo Soccorso (4), Sicurezza Lavoratori (26).

## File (percorsi identici al deposito)
| Nome file | Percorso | Stato | Rev | Data |
|---|---|---|---|---|
| categorie-corso.ts | src/features/selezione-corso/categorie-corso.ts | NUOVO | 1 | 22/11/2026 |
| categorie-corso.test.ts | src/features/selezione-corso/categorie-corso.test.ts | NUOVO | 1 | 22/11/2026 |
| memoria-selezione.ts | src/features/selezione-corso/memoria-selezione.ts | NUOVO | 1 | 22/11/2026 |
| useLegamiCorsi.ts | src/features/selezione-corso/useLegamiCorsi.ts | NUOVO | 1 | 22/11/2026 |
| SelettoreCorso.tsx | src/features/selezione-corso/SelettoreCorso.tsx | NUOVO | 1 | 22/11/2026 |
| ModuloDati.tsx | src/features/operatore/components/ModuloDati.tsx | modificato (campo «Corso identificato») | 6 | 22/11/2026 |
| ModuloDati.cf-ore.test.tsx | src/features/operatore/components/ModuloDati.cf-ore.test.tsx | modificato (scelta corso + 4 test nuovi) | 2 | 22/11/2026 |
| OperatorePage.tsx | src/features/operatore/OperatorePage.tsx | modificato (passa i legami) | 2 | 22/11/2026 |
| DialogCaricamento.tsx | src/features/documenti/DialogCaricamento.tsx | modificato (campo «Tipo di attestato») | 4 | 22/11/2026 |
| DialogModificaAttestato.tsx | src/features/dipendenti/components/DialogModificaAttestato.tsx | modificato (campo «Tipo di corso») | 2 | 22/11/2026 |
| operatore.flusso.test.tsx.snap | src/features/operatore/__snapshots__/operatore.flusso.test.tsx.snap | aggiornato (la pagina legge anche ruoli e Tabella 02: solo righe aggiunte) | — | 22/11/2026 |
| MODIFICHE_SELEZIONE_CORSO_CATEGORIE.md | MODIFICHE_SELEZIONE_CORSO_CATEGORIE.md | NUOVO | 1 | 22/11/2026 |

## Verifiche
- Test: selezione-corso (13) + componenti operatore (24) = 37 passati, compresi i 4 nuovi sul modulo (categorie in ordine alfabetico, filtro con una o due categorie, ricerca, ultimo scelto per primo).
- `tsc`: nessun errore nei file toccati. `eslint`: file nuovi puliti; nei file esistenti restano solo gli avvisi che c'erano già (stile e `any`).
- Test di flusso dell'operatore: passa con lo snapshot aggiornato (0 righe tolte, solo le due nuove letture).
- Non verificato: l'aspetto grafico (guardalo nell'anteprima Lovable) e 3 file di test che richiedono il pacchetto `xlsx` (non installabile nel mio ambiente). `DocumentiAttestati.flusso.test.tsx` era già rosso prima di questa modifica e non l'ho toccato.

## Push
    cd ngb-certificate-compass
    unzip -o ../ngb-selezione-corso-categorie-rev1.zip
    git add -A && git commit -m "Elenco corsi con categorie dal database, ricerca, ultimo scelto e aggiornamenti in fondo" && git push origin main

# Punto di verità ruoli ↔ corsi: Fase 6 (attrezzature: scadenze, stato del corso e «in attesa»)

Data: 2026-11-23

Prerequisiti: Fasi 1-5 e 7 pubblicate. **Nessuna modifica al database**: solo codice.
Questa fase è stata riallineata al deposito del 23/11 (commit fino a `fabbad9`) prima di consegnarla: vedi «Cosa non tocca».

## Cosa non andava

1. **Le scadenze delle attrezzature si mescolavano.** Il ciclo di scadenza è «lavoratore + macro-categoria». Le attrezzature (corsi `LAV-…`) condividono la macro-categoria del catalogo
   (con le altre del lavoratore, o tutte insieme se è stata cambiata): carriponte, PLE e muletto dello stesso lavoratore stavano in **un solo ciclo** e si estendevano a vicenda la validità.
2. **Lo stato di un corso si riconosceva anche per nome.** Il corso base e il suo aggiornamento hanno lo stesso nome: con solo il base svolto, l'aggiornamento risultava «valido»
   (verificato con una prova). Lo stesso per PLE/PLES, GRUMFF/GRUMFT, ecc. L'aggiornamento di un'attrezzatura guardava inoltre tutta la macro-categoria.
3. **Nessuna indicazione del prerequisito.** Chi non ha ancora la formazione Lavoratore vedeva l'attrezzatura «da svolgere» (giallo), come se fosse un ritardo.

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/scadenze/raggruppa.ts` (+ `raggruppa.attrezzature.test.ts`) | sostituisce / nuovo (un ciclo per ogni attrezzatura) |
| `src/features/dipendenti/stato-fabbisogno.ts` (+ `.test.ts`) | sostituisce / nuovo (codice, famiglia per attrezzatura, stato «in attesa») |
| `src/features/dipendenti/formazione-lavoratore.ts` (+ `.test.ts`) | sostituisce (valutazione per lavoratore e motivo d'attesa) |
| `src/features/dipendenti/matrice/useDatiMatrice.ts` | sostituisce |
| `src/features/dipendenti/matrice/MatriceAbilitazioniRuoli.tsx` | sostituisce |
| `src/features/dipendenti/matrice/RigaLavoratoreMatrice.tsx` (+ `.test.tsx`) | sostituisce / nuovo (casella «in attesa») |
| `src/features/dipendenti/components/SelettoreCorsiDipendente.tsx` | sostituisce (badge «in attesa») |
| `verifica_attrezzature_corsi.sql` | nuovo (controllo dei dati del catalogo, sola lettura) |

Verificato prima di consegnare: i sette file sorgente **non sono cambiati nel deposito** dopo la mia ultima lettura (nessun lavoro altrui sovrascritto); `formazione-lavoratore.test.ts` pure.

## Cosa non tocca (già deciso da altri lavori nel deposito)

- **Gruppi dei corsi**: `tipi-raggruppamento.ts` ha già il gruppo «Cantieri» (codici `LAV-`, ordine 11) e la legenda 10 «DL - Dir - ASPP - RSPP». Anche la selezione dei corsi (`categorie-corso.ts`) mette i corsi `LAV-…`
  in «Attrezzature» in base ai ruoli collegati nella Tabella 02. Avevo preparato un gruppo «Attrezzature» in `tipi-raggruppamento.ts`, **ritirato** perché si sovrapponeva (indici e ordini 10/11): non è in questo zip.
  L'elenco attestati della scheda (`ordine-gruppi-attestati.ts`) mette i gruppi sconosciuti, come «cantieri», nella posizione di «Altro»: non l'ho cambiato.
- **Ruoli DL e DL_RSPP** e catalogo REV01: nessuna interferenza (`mappatura-ruoli-corsi.ts` è cambiato per i prefissi `DL-`, non lo tocco).

## Cosa cambia

**Un ciclo per ogni attrezzatura.** Il corso base e il suo aggiornamento (`-AGG`) stanno nello stesso gruppo; carriponte, PLE ecc. e la formazione del Lavoratore sono gruppi separati.
L'aggiornamento della formazione Lavoratore, o di un'altra attrezzatura, non prolunga più la scadenza del carriponte. Vale in Scadenze, scheda lavoratore e stampe (stesso motore).

**Stato del corso per codice.** Con i codici da entrambe le parti conta solo il codice (il nome resta come ripiego solo per i corsi senza codice). L'aggiornamento di un'attrezzatura guarda solo quell'attrezzatura;
l'aggiornamento della formazione Lavoratore non guarda più le attrezzature. Con solo il corso base svolto, l'aggiornamento risulta «in corso» (da fare entro la scadenza), non «valido».

**«In attesa della formazione Lavoratore».** Se il ruolo dell'attrezzatura «richiede LAVORATORE» e il lavoratore non ha completato la formazione Lavoratore (corso base e specifica del rischio della ditta,
con la decisione dell'operatore della Fase 5), un corso **mai svolto** risulta «in attesa», non «da svolgere»:
- **Matrice**: casella grigia con «…» (il suggerimento spiega cosa manca), al posto del «!» giallo.
- **Scheda lavoratore → corsi**: badge grigio con l'orologio e la scritta «in attesa».
Un corso già svolto, o scaduto, mostra il suo stato reale: l'attesa non lo nasconde.

## Dati da controllare prima del push

Il motore delle scadenze legge dal catalogo corsi: livello (**Base** per il corso base, altro per l'aggiornamento), **durata di validità** del base (di norma 5 anni) e **ore** dell'aggiornamento (di norma 4).
Se mancano, il ciclo non si calcola bene. Esegui `verifica_attrezzature_corsi.sql`: ogni corso `LAV-…` ha una riga con le **anomalie** in chiaro (es. «durata di validità mancante», «l'aggiornamento ha livello Base»).
Mandami il risultato: se serve, preparo l'SQL di correzione.

## Controllo

- Tipi: OK sopra la versione attuale del deposito. Test nuovi: 26 (cicli 7, stato del corso 11, casella della Matrice 3, formazione lavoratore 5); i 4 file interessati passano in tutto con 45 test.
- Con la vecchia versione dei file, i test sui cicli (5 su 7) e sullo stato del corso (5 su 11) **falliscono**: provano il difetto, non solo la correzione.
- Suite completa: confronto con il deposito senza le mie modifiche nel messaggio di consegna.
- Non provato nel browser: **controllalo dopo il push** (vedi sotto).

## Da controllare nel browser dopo il push

1. Un lavoratore con un ruolo `OPER_…` e senza formazione Lavoratore completa: la casella dell'attrezzatura in Matrice è grigia con «…» e il suggerimento spiega cosa manca.
2. Scheda lavoratore: i corsi dell'attrezzatura mostrano «in attesa» in grigio; con un attestato presente, lo stato reale.
3. Scadenze: l'attrezzatura di un lavoratore ha una scadenza propria, non influenzata dagli aggiornamenti Lavoratore.

## Non incluso

- La pagina Scadenze elenca attestati esistenti, non i corsi mancanti: lo stato «in attesa» riguarda i corsi non ancora svolti, quindi si vede in Matrice e scheda lavoratore.
- Fase 8 (`NOT NULL` sui codici, pulizia) e un'eventuale correzione dei dati dei corsi `LAV-…` dopo il tuo controllo.

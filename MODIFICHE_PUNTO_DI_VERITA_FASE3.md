# Punto di verità ruoli ↔ corsi: Fase 3 (pagina Tabelle di raccordo con selettori)

Data: 2026-11-21

Prerequisiti: migrazione `0017` eseguita, Fasi 1 e 2 pubblicate.
Con questa fase la Tabella 02 si può **di nuovo modificare dalla pagina** (era l'avviso delle fasi precedenti).

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/tabelle-raccordo/definizioni.ts` | sostituisce (colonne «riferimento»; Tabella 01 e 02 aggiornate) |
| `src/features/tabelle-raccordo/TabellaRaccordo.tsx` | sostituisce (selettori, codice bloccato, aggiornamento delle altre schermate) |
| `src/features/tabelle-raccordo/riferimenti.ts` | nuovo (elenchi di ruoli e corsi: si vede il nome, si salva il codice) |
| `src/features/tabelle-raccordo/messaggi-raccordo.ts` | nuovo (errori del database in italiano; controllo dei codici) |
| `src/features/tabelle-raccordo/riferimenti.test.ts` | nuovo |
| `src/features/tabelle-raccordo/TabelleRaccordoRiferimenti.test.tsx` | nuovo (pagina: selettori, codice, blocchi) |
| `src/features/tabelle-raccordo/esporta-raccordo.test.ts` | sostituisce (allineato alle definizioni attuali: 2 test erano già falliti prima) |

## Cosa cambia

**Tabella 02 (Regole ruolo → corso)**
- «Ruolo» è un elenco dei ruoli (si legge «Nome (CODICE)», si salva `ruolo_codice`). «Corso base» e «Aggiornamento» sono elenchi dei corsi del catalogo («CODICE – nome»).
  Non si possono più scrivere nomi a mano: la chiave esterna del database li rifiuterebbe.
- La spunta esclusiva ora è per coppia `ruolo_codice` + `parametro`.
- «Duplica» aggiunge « (copia)» al valore: senza, la regola uguale verrebbe rifiutata dall'indice anti-doppioni.
- La cella e la ricerca usano il nome del ruolo e del corso, quindi si cerca per nome o per codice.

**Tabella 01 (Ruoli di sicurezza)**
- **Codice**: obbligatorio, portato in maiuscolo, solo lettere, numeri e trattino basso (es. `ADD_DAE`). Una volta assegnato **non si cambia più** (è la chiave
  stabile): il campo è disabilitato in modifica. Un ruolo senza codice (per esempio una copia) lo si può completare.
- **Richiede**: elenco dei ruoli (si salva il codice; il ruolo stesso non viene offerto).
- **Cancellazione bloccata**, con spiegazione, se il ruolo ha assegnazioni (come prima), **regole nella Tabella 02** o è richiesto da altri ruoli.

**Dopo ogni salvataggio, aggiunta, duplicazione, cancellazione o spunta** si aggiornano anche le letture usate da Matrice, Scadenze e scheda lavoratore
(ruoli e regole): non serve più ricaricare la pagina per vedere una regola nuova.

**Errori del database in italiano**: «Esiste già un record uguale», «Il ruolo o il corso indicato non esiste…» al posto del testo tecnico.

**Esportazione Excel/CSV**: le colonne «riferimento» si esportano con il **codice** (la chiave stabile), non con il nome.

## Controllo

- Tipi del progetto (test compresi): OK. ESLint: nessun errore oltre alla formattazione `prettier` già presente.
- Pagina Tabelle di raccordo: 41 test, tutti passati (14 esistenti + 27 nuovi o riallineati). I menu a tendina Radix sono sostituiti da elenchi semplici nei nuovi test (in jsdom non si aprono): **provali nel browser**.
- Suite completa: rispetto alla tua versione pubblicata l'unica differenza sono i 2 test di esportazione riallineati. Altri **10 file di test falliscono uguale con e senza le mie modifiche** (verificato anche sulla versione precedente alle mie fasi): sono istantanee registrate con una data fissa (es. `2026-10-20`) e falliscono con la data di oggi. Non li ho toccati.

## Da controllare nel browser dopo il push

1. Impostazioni generali → Tabelle di raccordo → **02**: le righe mostrano nomi di ruolo e corso. «Aggiungi» una regola di prova, controlla che compaia subito nella Matrice, poi cancellala.
2. **01**: apri un ruolo esistente: il codice è grigio. Aggiungi un ruolo con codice minuscolo e controlla che si salvi maiuscolo.
3. Prova a cancellare «Lavoratore» o un ruolo `OPER_…`: deve rifiutare spiegando perché.

## Non incluso (fasi successive)

- Formazione specifica in base a `rischio_ditta` e prerequisito Lavoratore (Fase 4), decisione dell'operatore (Fase 5), attrezzature in Matrice e Scadenze (Fase 6),
  maschera di aggancio (Fase 7), vincoli `NOT NULL` sui codici (Fase 8).

# Punto di verità ruoli ↔ corsi: Fase 7 (maschera «Aggancia attestato come allegato»)

Data: 2026-11-22

Prerequisiti: Fasi 1-5 pubblicate. **Nessuna modifica al database**: si pubblica solo il codice.

## Cosa non andava

1. **Il corso era identificato per nome.** Il corso base e il suo aggiornamento hanno lo stesso nome (vale per tutte le 20 attrezzature, e per PLE/PLES,
   GRUMFF/GRUMFT, GRUTRA/GRUTRB, ESCAVTTA/ESCAVTTC): scegliendo l'aggiornamento restava selezionato il primo con quel nome, con codice e scadenza sbagliati.
2. **I nomi dei file collidevano.** Il nome file contiene il nome del corso: base e aggiornamento dello stesso mese si sovrascrivevano (`upsert: true`).
3. **La maschera non proponeva nessun corso**: si sceglieva sempre a mano. L'unico riconoscimento per nome era un dizionario nome→codice, ormai inutile perché tutti i corsi hanno il codice.

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/dipendenti/aggancia-allegato/proposta-corso.ts` (+ `.test.ts`) | nuovo (corso dal nome del file, corsi proposti dai ruoli, etichetta senza collisioni) |
| `src/features/dipendenti/aggancia-allegato/ZonaLavoratore.tsx` (+ `.test.tsx`) | sostituisce (scelta per identificativo, proposte; tolto il dizionario dei nomi) |
| `src/features/dipendenti/aggancia-allegato/SchermoAgganciaAllegato.tsx` | sostituisce |
| `src/features/dipendenti/matrice/condizioni-regole.ts` | sostituisce (aggiunge `regolaDecisa`) |

## Cosa cambia

**Scelta per identificativo.** Il menu lavora sull'id del corso: base e aggiornamento sono distinti, con il loro codice e i loro anni di validità per la scadenza.
Se più corsi hanno lo stesso nome, il documento e il nome file portano il codice: «Carriponte (CP) CABINA [LAV-CAR-CP-II-8311-AGG]». I corsi con nome unico restano come prima.
I documenti già agganciati non cambiano.

**Corso proposto dal nome del file.** Scegliendo un file, se il suo nome contiene il **codice** di un corso (es. `…_SIC_SPE_08.pdf`) il corso si seleziona e compare «Proposto dal codice nel nome del file».
Vince il codice più lungo (`…-AGG` non si scambia con il corso base). Il nome del corso vale solo se appartiene a un corso solo. Se è ambiguo non si propone nulla.
**Una scelta fatta a mano non viene mai scavalcata**; cambiando file, la proposta si aggiorna finché non si sceglie a mano. Se la data del corso è già scritta, la scadenza si calcola con il corso proposto.

**Corsi proposti dai ruoli del lavoratore.** Sotto il menu compaiono fino a 6 scorciatoie: i corsi che la Tabella 02 prevede per i suoi ruoli (quello per tutti più quelli assegnati)
e che **non risultano svolti** («da svolgere») o hanno l'ultima evidenza **scaduta** («scaduto il …», si propone l'aggiornamento se la regola lo ha). Per ogni regola conta l'attestato più recente
tra corso base e aggiornamento. Un clic sceglie il corso. Funziona con i ruoli rinominati, perché passa dai codici.

**Dove si propone e dove no.** Solo dove la Tabella 02 dà una risposta sicura: parametro «nessuno» (es. Lavoratore, Preposto, DAE, evacuazione, attrezzature) e «rischio ATECO» (la specifica del Lavoratore).
Per livello antincendio, gruppo primo soccorso, fascia RLS, settore e modulo ASPP/RSPP, e per le tre righe extra (`integrazione`, `prova`, `variante`), non si propone nulla: servono dati
che il programma non ha. Quei corsi restano nel menu completo.

## Controllo

- Tipi: OK. ESLint: nessun errore oltre alla formattazione `prettier` già presente.
- Test nuovi: 31 (logica di proposta e maschera con finto database), tutti passati. Suite completa: 955 passati, **nessun nuovo fallimento** (restano i 9 file con istantanee a data fissa, non toccati).
- Non provato nel browser: **controllalo dopo il push** (vedi sotto). I menu Radix nei test sono sostituiti da elenchi semplici.

## Da controllare nel browser dopo il push

1. Scheda lavoratore → «Aggancia attestato»: sotto il menu compaiono i corsi proposti dai suoi ruoli.
2. Scegli un file il cui nome contiene un codice corso (es. `…_SIC_SPE_08.pdf`): il corso si seleziona e compare la riga «Proposto dal codice…».
3. Con un'attrezzatura: scegli prima l'aggiornamento (`-AGG`), poi il corso base: codice e scadenza devono cambiare di conseguenza.

## Trovato lungo la strada (non incluso: Fase 6)

Nella Matrice, `valutaStatoFabbisognoCorso` riconosce il corso svolto anche per **nome**: se il lavoratore ha solo il corso base, l'aggiornamento (stesso nome) risulta «valido».
Verificato con una prova: «Attestato valido fino al …» per l'aggiornamento con solo il base svolto. Per i corsi di aggiornamento la famiglia è inoltre la macro-categoria, uguale per tutti i corsi «Sicurezza Lavoratori».
Lo sistemo nella Fase 6 insieme alle attrezzature in Matrice.

## Non incluso

- Collegare i documenti agganciati al corso con una colonna dedicata (oggi `tipo_attestato` è solo un'etichetta di testo): si può fare, richiede una migrazione.
- Fase 6 (attrezzature in Matrice e Scadenze) e Fase 8 (`NOT NULL` sui codici, pulizia).

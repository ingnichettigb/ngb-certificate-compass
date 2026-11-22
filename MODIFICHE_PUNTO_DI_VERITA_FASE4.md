# Punto di verità ruoli ↔ corsi: Fase 4 (rischio della ditta e formazione lavoratore)

Data: 2026-11-21

Prerequisiti: migrazione `0017` eseguita, Fasi 1, 2 e 3 pubblicate.

## Idea

Il prerequisito di ogni ruolo che «richiede LAVORATORE» (le attrezzature) è il ruolo Lavoratore **completo**: corso base più la formazione specifica del grado
di rischio della ditta. Quali corsi sono attesi non è scritto nel programma: lo dicono le righe del Lavoratore nella Tabella 02.

## File inclusi (percorsi identici a quelli del repo)

| File | Stato |
|---|---|
| `src/features/dipendenti/matrice/condizioni-regole.ts` | nuovo (quando una regola vale per la ditta) |
| `src/features/dipendenti/matrice/condizioni-regole.test.ts` | nuovo |
| `src/features/dipendenti/matrice/useContestoRegole.ts` | nuovo (grado di rischio della ditta, cache condivisa) |
| `src/features/dipendenti/formazione-lavoratore.ts` | nuovo («formazione lavoratore completa») |
| `src/features/dipendenti/formazione-lavoratore.test.ts` | nuovo |
| `src/features/dipendenti/matrice/regole-ruolo-corso.ts` | sostituisce (l'indice elenca le regole che citano ogni corso) |
| `src/features/dipendenti/matrice/mappatura-ruoli-corsi.ts` | sostituisce (l'obbligo vale solo se la regola è applicabile alla ditta) |
| `src/features/dipendenti/matrice/useDatiMatrice.ts` | sostituisce |
| `src/features/dipendenti/components/SelettoreCorsiDipendente.tsx` | sostituisce |

## Cosa cambia

**1. La formazione specifica segue il rischio della ditta.**
Nella Tabella 02 il Lavoratore ha quattro righe: base `SIC-GEN-04` sempre; `SIC-SPE-04`, `-08`, `-12` con parametro «rischio ATECO» e valore basso, medio, alto.
Ora un corso è dovuto solo se **almeno una** regola che lo cita vale per la ditta. Con rischio **medio**: base, `SIC-SPE-08` e `SIC-AGG-06` sono dovuti; `SIC-SPE-04` e `SIC-SPE-12` no
(prima erano tutti e tre dovuti a ogni lavoratore). Cambiando il grado di rischio nella scheda Ditta, il corso dovuto cambia da solo.
`SIC-AGG-06` resta sempre dovuto: è citato da tutte e tre le righe del rischio.

**2. Rischio non impostato: nessuna scelta silenziosa.** Se il grado di rischio manca (o la lettura della ditta non è ancora arrivata) valgono tutte le regole, come prima. Non si assume «medio».

**3. «Formazione lavoratore completa»** (`valutaFormazioneLavoratore`, funzione pura, non ancora collegata a una schermata: la useranno le Fasi 5 e 6).
Esiti della formazione specifica: `presente`, `mancante`, `diversa` e `non-valutabile`.
- **Una specifica diversa da quella attesa** (es. 12 ore con ditta a rischio medio) **non si accetta da sola**: esito `diversa`, prerequisito non soddisfatto, decide l'operatore (Fase 5).
- Un corso conta come svolto anche se scaduto (attestati approvati): la scadenza si segue con gli aggiornamenti, non blocca il prerequisito.
- Se la Tabella 02 non ha righe del Lavoratore, il prerequisito non risulta mai completo.

## Effetti visibili da controllare dopo il push

1. **Matrice, colonne del Lavoratore**: per una ditta a rischio medio la formazione specifica obbligatoria è una sola (8 ore), non più tre.
2. Chi ha già un'altra specifica (es. 12 ore in una ditta a rischio medio) **risulta senza la specifica attesa**: il segnale resta finché in Fase 5 l'operatore decide.
3. Scheda lavoratore → corsi: stessa regola.
4. Scheda Ditta → «Grado di Rischio Aziendale»: cambiandolo cambia quale corso specifico è dovuto.

## Controllo

- Tipi: OK. ESLint: nessun errore (un avviso `useMemo` già presente prima).
- Test nuovi: 20, tutti passati. Suite completa: **stessi 11 file e stessi 17 test falliti prima e dopo** (istantanee con data fissa, non toccate).

## Da sapere

- Gli altri parametri della Tabella 02 (livello antincendio, gruppo primo soccorso, fascia lavoratori RLS, settore e modulo ASPP/RSPP) valgono ancora sempre: oggi tutti i livelli di un addetto
  risultano dovuti. Il meccanismo è pronto: collegare un parametro a un dato della ditta significa aggiungerlo in `condizioni-regole.ts`.
- La spunta «Applica» della Tabella 02 non entra in questa decisione: il rischio lo decide la ditta.

## Non incluso (fasi successive)

- Decisione dell'operatore sulla specifica «diversa» (Fase 5), attrezzature in Matrice e Scadenze con stato «in attesa formazione lavoratore» (Fase 6),
  maschera di aggancio (Fase 7), vincoli `NOT NULL` sui codici (Fase 8).

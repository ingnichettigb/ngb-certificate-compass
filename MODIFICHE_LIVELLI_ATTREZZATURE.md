# Livelli dei corsi di attrezzatura (correzione dati, migrazione `0019`)

Data: 2026-11-23

Nasce dal risultato di `verifica_attrezzature_corsi.sql` (Fase 6): tutti i 40 corsi `LAV-…` hanno livello «Specifico». Durata (5 anni), ore di aggiornamento (4), macro-categoria («Cantieri»)
e codice dell'aggiornamento sono già corretti.

## Il problema

Il motore delle scadenze riconosce il corso base **solo** se il livello è «Base». Provato con casi reali sul motore:

| Caso | Con «Specifico» (oggi) | Con «Base» |
|---|---|---|
| Base 2019 + aggiornamento 2024 | uguale | uguale |
| Solo base 2019 | uguale | uguale |
| Aggiornamento con poche ore, due aggiornamenti, aggiornamento senza base | uguale | uguale |
| **Corso base ripetuto** (2018, poi rifatto nel 2025) | **scadenza 2033-03-01** (il vecchio ciclo si prolunga) | **2030-02-10** (riparte dal 2025) |
| Aggiornamento registrato prima del base | valido fino al 2028 | scaduto dal 2024 (ancorato al base) |

Quindi, per chi rifà il corso base, oggi la validità risulta **sopra-stimata di tre anni**. Negli altri casi la differenza non si vede: un mio primo controllo con i soli casi semplici
sembrava dire che il livello non contasse, ed era incompleto.

## Cosa fa `0019`

Solo la colonna `livello_specifico` di `tipi_corso`, solo per i corsi `LAV-…`: i 20 corsi base diventano «Base», i 20 aggiornamenti (`-AGG`) «Aggiornamento» (convenzione degli altri corsi).
Nessuna tabella nuova, nessun altro dato toccato; ripetibile. Provata su una copia: non tocca i corsi diversi da `LAV-…`.

## Effetti visibili

- **Scadenze / scheda lavoratore / stampe**: per i lavoratori che hanno ripetuto un corso di attrezzatura, la scadenza si accorcia a quella corretta (dal corso più recente).
- **Pagina «Carica»** e filtri per livello: i corsi `LAV-…` compaiono sotto «Base» e «Aggiornamento» invece di «Specifico».
- La tabella dei corsi mostra «· Base» / «· Aggiornamento» accanto al gruppo.

## Come eseguire

1. Backup dall'app.
2. Esegui `0019_livelli_corsi_attrezzature.sql` nell'SQL editor: in fondo deve dare **20 / 20 / 0**.
3. Rilancia `verifica_attrezzature_corsi.sql`: nessuna riga con anomalie.
4. (Facoltativo) push del test: `src/features/scadenze/raggruppa.attrezzature.test.ts` ha un caso in più (corso base ripetuto → riparte da capo).

# Codici con il trattino per tutti (migrazione `0020`) — rev 01

Data: 2026-11-23

**Convenzione unica: MAIUSCOLO con il TRATTINO**, come i corsi (`SIC-GEN-04`). Prima i ruoli avevano il trattino basso (`ADD_DAE`, `OPER_PLE_II_831`).
Questa revisione sostituisce lo zip `ngb-livelli-attrezzature` (che resta valido nella parte sui livelli: `0019` è inclusa e invariata).

## Cosa cambia nel database (`0020`)

Solo `ruoli_sicurezza.codice`: ogni trattino basso diventa trattino.

| Prima | Dopo |
|---|---|
| `ADD_ANTINCENDIO`, `ADD_PRIMO_SOCCORSO`, `ADD_DAE`, `ADD_EVACUAZIONE` | `ADD-ANTINCENDIO`, `ADD-PRIMO-SOCCORSO`, `ADD-DAE`, `ADD-EVACUAZIONE` |
| `INC_PRIVACY`, `INC_REG_ANTINCENDIO`, `INC_DPI`, `INC_SDS` | `INC-PRIVACY`, `INC-REG-ANTINCENDIO`, `INC-DPI`, `INC-SDS` |
| `DL_RSPP` | `DL-RSPP` |
| `OPER_CAR_CP_II_8311` … (i 20 ruoli attrezzatura) | `OPER-CAR-CP-II-8311` … |
| `LAVORATORE`, `PREPOSTO`, `RLS`, `ASPP`, `RSPP`, `DL` | invariati (non hanno trattini) |

Le regole della Tabella 02 (`ruolo_codice`) e la colonna «Richiede» **seguono da sole**: le chiavi esterne della `0017` hanno `ON UPDATE CASCADE`.
Provata su una copia con i dati reali: 29 codici convertiti, nessuna regola persa (54), `INC-REG-ANTINCENDIO` richiede `ADD-ANTINCENDIO`, ripetibile.
**Si ferma senza cambiare nulla** se due codici diventassero uguali (provato con `X_Y` e `X-Y`). Nessuna tabella nuova.

## Cosa cambia nel codice

- `codici-ruoli.ts`: i codici ufficiali col trattino; il ruolo di un'attrezzatura si ricava più semplicemente: `LAV-PLE-II-831` e `LAV-PLE-II-831-AGG` → `OPER-PLE-II-831`.
- `mappatura-ruoli-corsi.ts`, `stampa-selezioni.ts`, `StampaSelezionePage.tsx` (filtri della stampa): i codici dei ruoli col trattino.
- **Tabella 01, campo Codice**: lo scrivi come vuoi: **spazi e trattini bassi diventano trattini** (`add dae` → `ADD-DAE`, `oper_ple` → `OPER-PLE`), un trattino solo tra le parti, mai ai bordi.
  Restano rifiutati accenti e simboli (`àdd`, `add/dae`).
- Test aggiornati (25 file, per lo più codici nelle prove). Nessuna logica nuova oltre alla regola del campo Codice.

## Ordine di esecuzione

1. Backup dall'app.
2. `0019_livelli_corsi_attrezzature.sql` (livelli dei corsi `LAV-…`, vedi `MODIFICHE_LIVELLI_ATTREZZATURE.md`): in fondo 20 / 20 / 0.
3. `0020_codici_ruoli_trattino.sql`: in fondo 0 / 0 / 0 / 0. Poi `verifica_0020.sql`: deve dare **TUTTO OK**.
4. **Subito dopo**, il push del codice (finché non lo fai, il programma cerca ancora i vecchi codici: i ruoli si ritrovano comunque per nome, ma non conviene restare a metà).
5. **Un backup nuovo**: un backup fatto prima della `0020` ripristinerebbe i vecchi codici.

## Da sapere

- `verifica_0017.sql` e le query di controllo precedenti cercavano `OPER_…` e `ADD_…`: dopo la `0020` non valgono più per i codici. Usa `verifica_0020.sql`.
- I corsi: nessun codice con il trattino basso era noto; `verifica_0020.sql` lo controlla (riga informativa «Corsi con il trattino basso»).
- Nel deposito c'è già un errore di tipo non mio: `src/features/stampe/globale/genera.ts` riga 105 (commit `5854b12`). Non l'ho toccato.

## Non incluso

- Fase 8: codice generato dal nome quando si crea un ruolo o un corso da Impostazioni e Organigramma, poi `NOT NULL` sui codici. Il generatore userà il trattino (`Addetto gru` → `ADDETTO-GRU`).

/* File: allinea_catalogo_primo_soccorso.sql | Percorso: drizzle migrations | Data creazione: 14/11/2026 | rev 1 — 14/11/2026 — Allinea il catalogo corsi alla «Tabella tipi di corso» del programma per il Primo Soccorso Gruppo B/C: il base PSO-BCB-12 rimanda all'aggiornamento PSO-AgB-04 (non a se stesso, come scriveva la riga di 0001_aggiorna_catalogo_corsi_26.sql). Valida 3 anni, aggiornamento ogni 3 anni di 4 ore. Se il database ha già questi valori non cambia nulla. Si toccano solo i valori verificati sulla tabella; altri corsi (PSO-GAA/GAB, BLS) non sono modificati. */
UPDATE public.tipi_corso
SET durata_validita_anni = 3,
    anni_aggiornamento = 3,
    ore_aggiornamento = 4,
    codice_corso_aggiornamento = 'PSO-AgB-04'
WHERE codice IN ('PSO-BCB-12', 'PSO-AgB-04');

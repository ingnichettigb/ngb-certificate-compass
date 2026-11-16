/*
 * File:           maiuscolo-cognomi-nomi-lavoratori.sql
 * Percorso:       sql/maiuscolo-cognomi-nomi-lavoratori.sql
 * Data creazione: 2026-11-16
 * Descrizione:    Porta in MAIUSCOLO cognome e nome dei lavoratori già in archivio (oggi: 3 cognomi e 80 nomi su 154 non lo sono).
 *                 Toglie anche spazi doppi e spazi in testa/coda. NON unisce e NON divide mai le parole:
 *                 MARIACRISTINA resta MARIACRISTINA, MARIA CRISTINA resta MARIA CRISTINA.
 *                 Dal programma i nuovi inserimenti e le modifiche salvano già in maiuscolo (rev 3 di dipendenti.ts).
 *                 Fai prima un backup (Backup dall'app o export della tabella dipendenti).
 *
 * PASSO 1 — ANTEPRIMA (sola lettura): prima e dopo. Controlla soprattutto le lettere accentate e gli apostrofi
 *           (es. NICCOLÒ, D'ANGELO): il «dopo» deve avere la lettera accentata maiuscola. Se vedi accenti non maiuscoli, fermati e scrivimi.
 */
SELECT id,
       cognome AS cognome_prima,
       upper(regexp_replace(btrim(cognome), '\s+', ' ', 'g')) AS cognome_dopo,
       nome AS nome_prima,
       CASE WHEN nome IS NULL THEN NULL ELSE upper(regexp_replace(btrim(nome), '\s+', ' ', 'g')) END AS nome_dopo
FROM public.dipendenti
WHERE cognome IS DISTINCT FROM upper(regexp_replace(btrim(cognome), '\s+', ' ', 'g'))
   OR nome IS DISTINCT FROM CASE WHEN nome IS NULL THEN NULL ELSE upper(regexp_replace(btrim(nome), '\s+', ' ', 'g')) END
ORDER BY cognome, nome;

/* PASSO 2 — CORREZIONE */
UPDATE public.dipendenti
SET cognome = upper(regexp_replace(btrim(cognome), '\s+', ' ', 'g')),
    nome    = CASE WHEN nome IS NULL THEN NULL ELSE upper(regexp_replace(btrim(nome), '\s+', ' ', 'g')) END
WHERE cognome IS DISTINCT FROM upper(regexp_replace(btrim(cognome), '\s+', ' ', 'g'))
   OR nome IS DISTINCT FROM CASE WHEN nome IS NULL THEN NULL ELSE upper(regexp_replace(btrim(nome), '\s+', ' ', 'g')) END;

/* PASSO 3 — CONTROLLO: deve dare 0 e 0. */
SELECT count(*) FILTER (WHERE cognome <> upper(cognome)) AS cognomi_non_maiuscoli,
       count(*) FILTER (WHERE nome <> upper(nome)) AS nomi_non_maiuscoli,
       count(*) AS totale
FROM public.dipendenti;

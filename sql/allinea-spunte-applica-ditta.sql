-- File:      allinea-spunte-applica-ditta.sql
-- Percorso:  sql/allinea-spunte-applica-ditta.sql
-- Data creaz: 15/11/2026
-- Revisioni:
--   rev 1 — 15/11/2026 — Allinea la colonna «applica» delle Tabelle di raccordo 03 (RLS), 04 (Primo soccorso), 05 (Antincendio) e 07 (Gruppo primo soccorso)
--            alla situazione attuale della Ditta: applica = true sulla riga (fascia) in cui ricade la Ditta, false sulle altre della stessa categoria.
-- Stessa logica del programma (TabellaRaccordo.tsx):
--   * RLS e Primo soccorso: lavoratori = il PIÙ ALTO tra «N. lavoratori dichiarato» (ditta) e lavoratori in forza (dipendenti).
--   * Antincendio: presenze = somma di «persone_max» delle sedi attive se tutte compilate, altrimenti ditta.presenze_contemporanee_max.
--   * Tabella 07: fascia testuale («1-2», «3-5», «6 o più»; le righe per agricoltura non si deducono) + gruppo (A/B/C) risultante dalla Tabella 04.
--     Se per la stessa fascia e lo stesso gruppo c'è più di una riga (indice INAIL), una scelta già fatta a mano tra quelle righe resta com'è;
--     altrimenti si spuntano tutte le righe calcolate. Se la Ditta non ha ancora i numeri, la tabella 07 non viene toccata.
-- Il programma ripete lo stesso allineamento ogni volta che si apre la tabella: questo script serve a sistemare subito il database.
-- Idempotente: si può rilanciare. Scrive solo le righe che cambiano.

BEGIN;

-- 03, 04, 05 – soglie_ditta
WITH
  lav AS (
    SELECT GREATEST(
             COALESCE((SELECT n_lavoratori_dichiarato FROM public.ditta WHERE id = true), 0),
             (SELECT count(*) FROM public.dipendenti WHERE stato_lavoratore = 'in_forza')
           )::integer AS n
  ),
  pres AS (
    SELECT COALESCE(
      (SELECT sum(persone_max)::integer
         FROM public.sedi
        WHERE attiva
          AND (SELECT count(*) FROM public.sedi WHERE attiva) > 0
          AND NOT EXISTS (SELECT 1 FROM public.sedi WHERE attiva AND (persone_max IS NULL OR persone_max <= 0))),
      (SELECT presenze_contemporanee_max FROM public.ditta WHERE id = true)
    ) AS n
  ),
  calcolo AS (
    SELECT s.id,
           CASE s.ambito WHEN 'antincendio_presenze' THEN (SELECT n FROM pres) ELSE (SELECT n FROM lav) END AS valore,
           s.da, s.a, s.applica
      FROM public.soglie_ditta s
     WHERE s.ambito IN ('rls', 'primo_soccorso', 'antincendio_presenze')
  )
UPDATE public.soglie_ditta s
   SET applica = (c.valore IS NOT NULL AND c.valore >= c.da AND (c.a IS NULL OR c.valore <= c.a))
  FROM calcolo c
 WHERE s.id = c.id
   AND s.applica IS DISTINCT FROM (c.valore IS NOT NULL AND c.valore >= c.da AND (c.a IS NULL OR c.valore <= c.a));

-- 07 – gruppi_primo_soccorso
WITH
  lav AS (
    SELECT GREATEST(
             COALESCE((SELECT n_lavoratori_dichiarato FROM public.ditta WHERE id = true), 0),
             (SELECT count(*) FROM public.dipendenti WHERE stato_lavoratore = 'in_forza')
           )::integer AS n
  ),
  gruppo AS (
    -- Lettera del gruppo (A/B/C) dalla Tabella 04 per il numero di lavoratori (solo fasce attive, come getSoglieDitta)
    SELECT upper((regexp_match(s.esito, 'Gruppo\s+([ABC])', 'i'))[1]) AS lettera
      FROM public.soglie_ditta s, lav
     WHERE s.ambito = 'primo_soccorso' AND s.attiva
       AND lav.n >= s.da AND (s.a IS NULL OR lav.n <= s.a)
     ORDER BY s.ordine
     LIMIT 1
  ),
  proposta AS (
    SELECT g.id
      FROM public.gruppi_primo_soccorso g
      CROSS JOIN lav
      CROSS JOIN gruppo
      CROSS JOIN LATERAL (
        SELECT COALESCE(
                 regexp_match(lower(g.lavoratori), '^(\d+)\s*-\s*(\d+)'),
                 regexp_match(lower(g.lavoratori), '^(\d+)\s*o\s*più')
               ) AS m
      ) f
     WHERE lower(g.lavoratori) NOT LIKE '%agricoltura%'
       AND f.m IS NOT NULL
       AND lav.n >= (f.m)[1]::integer
       AND ((f.m)[2] IS NULL OR lav.n <= (f.m)[2]::integer)
       AND upper(g.gruppo) = gruppo.lettera
  ),
  scelta AS (
    SELECT
      (SELECT count(*) FROM proposta) AS n_proposta,
      EXISTS (SELECT 1 FROM public.gruppi_primo_soccorso WHERE applica) AS ci_sono_spunte,
      EXISTS (
        SELECT 1 FROM public.gruppi_primo_soccorso t
         WHERE t.applica AND t.id NOT IN (SELECT id FROM proposta)
      ) AS spunte_fuori_proposta
  )
UPDATE public.gruppi_primo_soccorso g
   SET applica = (g.id IN (SELECT id FROM proposta))
  FROM scelta sc
 WHERE sc.n_proposta > 0
   -- una scelta manuale già dentro la proposta resta com'è
   AND NOT (sc.ci_sono_spunte AND NOT sc.spunte_fuori_proposta)
   AND g.applica IS DISTINCT FROM (g.id IN (SELECT id FROM proposta));

COMMIT;

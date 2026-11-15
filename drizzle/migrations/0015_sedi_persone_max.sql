-- File:      0015_sedi_persone_max.sql
-- Percorso:  drizzle/migrations/0015_sedi_persone_max.sql
-- Data creaz: 15/11/2026
-- Revisioni:
--   rev 1 — 15/11/2026 — Colonna persone_max su public.sedi: massimo numero di presenti contemporanei nella sede/plesso
--                        (lavoratori, studenti, ospiti e utenza). La somma di tutte le sedi attive alimenta
--                        «Presenze contemporanee max» della Ditta (livello antincendio).
-- Regole:
--   * Valore intero > 0. NULL ammesso solo per le righe già esistenti (da compilare): l'obbligo di inserimento
--     è nell'applicazione, così il ripristino dei vecchi backup (plessi senza questo campo) continua a funzionare.
--   * Idempotente: si può rilanciare senza duplicare né sovrascrivere valori già inseriti.
--   * Non tocca public.ditta: il totale viene propagato dall'applicazione.

BEGIN;

-- 1. Colonna
ALTER TABLE public.sedi ADD COLUMN IF NOT EXISTS persone_max integer;

COMMENT ON COLUMN public.sedi.persone_max IS
  'Massimo numero di presenti contemporanei nella sede/plesso (tutti compresi: lavoratori, studenti, ospiti e utenza)';

-- 2. Vincolo: se presente, deve essere maggiore di zero (NULL = ancora da compilare)
ALTER TABLE public.sedi DROP CONSTRAINT IF EXISTS sedi_persone_max_positivo;
ALTER TABLE public.sedi ADD CONSTRAINT sedi_persone_max_positivo
  CHECK (persone_max IS NULL OR persone_max > 0);

-- 3. Valore iniziale della Sede Centrale
--    Solo se NON esistono altri plessi: in quel caso le presenze già dichiarate in Ditta sono tutte della Sede Centrale.
--    Se esistono plessi (es. ex Campo) il totale esistente non è ripartibile in automatico: si compila a mano (punto 4).
UPDATE public.sedi s
SET persone_max = d.presenze_contemporanee_max
FROM public.ditta d
WHERE s.is_principale
  AND s.persone_max IS NULL
  AND d.presenze_contemporanee_max IS NOT NULL
  AND d.presenze_contemporanee_max > 0
  AND NOT EXISTS (SELECT 1 FROM public.sedi altre WHERE NOT altre.is_principale);

-- 4. Valorizzazione manuale (DECOMMENTA e sostituisci i numeri con i valori reali, poi rilancia il file).
--    Non ho inventato i valori: dipendono dalla tua scuola.
--
-- UPDATE public.sedi SET persone_max = 0   /* <-- numero reale */ WHERE is_principale AND persone_max IS NULL;
-- UPDATE public.sedi SET persone_max = 0   /* <-- numero reale */ WHERE nome ILIKE '%campo%' AND persone_max IS NULL;

COMMIT;

-- Verifica (da lanciare a parte):
--   SELECT nome, is_principale, attiva, persone_max FROM public.sedi ORDER BY is_principale DESC, ordine;
--   SELECT sum(persone_max) AS totale, count(*) FILTER (WHERE persone_max IS NULL) AS da_compilare
--   FROM public.sedi WHERE attiva;

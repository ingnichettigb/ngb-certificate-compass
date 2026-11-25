-- File:      0019_livelli_corsi_attrezzature.sql
-- Percorso:  drizzle/migrations/0019_livelli_corsi_attrezzature.sql
-- Data creaz: 23/11/2026
-- Scopo:     i 40 corsi di attrezzatura (LAV-…) hanno tutti livello «Specifico». Il motore delle scadenze riconosce il corso base SOLO se il
--            livello è «Base»: con «Specifico», un corso base RIPETUTO (es. rifatto nel 2025 dopo quello del 2018) non riparte da capo ma
--            prolunga il vecchio ciclo, e la validità risulta sopra-stimata (provato: 2033 invece di 2030).
-- Contenuto: 20 corsi base -> livello «Base»; 20 aggiornamenti (-AGG) -> livello «Aggiornamento» (convenzione degli altri corsi).
--            Solo la colonna livello_specifico di public.tipi_corso. Nessuna tabella nuova, nessun altro dato. Idempotente.
-- Dopo:      rilanciare verifica_attrezzature_corsi.sql: nessuna anomalia.

BEGIN;

UPDATE public.tipi_corso
   SET livello_specifico = CASE WHEN upper(codice) LIKE '%-AGG' THEN 'Aggiornamento' ELSE 'Base' END
 WHERE upper(codice) LIKE 'LAV-%'
   AND livello_specifico IS DISTINCT FROM CASE WHEN upper(codice) LIKE '%-AGG' THEN 'Aggiornamento' ELSE 'Base' END;

COMMIT;

-- VERIFICA (sola lettura): attesi 20 / 20 / 0
SELECT 'corsi base con livello Base' AS controllo, count(*) AS trovato FROM public.tipi_corso
  WHERE upper(codice) LIKE 'LAV-%' AND upper(codice) NOT LIKE '%-AGG' AND livello_specifico = 'Base'
UNION ALL SELECT 'aggiornamenti con livello Aggiornamento', count(*) FROM public.tipi_corso
  WHERE upper(codice) LIKE 'LAV-%-AGG' AND livello_specifico = 'Aggiornamento'
UNION ALL SELECT 'corsi LAV-… con un altro livello', count(*) FROM public.tipi_corso
  WHERE upper(codice) LIKE 'LAV-%' AND livello_specifico NOT IN ('Base', 'Aggiornamento');

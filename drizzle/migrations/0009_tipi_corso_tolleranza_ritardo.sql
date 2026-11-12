/* File: tipi_corso_tolleranza_ritardo.sql | Percorso: drizzle migrations | Data creazione: 12/11/2026 | rev 1 — 12/11/2026 — Tolleranza sul ritardo dell'aggiornamento per tipo di corso (Primo Soccorso: 4 mesi). Nessun dato esistente viene modificato tranne il valore 4 sui corsi di Primo Soccorso. */
ALTER TABLE public.tipi_corso ADD COLUMN IF NOT EXISTS tolleranza_ritardo_mesi integer;

ALTER TABLE public.tipi_corso DROP CONSTRAINT IF EXISTS tipi_corso_tolleranza_ritardo_mesi_check;
ALTER TABLE public.tipi_corso ADD CONSTRAINT tipi_corso_tolleranza_ritardo_mesi_check
  CHECK (tolleranza_ritardo_mesi IS NULL OR (tolleranza_ritardo_mesi >= 0 AND tolleranza_ritardo_mesi <= 60));

COMMENT ON COLUMN public.tipi_corso.tolleranza_ritardo_mesi IS
  'Mesi dopo la scadenza entro cui un aggiornamento fatto in ritardo sana ancora il ciclo. Oltre decade tutto e si rifà il corso base. NULL = nessun limite (sanatoria illimitata).';

-- Primo Soccorso: 4 mesi. Il defibrillatore (BLSD/DAE) non è Primo Soccorso e resta senza limite. Non si sovrascrive un valore già impostato.
UPDATE public.tipi_corso
SET tolleranza_ritardo_mesi = 4
WHERE macro_categoria ILIKE 'Primo Soccorso'
  AND tolleranza_ritardo_mesi IS NULL
  AND nome_corso NOT ILIKE '%DAE%'
  AND nome_corso NOT ILIKE '%BLS%'
  AND nome_corso NOT ILIKE '%defibrill%';

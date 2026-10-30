ALTER TABLE public.attestati_caricati ADD COLUMN IF NOT EXISTS numero_attestato text;
ALTER TABLE public.coda_valutazioni ADD COLUMN IF NOT EXISTS numero_attestato text;
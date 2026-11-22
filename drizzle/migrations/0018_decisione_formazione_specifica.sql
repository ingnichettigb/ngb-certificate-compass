-- File:      0018_decisione_formazione_specifica.sql
-- Percorso:  drizzle/migrations/0018_decisione_formazione_specifica.sql
-- Data creaz: 21/11/2026
-- Scopo:     registrare la DECISIONE DELL'OPERATORE quando un lavoratore ha una formazione specifica DIVERSA da quella attesa per il
--            grado di rischio della ditta (es. SIC-SPE-12 con ditta a rischio medio, atteso SIC-SPE-08). Non si accetta da sola.
-- Contenuto: 6 colonne su public.attestati_caricati (l'attestato del corso «diverso»). NESSUNA tabella nuova.
--   equivalenza_esito         'accettata' | 'integrazione' | 'non_valida'  (vuoto = nessuna decisione)
--   equivalenza_corso_svolto  codice del corso dell'attestato quando si è deciso (se poi l'attestato cambia corso, la decisione decade)
--   equivalenza_corso_atteso  codice del corso atteso per il rischio della ditta in quel momento
--   equivalenza_rischio       grado di rischio della ditta in quel momento (se cambia, la decisione decade e si rivaluta)
--   equivalenza_nota          motivazione, obbligatoria
--   equivalenza_data          quando
-- Le sei colonne sono o tutte vuote o tutte compilate. Idempotente: si può rilanciare. Fare PRIMA il backup dall'app.

BEGIN;

ALTER TABLE public.attestati_caricati
  ADD COLUMN IF NOT EXISTS equivalenza_esito        text,
  ADD COLUMN IF NOT EXISTS equivalenza_corso_svolto text,
  ADD COLUMN IF NOT EXISTS equivalenza_corso_atteso text,
  ADD COLUMN IF NOT EXISTS equivalenza_rischio      text,
  ADD COLUMN IF NOT EXISTS equivalenza_nota         text,
  ADD COLUMN IF NOT EXISTS equivalenza_data         timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attestati_equivalenza_valori_chk') THEN
    ALTER TABLE public.attestati_caricati ADD CONSTRAINT attestati_equivalenza_valori_chk CHECK (
      (equivalenza_esito  IS NULL OR equivalenza_esito  IN ('accettata', 'integrazione', 'non_valida')) AND
      (equivalenza_rischio IS NULL OR equivalenza_rischio IN ('basso', 'medio', 'alto')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attestati_equivalenza_completa_chk') THEN
    ALTER TABLE public.attestati_caricati ADD CONSTRAINT attestati_equivalenza_completa_chk CHECK (
      (equivalenza_esito IS NULL AND equivalenza_corso_svolto IS NULL AND equivalenza_corso_atteso IS NULL
        AND equivalenza_rischio IS NULL AND equivalenza_nota IS NULL AND equivalenza_data IS NULL)
      OR
      (equivalenza_esito IS NOT NULL AND equivalenza_corso_svolto IS NOT NULL AND equivalenza_corso_atteso IS NOT NULL
        AND equivalenza_rischio IS NOT NULL AND btrim(COALESCE(equivalenza_nota, '')) <> '' AND equivalenza_data IS NOT NULL));
  END IF;
  -- I corsi sono indicati per codice e devono esistere nel catalogo
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attestati_equivalenza_svolto_fkey') THEN
    ALTER TABLE public.attestati_caricati ADD CONSTRAINT attestati_equivalenza_svolto_fkey
      FOREIGN KEY (equivalenza_corso_svolto) REFERENCES public.tipi_corso (codice) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attestati_equivalenza_atteso_fkey') THEN
    ALTER TABLE public.attestati_caricati ADD CONSTRAINT attestati_equivalenza_atteso_fkey
      FOREIGN KEY (equivalenza_corso_atteso) REFERENCES public.tipi_corso (codice) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

COMMIT;

-- VERIFICA (sola lettura): attesi 6 / 4 / 0
SELECT 'colonne equivalenza_*' AS controllo, count(*) AS trovato FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'attestati_caricati' AND column_name LIKE 'equivalenza\_%'
UNION ALL SELECT 'vincoli (2 controlli + 2 chiavi esterne)', count(*) FROM pg_constraint
  WHERE conname IN ('attestati_equivalenza_valori_chk', 'attestati_equivalenza_completa_chk', 'attestati_equivalenza_svolto_fkey', 'attestati_equivalenza_atteso_fkey')
UNION ALL SELECT 'attestati con decisione a metà', count(*) FROM public.attestati_caricati
  WHERE (equivalenza_esito IS NULL) <> (equivalenza_data IS NULL);

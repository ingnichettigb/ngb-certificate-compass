-- File:      0012_sedi_multi_sede.sql
-- Percorso:  drizzle/migrations/0012_sedi_multi_sede.sql
-- Data creaz: 13/11/2026
-- Revisioni:
--   rev 1 — 13/11/2026 — Tabella sedi (principale unica + plessi), sede_id su dipendenti e dipendenti_ruoli.
-- Regole:
--   * Esiste SEMPRE una sola sede principale; nessun dipendente / incarico resta senza sede.
--   * Chi non ha sede (anche inserito da codice vecchio) va alla sede principale (trigger).
--   * Eliminando un plesso i dipendenti passano alla principale; gli incarichi di quel plesso decadono.
--   * Idempotente: si può rilanciare senza duplicare nulla.

BEGIN;

-- 1. Tabella sedi
CREATE TABLE IF NOT EXISTS public.sedi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  indirizzo text,
  cap text,
  comune text,
  provincia text,
  is_principale boolean NOT NULL DEFAULT false,
  ordine integer NOT NULL DEFAULT 0,
  attiva boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Una sola sede principale
CREATE UNIQUE INDEX IF NOT EXISTS sedi_una_sola_principale ON public.sedi (is_principale) WHERE is_principale;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sedi TO anon, authenticated;
GRANT ALL ON public.sedi TO service_role;
ALTER TABLE public.sedi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sedi_public_all ON public.sedi;
CREATE POLICY sedi_public_all ON public.sedi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_sedi_upd ON public.sedi;
CREATE TRIGGER trg_sedi_upd BEFORE UPDATE ON public.sedi FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Sede principale (dati presi dalla Ditta; se la riga Ditta mancasse, la crea comunque)
INSERT INTO public.sedi (nome, indirizzo, cap, comune, provincia, is_principale, ordine)
SELECT 'Sede Centrale', d.indirizzo, d.cap, d.comune, d.provincia, true, 1
FROM (SELECT 1) x
LEFT JOIN public.ditta d ON d.id = true
WHERE NOT EXISTS (SELECT 1 FROM public.sedi WHERE is_principale);

-- 3. Funzioni di supporto
CREATE OR REPLACE FUNCTION public.sede_principale_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT id FROM public.sedi WHERE is_principale LIMIT 1
$$;

-- Se sede_id manca, usa la sede principale (codice vecchio, import, inserimenti manuali)
CREATE OR REPLACE FUNCTION public.imposta_sede_default() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.sede_id IS NULL THEN NEW.sede_id := public.sede_principale_id(); END IF;
  RETURN NEW;
END; $$;

-- La principale non si elimina né si declassa; eliminando un plesso i dipendenti tornano alla principale
CREATE OR REPLACE FUNCTION public.proteggi_sedi() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_principale THEN RAISE EXCEPTION 'La sede principale non si può eliminare'; END IF;
    UPDATE public.dipendenti SET sede_id = public.sede_principale_id() WHERE sede_id = OLD.id;
    RETURN OLD;
  END IF;
  IF OLD.is_principale AND NOT NEW.is_principale THEN
    RAISE EXCEPTION 'La sede principale non si può declassare: promuovi un''altra sede';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sedi_proteggi_del ON public.sedi;
CREATE TRIGGER trg_sedi_proteggi_del BEFORE DELETE ON public.sedi FOR EACH ROW EXECUTE FUNCTION public.proteggi_sedi();
DROP TRIGGER IF EXISTS trg_sedi_proteggi_upd ON public.sedi;
CREATE TRIGGER trg_sedi_proteggi_upd BEFORE UPDATE ON public.sedi FOR EACH ROW EXECUTE FUNCTION public.proteggi_sedi();

-- 4. Dipendenti: sede di appartenenza (mai vuota)
ALTER TABLE public.dipendenti ADD COLUMN IF NOT EXISTS sede_id uuid REFERENCES public.sedi(id);
UPDATE public.dipendenti SET sede_id = public.sede_principale_id() WHERE sede_id IS NULL;
ALTER TABLE public.dipendenti ALTER COLUMN sede_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_dip_sede_default ON public.dipendenti;
CREATE TRIGGER trg_dip_sede_default BEFORE INSERT ON public.dipendenti FOR EACH ROW EXECUTE FUNCTION public.imposta_sede_default();

-- 5. Incarichi (ruoli): per sede, mai vuoti
ALTER TABLE public.dipendenti_ruoli ADD COLUMN IF NOT EXISTS sede_id uuid REFERENCES public.sedi(id) ON DELETE CASCADE;
UPDATE public.dipendenti_ruoli SET sede_id = public.sede_principale_id() WHERE sede_id IS NULL;
ALTER TABLE public.dipendenti_ruoli ALTER COLUMN sede_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_dipruoli_sede_default ON public.dipendenti_ruoli;
CREATE TRIGGER trg_dipruoli_sede_default BEFORE INSERT ON public.dipendenti_ruoli FOR EACH ROW EXECUTE FUNCTION public.imposta_sede_default();

ALTER TABLE public.dipendenti_ruoli DROP CONSTRAINT IF EXISTS dipendenti_ruoli_dipendente_id_ruolo_id_key;
ALTER TABLE public.dipendenti_ruoli DROP CONSTRAINT IF EXISTS dipendenti_ruoli_dip_ruolo_sede_uniq;
ALTER TABLE public.dipendenti_ruoli ADD CONSTRAINT dipendenti_ruoli_dip_ruolo_sede_uniq UNIQUE (dipendente_id, ruolo_id, sede_id);

COMMIT;

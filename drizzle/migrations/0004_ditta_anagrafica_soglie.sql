CREATE TABLE IF NOT EXISTS public.ditta (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  ragione_sociale text NOT NULL DEFAULT 'Nichetti Gian Battista',
  codice_fiscale text,
  partita_iva text,
  indirizzo text,
  cap text DEFAULT '26015',
  comune text DEFAULT 'Soresina',
  provincia text DEFAULT 'CR',
  telefono text,
  email text,
  pec text,
  referente text DEFAULT 'Gian Battista Nichetti',
  email_mittente_resend text DEFAULT 'onboarding@resend.dev',
  datore_di_lavoro text,
  rspp text,
  medico_competente text,
  codici_ateco jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(codici_ateco) = 'array'),
  rischio_ditta text CHECK (rischio_ditta IN ('basso','medio','alto')),
  reparti_rischio_differenziato boolean NOT NULL DEFAULT false,
  n_lavoratori_dichiarato integer CHECK (n_lavoratori_dichiarato >= 0),
  n_lavoratori_data_aggiornamento date,
  e_scuola boolean NOT NULL DEFAULT false,
  presenze_contemporanee_max integer CHECK (presenze_contemporanee_max >= 0),
  presenze_data_aggiornamento date,
  livello_antincendio smallint CHECK (livello_antincendio IN (1,2,3)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ditta TO anon, authenticated, service_role;
ALTER TABLE public.ditta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ditta_public_all ON public.ditta;
CREATE POLICY ditta_public_all ON public.ditta FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
INSERT INTO public.ditta (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.soglie_ditta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambito text NOT NULL CHECK (ambito IN ('rls','primo_soccorso','antincendio_presenze','idoneita_tecnica_presenze')),
  da integer NOT NULL CHECK (da >= 0),
  a integer CHECK (a IS NULL OR a >= da),
  etichetta text NOT NULL,
  esito text NOT NULL,
  note text,
  ordine integer NOT NULL DEFAULT 0,
  attiva boolean NOT NULL DEFAULT true,
  UNIQUE (ambito, da)
);
GRANT ALL ON public.soglie_ditta TO anon, authenticated, service_role;
ALTER TABLE public.soglie_ditta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS soglie_ditta_public_all ON public.soglie_ditta;
CREATE POLICY soglie_ditta_public_all ON public.soglie_ditta FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
INSERT INTO public.soglie_ditta (ambito, da, a, etichetta, esito, note, ordine) VALUES
  ('rls', 0, 15, 'Fino a 15 lavoratori', 'RLS eletto dai lavoratori o territoriale', NULL, 1),
  ('rls', 16, 200, 'Da 16 a 200 lavoratori', '1 RLS', NULL, 2),
  ('rls', 201, 1000, 'Da 201 a 1.000 lavoratori', '3 RLS', NULL, 3),
  ('rls', 1001, NULL, 'Oltre 1.000 lavoratori', '6 RLS', NULL, 4),
  ('primo_soccorso', 0, 2, 'Meno di 3 lavoratori', 'Gruppo C', 'Il gruppo A dipende dall''attività: scelta manuale', 1),
  ('primo_soccorso', 3, NULL, '3 o più lavoratori', 'Gruppo B', 'Il gruppo A dipende dall''attività: scelta manuale', 2),
  ('antincendio_presenze', 0, 100, 'Fino a 100 persone presenti', 'Livello 1', 'Da confermare sull''Allegato III D.M. 2/9/2021', 1),
  ('antincendio_presenze', 101, 1000, 'Da 101 a 1.000 persone presenti', 'Livello 2', 'Scuole oltre 100 presenti: attività DPR 151/2011', 2),
  ('antincendio_presenze', 1001, NULL, 'Oltre 1.000 persone presenti', 'Livello 3', NULL, 3),
  ('idoneita_tecnica_presenze', 0, 300, 'Fino a 300 persone presenti', 'Non richiesta', NULL, 1),
  ('idoneita_tecnica_presenze', 301, NULL, 'Oltre 300 persone presenti', 'Richiesta (esame ai Vigili del Fuoco)', NULL, 2)
ON CONFLICT (ambito, da) DO NOTHING;

ALTER TABLE public.reparti ADD COLUMN IF NOT EXISTS livello_rischio text CHECK (livello_rischio IN ('basso','medio','alto'));
ALTER TABLE public.tipi_corso ADD COLUMN IF NOT EXISTS livello_rischio text CHECK (livello_rischio IN ('basso','medio','alto'));

DROP TRIGGER IF EXISTS trg_ditta_upd ON public.ditta;
CREATE TRIGGER trg_ditta_upd BEFORE UPDATE ON public.ditta FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
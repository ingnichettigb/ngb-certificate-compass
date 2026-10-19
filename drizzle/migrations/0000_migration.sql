CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.dipendenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codice_fiscale varchar(16) NOT NULL UNIQUE,
  cognome text NOT NULL, nome text NOT NULL,
  email text, reparto text, sottoreparto text, classe_concorso text, materia text,
  luogo_nascita text, data_nascita date, codice_ateco text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tipi_corso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_corso text NOT NULL, macro_categoria text NOT NULL, livello_specifico text NOT NULL,
  ore_minime_legge numeric, durata_validita_anni integer,
  codice text, ordine integer DEFAULT 0, anni_aggiornamento integer, ore_aggiornamento numeric,
  codice_corso_aggiornamento text, visibile_lavoratore boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.attestati_caricati (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id uuid NOT NULL REFERENCES public.dipendenti(id) ON DELETE CASCADE,
  codice_fiscale varchar(16) NOT NULL REFERENCES public.dipendenti(codice_fiscale) ON UPDATE CASCADE,
  tipo_corso_id uuid NOT NULL REFERENCES public.tipi_corso(id),
  data_corso date NOT NULL, data_scadenza_calcolata date, ore_dichiarate numeric,
  url_foto_fronte text, url_foto_retro text,
  stato_validazione text NOT NULL DEFAULT 'In attesa', note_rifiuto text, data_validazione timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attestati_dip ON public.attestati_caricati(dipendente_id);
CREATE INDEX idx_attestati_stato ON public.attestati_caricati(stato_validazione);

CREATE TABLE public.argomenti_corso (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.categorie_corso (macro_categoria text PRIMARY KEY, visibile_lavoratore boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.classi_concorso (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codice text NOT NULL UNIQUE, denominazione text, attivo boolean NOT NULL DEFAULT true, da_lavoratore boolean NOT NULL DEFAULT false, usi integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.materie (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL UNIQUE, classe_concorso text, attivo boolean NOT NULL DEFAULT true, da_lavoratore boolean NOT NULL DEFAULT false, usi integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.coda_valutazioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archiviato boolean NOT NULL DEFAULT false, argomenti text[] NOT NULL DEFAULT '{}', argomenti_mancanti text[] NOT NULL DEFAULT '{}',
  codice_ateco text, codice_fiscale text, cognome text, nome text, email text, reparto text,
  data_corso date, data_nascita date, luogo_nascita text, ente text,
  esito text NOT NULL DEFAULT 'Da valutare', integrazione text, inviato boolean NOT NULL DEFAULT false,
  mime_file text, nome_file text, percorso_file text, note text, ore numeric,
  tipo_corso_id uuid, tipo_corso_nome text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.documenti_attestati (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id uuid NOT NULL REFERENCES public.dipendenti(id) ON DELETE CASCADE,
  codice_fiscale varchar NOT NULL, tipo_attestato text NOT NULL, tipo_personalizzato text,
  data_scadenza date NOT NULL, nome_file text NOT NULL, percorso_file text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documenti_attestati_dipendente ON public.documenti_attestati(dipendente_id);
CREATE TABLE public.integrazioni_dvr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id uuid NOT NULL REFERENCES public.dipendenti(id) ON DELETE CASCADE,
  attestato_origine_id uuid REFERENCES public.attestati_caricati(id) ON DELETE SET NULL,
  tipo_corso_nome text, descrizione text NOT NULL, ore numeric,
  argomenti_mancanti text[] NOT NULL DEFAULT '{}', stato text NOT NULL DEFAULT 'Da completare',
  data_richiesta date NOT NULL DEFAULT current_date,
  attestato_chiusura_id uuid REFERENCES public.attestati_caricati(id) ON DELETE SET NULL,
  data_chiusura timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.note_valutazione (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), testo text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX note_valutazione_testo_uniq ON public.note_valutazione (lower(testo));
CREATE TABLE public.opzioni_integrazione (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), etichetta text NOT NULL, ore numeric, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.reparti (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL UNIQUE, ordine integer NOT NULL DEFAULT 0, attivo boolean NOT NULL DEFAULT true, richiede_classe_concorso boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.sottoreparti (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reparto_id uuid NOT NULL REFERENCES public.reparti(id) ON DELETE CASCADE, nome text NOT NULL, codice text, ordine integer NOT NULL DEFAULT 0, attivo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.ruoli_sicurezza (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL UNIQUE, descrizione text, macro_categoria text, obbligatorio_tutti boolean NOT NULL DEFAULT false, attivo boolean NOT NULL DEFAULT true, ordine integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.dipendenti_ruoli (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dipendente_id uuid NOT NULL REFERENCES public.dipendenti(id) ON DELETE CASCADE, ruolo_id uuid NOT NULL REFERENCES public.ruoli_sicurezza(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(dipendente_id, ruolo_id));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['dipendenti','tipi_corso','attestati_caricati','argomenti_corso','categorie_corso','classi_concorso','materie','coda_valutazioni','documenti_attestati','integrazioni_dvr','note_valutazione','opzioni_integrazione','reparti','sottoreparti','ruoli_sicurezza','dipendenti_ruoli'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t || '_public_all', t);
  END LOOP;
END $$;

CREATE TRIGGER trg_dip_upd BEFORE UPDATE ON public.dipendenti FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tipi_upd BEFORE UPDATE ON public.tipi_corso FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_doc_upd BEFORE UPDATE ON public.documenti_attestati FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_coda_upd BEFORE UPDATE ON public.coda_valutazioni FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cat_upd BEFORE UPDATE ON public.categorie_corso FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.calcola_scadenza() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_anni integer;
BEGIN
  SELECT durata_validita_anni INTO v_anni FROM public.tipi_corso WHERE id = NEW.tipo_corso_id;
  IF v_anni IS NULL OR v_anni = 0 THEN NEW.data_scadenza_calcolata := NULL;
  ELSE NEW.data_scadenza_calcolata := (NEW.data_corso + (v_anni || ' years')::interval)::date; END IF;
  NEW.updated_at := now(); RETURN NEW;
END; $$;
CREATE TRIGGER trg_att_scadenza BEFORE INSERT OR UPDATE ON public.attestati_caricati FOR EACH ROW EXECUTE FUNCTION public.calcola_scadenza();

CREATE OR REPLACE FUNCTION public.registra_classe_concorso(p_codice text, p_denominazione text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_codice IS NULL OR btrim(p_codice) = '' THEN RETURN; END IF;
  INSERT INTO public.classi_concorso (codice, denominazione, da_lavoratore, usi)
  VALUES (upper(btrim(p_codice)), p_denominazione, true, 1)
  ON CONFLICT (codice) DO UPDATE SET usi = public.classi_concorso.usi + 1,
    denominazione = COALESCE(public.classi_concorso.denominazione, EXCLUDED.denominazione);
END; $$;
CREATE OR REPLACE FUNCTION public.registra_materia(p_nome text, p_classe text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_nome IS NULL OR btrim(p_nome) = '' THEN RETURN; END IF;
  INSERT INTO public.materie (nome, classe_concorso, da_lavoratore, usi)
  VALUES (btrim(p_nome), p_classe, true, 1)
  ON CONFLICT (nome) DO UPDATE SET usi = public.materie.usi + 1,
    classe_concorso = COALESCE(public.materie.classe_concorso, EXCLUDED.classe_concorso);
END; $$;
GRANT EXECUTE ON FUNCTION public.registra_classe_concorso(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registra_materia(text, text) TO anon, authenticated;

INSERT INTO public.tipi_corso (id, nome_corso, macro_categoria, livello_specifico, ore_minime_legge, durata_validita_anni, ordine) VALUES
('11111111-1111-4111-8111-000000000001','Sicurezza Generale','Sicurezza Lavoratori','Base',4,NULL,1),
('11111111-1111-4111-8111-000000000002','Sicurezza Specifica Rischio Basso','Sicurezza Lavoratori','Specifico',4,5,2),
('11111111-1111-4111-8111-000000000003','Antincendio Livello 1 Base','Antincendio','Base',4,5,3),
('11111111-1111-4111-8111-000000000004','Primo Soccorso Gruppo B/C Base','Primo Soccorso','Base',12,3,4),
('11111111-1111-4111-8111-000000000005','Aggiornamento Lavoratori','Sicurezza Lavoratori','Aggiornamento',6,5,5),
('11111111-1111-4111-8111-000000000006','Preposto','Preposto','Specifico',8,2,6),
('11111111-1111-4111-8111-000000000007','Uso del DAE (BLSD)','Primo Soccorso','Specifico',5,2,7),
('11111111-1111-4111-8111-000000000008','Prova di Evacuazione / Emergenze','Emergenze','Base',1,NULL,8);
INSERT INTO public.ruoli_sicurezza (nome, macro_categoria, obbligatorio_tutti, ordine) VALUES
  ('Lavoratore','Sicurezza Lavoratori',true,1),('Preposto','Preposto',false,2),
  ('Addetto Primo Soccorso','Primo Soccorso',false,3),('Addetto Antincendio','Antincendio',false,4),
  ('Addetto BLSD / Defibrillatore','Defibrillatore',false,5);

CREATE POLICY "attestati_storage_all" ON storage.objects FOR ALL TO anon, authenticated USING (bucket_id = 'attestati') WITH CHECK (bucket_id = 'attestati');
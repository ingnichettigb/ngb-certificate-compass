-- File:      0017_punto_di_verita_ruoli_corsi.sql
-- Percorso:  drizzle/migrations/0017_punto_di_verita_ruoli_corsi.sql
-- Data creaz: 21/11/2026
-- Scopo:     un solo punto di verità per il legame ruolo -> corso: la Tabella 02 (public.regole_ruolo_corso),
--            agganciata ai ruoli per CODICE e ai corsi per CODICE (chiavi esterne). I nomi diventano solo etichette.
-- Contenuto:
--   1. unicità di ruoli_sicurezza.codice e tipi_corso.codice (servono alle chiavi esterne)
--   2. nuovi ruoli: RSPP e le 20 attrezzature (macro-categoria «Attrezzature», richiedono LAVORATORE)
--   3. ruoli_sicurezza.richiede: da nome a codice, con chiave esterna
--   4. Tabella 02: colonna ruolo_codice (chiave esterna), «ruolo» tenuto allineato da trigger, corsi con chiave esterna
--   5. Tabella 02: ASPP modulo A/B distinti; nuove righe RSPP, extra Preposto/Privacy/Evacuazione e attrezzature
-- NON crea tabelle nuove. Idempotente: si può rilanciare. Fare PRIMA il backup dall'app.
-- Non imposta NOT NULL su ruoli_sicurezza.codice e tipi_corso.codice: il codice dell'app crea ancora ruoli/corsi senza codice.

BEGIN;

-- 1. Unicità dei codici ---------------------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ruoli_sicurezza_codice_key') THEN
    ALTER TABLE public.ruoli_sicurezza ADD CONSTRAINT ruoli_sicurezza_codice_key UNIQUE (codice);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tipi_corso_codice_key') THEN
    ALTER TABLE public.tipi_corso ADD CONSTRAINT tipi_corso_codice_key UNIQUE (codice);
  END IF;
END $$;

-- 2. Nuovi ruoli ----------------------------------------------------------------------------------------------------
INSERT INTO public.ruoli_sicurezza (nome, codice, tipo, richiede, descrizione, macro_categoria, obbligatorio_tutti, attivo, ordine)
SELECT 'RSPP', 'RSPP', 'ruolo', NULL, 'Responsabile del servizio di prevenzione e protezione', 'Sicurezza Lavoratori', false, true,
       (SELECT COALESCE(MAX(ordine), 0) FROM public.ruoli_sicurezza) + 1
WHERE NOT EXISTS (SELECT 1 FROM public.ruoli_sicurezza WHERE codice = 'RSPP' OR nome = 'RSPP');

INSERT INTO public.ruoli_sicurezza (nome, codice, tipo, richiede, descrizione, macro_categoria, obbligatorio_tutti, attivo, ordine)
SELECT v.nome, v.codice, 'ruolo', 'LAVORATORE', v.descrizione, 'Attrezzature', false, true,
       (SELECT COALESCE(MAX(ordine), 0) FROM public.ruoli_sicurezza) + v.n
FROM (VALUES
  (2, 'OPERATORE PLE', 'OPER_PLE_II_831', 'Piattaforme di lavoro mobili elevabili (PLE)'),
  (3, 'OPERATORE PLES', 'OPER_PLES_II_831', 'Piattaforme di lavoro mobili elevabili (PLES)'),
  (4, 'OPERATORE AUTOGRU', 'OPER_GRUA_II_832', 'Gru per autocarro'),
  (5, 'OPERATORE GRU A TORRE TOPO A', 'OPER_GRUTRA_II_833', 'Gru a torre'),
  (6, 'OPERATORE GRU A TORRE TOPO B', 'OPER_GRUTRB_II_833', 'Gru a torre'),
  (7, 'OPERATORE MULETTO', 'OPER_CARRELB_II_834', 'Carrelli elevatori semoventi con conducente a bordo'),
  (8, 'OPERATORE MULETTO CON SOLLEVAMENTO PERSONE', 'OPER_CARRELC_II_834', 'Carrelli elevatori semoventi con conducente a bordo SOLLEVAMENTO PERSONE E CARICHI'),
  (9, 'OPERATORE MULETTO COMPLETO', 'OPER_CARRELT_II_834', 'Carrelli elevatori semoventi con conducente a bordo TUTTE'),
  (10, 'OPERATORE GRU MOBILI F', 'OPER_GRUMFF_II_835', 'Gru mobili'),
  (11, 'OPERATORE GRU MOBILI T', 'OPER_GRUMFT_II_835', 'Gru mobili'),
  (12, 'OPERATORE TRATTORI AGRICOLI', 'OPER_TRATTAF_II_836', 'Trattori agricoli o forestali'),
  (13, 'OPERATORE ESCAVATORI A', 'OPER_ESCAV_II_837', 'Escavatori, pale caricatrici frontali, terne e autoribaltabili a cingoli'),
  (14, 'OPERATORE ESCAVATORI B', 'OPER_ESCAVTTA_II_837', 'Escavatori, pale caricatrici frontali, terne e autoribaltabili'),
  (15, 'OPERATORE ESCAVATORI C', 'OPER_ESCAVTTC_II_837', 'Escavatori, pale caricatrici frontali, terne e autoribaltabili a cingoli'),
  (16, 'OPERATORE POMPE CLS', 'OPER_POMPC_II_838', 'Pompe per calcestruzzo'),
  (17, 'OPERATORE MACCH. AGR. CRF', 'OPER_MA_CRFC_II_839', 'Macchina agricola raccoglifrutta (CRF)'),
  (18, 'OPERATORE CARICATORI CMM', 'OPER_CAR_CMM_II_8310', 'Caricatori per la movimentazione di materiali (CMM)'),
  (19, 'OPERATORE CARRIPONTE CP', 'OPER_CAR_CP_II_8311', 'Carriponte (CP)'),
  (20, 'OPERATORE CARRIPONTE CP CON CABINA', 'OPER_CAR_CPC_II_8311', 'Carriponte (CP) CABINA'),
  (21, 'OPERATORE AMBIENTI SOSPETTI E CONFINATI', 'OPER_AMBCONF_II_7', 'Ambienti sospetti di inquinamento o confinati')
) AS v(n, nome, codice, descrizione)
WHERE NOT EXISTS (SELECT 1 FROM public.ruoli_sicurezza r WHERE r.codice = v.codice OR r.nome = v.nome);

-- 3. «richiede»: da nome a codice -------------------------------------------------------------------------------------
UPDATE public.ruoli_sicurezza r
   SET richiede = q.codice
  FROM public.ruoli_sicurezza q
 WHERE r.richiede = q.nome AND q.codice IS NOT NULL AND r.richiede <> q.codice;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ruoli_sicurezza_richiede_fkey') THEN
    ALTER TABLE public.ruoli_sicurezza
      ADD CONSTRAINT ruoli_sicurezza_richiede_fkey FOREIGN KEY (richiede)
      REFERENCES public.ruoli_sicurezza (codice) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Tabella 02 agganciata ai ruoli ----------------------------------------------------------------------------------
ALTER TABLE public.regole_ruolo_corso ADD COLUMN IF NOT EXISTS ruolo_codice text;
ALTER TABLE public.regole_ruolo_corso ALTER COLUMN ruolo DROP NOT NULL;

-- «ruolo» resta come etichetta e si allinea da solo al nome del ruolo (anche se il ruolo viene rinominato)
CREATE OR REPLACE FUNCTION public.regole_ruolo_corso_allinea_nome() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN
  SELECT r.nome INTO NEW.ruolo FROM public.ruoli_sicurezza r WHERE r.codice = NEW.ruolo_codice;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS trg_regole_ruolo_corso_nome ON public.regole_ruolo_corso;
CREATE TRIGGER trg_regole_ruolo_corso_nome BEFORE INSERT OR UPDATE OF ruolo_codice ON public.regole_ruolo_corso
  FOR EACH ROW EXECUTE FUNCTION public.regole_ruolo_corso_allinea_nome();

CREATE OR REPLACE FUNCTION public.ruoli_sicurezza_propaga_nome() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN
  UPDATE public.regole_ruolo_corso SET ruolo = NEW.nome WHERE ruolo_codice = NEW.codice AND ruolo IS DISTINCT FROM NEW.nome;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS trg_ruoli_sicurezza_nome ON public.ruoli_sicurezza;
CREATE TRIGGER trg_ruoli_sicurezza_nome AFTER UPDATE OF nome ON public.ruoli_sicurezza
  FOR EACH ROW EXECUTE FUNCTION public.ruoli_sicurezza_propaga_nome();

-- Collega le righe esistenti (vecchie etichette -> codice del ruolo)
UPDATE public.regole_ruolo_corso g
   SET ruolo_codice = m.codice
  FROM (VALUES
    ('Lavoratore', 'LAVORATORE'), ('Preposto', 'PREPOSTO'), ('Add. Antincendio', 'ADD_ANTINCENDIO'),
    ('Add. Primo Soccorso', 'ADD_PRIMO_SOCCORSO'), ('Add. Defibrillatore', 'ADD_DAE'),
    ('Add. evacuazione', 'ADD_EVACUAZIONE'), ('RLS', 'RLS'), ('ASPP', 'ASPP'), ('Privacy', 'INC_PRIVACY')
  ) AS m(vecchio, codice)
 WHERE g.ruolo_codice IS NULL AND g.ruolo = m.vecchio;

-- ASPP: i moduli A e B avevano la stessa coppia ruolo+parametro (la spunta esclusiva li confondeva)
UPDATE public.regole_ruolo_corso SET parametro = 'modulo', valore = 'A'
 WHERE ruolo_codice = 'ASPP' AND corso_base = 'SIC-ASPP-A' AND parametro = 'nessuno';
UPDATE public.regole_ruolo_corso SET parametro = 'modulo', valore = 'B'
 WHERE ruolo_codice = 'ASPP' AND corso_base = 'SIC-ASPP-B' AND parametro = 'nessuno';

-- 5. Nuove righe (prima di imporre i vincoli, così se manca un corso/ruolo si vede subito) ------------------------------
INSERT INTO public.regole_ruolo_corso (ruolo_codice, parametro, valore, corso_base, corso_aggiornamento, ordine)
SELECT v.ruolo_codice, v.parametro, v.valore, v.corso_base, v.corso_aggiornamento,
       (SELECT COALESCE(MAX(ordine), 0) FROM public.regole_ruolo_corso) + row_number() OVER ()
FROM (VALUES
  -- RSPP (stessa struttura dell'ASPP: A senza aggiornamento, B e C con aggiornamento, settori SP1-SP5)
  ('RSPP', 'modulo',  'A',   'SIC-RSPP-A',      NULL),
  ('RSPP', 'modulo',  'B',   'SIC-RSPP-B',      'SIC-RSPP-AGG'),
  ('RSPP', 'settore', 'SP1', 'SIC-RSPP-B-SP1',  'SIC-RSPP-AGG'),
  ('RSPP', 'settore', 'SP2', 'SIC-RSPP-B-SP2',  'SIC-RSPP-AGG'),
  ('RSPP', 'settore', 'SP3', 'SIC-RSPP-B-SP3',  'SIC-RSPP-AGG'),
  ('RSPP', 'settore', 'SP4', 'SIC-RSPP-B-SP4',  'SIC-RSPP-AGG'),
  ('RSPP', 'settore', 'SP5', 'SIC-RSPP-B-SP5',  'SIC-RSPP-AGG'),
  ('RSPP', 'modulo',  'C',   'SIC-RSPP-C',      'SIC-RSPP-AGG'),
  -- Extra su ruoli esistenti (da verificare nella Tabella 02: si possono cancellare dalla pagina)
  ('PREPOSTO',        'integrazione', '—',    'PRP-INT-06',  NULL),
  ('INC_PRIVACY',     'variante',     'A02',  NULL,          'PRIVACY-A02'),
  ('ADD_EVACUAZIONE', 'prova',        '—',    'EME-PRO-02',  NULL),
  -- Attrezzature (dal file compilato)
  ('OPER_PLE_II_831', 'nessuno', '—', 'LAV-PLE-II-831', 'LAV-PLE-II-831-AGG'),
  ('OPER_PLES_II_831', 'nessuno', '—', 'LAV-PLES-II-831', 'LAV-PLES-II-831-AGG'),
  ('OPER_GRUA_II_832', 'nessuno', '—', 'LAV-GRUA-II-832', 'LAV-GRUA-II-832-AGG'),
  ('OPER_GRUTRA_II_833', 'nessuno', '—', 'LAV-GRUTRA-II-833', 'LAV-GRUTRA-II-833-AGG'),
  ('OPER_GRUTRB_II_833', 'nessuno', '—', 'LAV-GRUTRB-II-833', 'LAV-GRUTRB-II-833-AGG'),
  ('OPER_CARRELB_II_834', 'nessuno', '—', 'LAV-CARRELB-II-834', 'LAV-CARRELB-II-834-AGG'),
  ('OPER_CARRELC_II_834', 'nessuno', '—', 'LAV-CARRELC-II-834', 'LAV-CARRELC-II-834-AGG'),
  ('OPER_CARRELT_II_834', 'nessuno', '—', 'LAV-CARRELT-II-834', 'LAV-CARRELT-II-834-AGG'),
  ('OPER_GRUMFF_II_835', 'nessuno', '—', 'LAV-GRUMFF-II-835', 'LAV-GRUMFF-II-835-AGG'),
  ('OPER_GRUMFT_II_835', 'nessuno', '—', 'LAV-GRUMFT-II-835', 'LAV-GRUMFT-II-835-AGG'),
  ('OPER_TRATTAF_II_836', 'nessuno', '—', 'LAV-TRATTAF-II-836', 'LAV-TRATTAF-II-836-AGG'),
  ('OPER_ESCAV_II_837', 'nessuno', '—', 'LAV-ESCAV-II-837', 'LAV-ESCAV-II-837-AGG'),
  ('OPER_ESCAVTTA_II_837', 'nessuno', '—', 'LAV-ESCAVTTA-II-837', 'LAV-ESCAVTTA-II-837-AGG'),
  ('OPER_ESCAVTTC_II_837', 'nessuno', '—', 'LAV-ESCAVTTC-II-837', 'LAV-ESCAVTTC-II-837-AGG'),
  ('OPER_POMPC_II_838', 'nessuno', '—', 'LAV-POMPC-II-838', 'LAV-POMPC-II-838-AGG'),
  ('OPER_MA_CRFC_II_839', 'nessuno', '—', 'LAV-MA-CRFC-II-839', 'LAV-MA-CRFC-II-839-AGG'),
  ('OPER_CAR_CMM_II_8310', 'nessuno', '—', 'LAV-CAR-CMM-II-8310', 'LAV-CAR-CMM-II-8310-AGG'),
  ('OPER_CAR_CP_II_8311', 'nessuno', '—', 'LAV-CAR-CP-II-8311', 'LAV-CAR-CP-II-8311-AGG'),
  ('OPER_CAR_CPC_II_8311', 'nessuno', '—', 'LAV-CAR-CPC-II-8311', 'LAV-CAR-CPC-II-8311-AGG'),
  ('OPER_AMBCONF_II_7', 'nessuno', '—', 'LAV-AmbConf-II-7', 'LAV-AmbConf-II-7-AGG')
) AS v(ruolo_codice, parametro, valore, corso_base, corso_aggiornamento)
WHERE NOT EXISTS (
  SELECT 1 FROM public.regole_ruolo_corso g
   WHERE g.ruolo_codice = v.ruolo_codice AND g.parametro = v.parametro AND g.valore = v.valore
     AND COALESCE(g.corso_base, '') = COALESCE(v.corso_base, '')
     AND COALESCE(g.corso_aggiornamento, '') = COALESCE(v.corso_aggiornamento, '')
);

-- Vincoli: da qui ogni regola punta a un ruolo e a corsi che esistono davvero
ALTER TABLE public.regole_ruolo_corso ALTER COLUMN ruolo_codice SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regole_ruolo_corso_ruolo_fkey') THEN
    ALTER TABLE public.regole_ruolo_corso ADD CONSTRAINT regole_ruolo_corso_ruolo_fkey
      FOREIGN KEY (ruolo_codice) REFERENCES public.ruoli_sicurezza (codice) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regole_ruolo_corso_base_fkey') THEN
    ALTER TABLE public.regole_ruolo_corso ADD CONSTRAINT regole_ruolo_corso_base_fkey
      FOREIGN KEY (corso_base) REFERENCES public.tipi_corso (codice) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regole_ruolo_corso_agg_fkey') THEN
    ALTER TABLE public.regole_ruolo_corso ADD CONSTRAINT regole_ruolo_corso_agg_fkey
      FOREIGN KEY (corso_aggiornamento) REFERENCES public.tipi_corso (codice) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- Nessuna regola doppia
CREATE UNIQUE INDEX IF NOT EXISTS regole_ruolo_corso_chiave_idx ON public.regole_ruolo_corso
  (ruolo_codice, parametro, valore, COALESCE(corso_base, ''), COALESCE(corso_aggiornamento, ''));

COMMIT;

-- VERIFICA (sola lettura): deve dare 0 righe per ogni controllo, tranne l'ultimo che elenca le regole
SELECT 'regole senza ruolo'  AS controllo, count(*) FROM public.regole_ruolo_corso g
  WHERE NOT EXISTS (SELECT 1 FROM public.ruoli_sicurezza r WHERE r.codice = g.ruolo_codice)
UNION ALL SELECT 'richiede orfani', count(*) FROM public.ruoli_sicurezza r
  WHERE r.richiede IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.ruoli_sicurezza q WHERE q.codice = r.richiede)
UNION ALL SELECT 'ruoli senza codice', count(*) FROM public.ruoli_sicurezza WHERE codice IS NULL
UNION ALL SELECT 'ruoli totali (attesi 33)', count(*) FROM public.ruoli_sicurezza
UNION ALL SELECT 'regole totali (attese 54)', count(*) FROM public.regole_ruolo_corso;

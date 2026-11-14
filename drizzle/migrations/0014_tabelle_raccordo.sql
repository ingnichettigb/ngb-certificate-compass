-- File:      0014_tabelle_raccordo.sql
-- Percorso:  drizzle/migrations/0014_tabelle_raccordo.sql
-- Data creaz: 14/11/2026
-- Revisioni:
--   rev 1 — 14/11/2026 — Tabelle di raccordo (pagina Impostazioni generali > Tabelle di raccordo).
-- Contenuto:
--   * ruoli_sicurezza: nuove colonne codice, tipo, richiede, applica (NESSUN ruolo viene cancellato o rinominato: le 25 righe e le
--     loro assegnazioni restano; il codice è assegnato solo ai ruoli il cui nome coincide esattamente).
--   * soglie_ditta: nuova colonna applica (le tabelle 03, 04 e 05 sono le sue righe per ambito, senza copie).
--   * Tabelle nuove: regole_ruolo_corso (02), rischio_ateco (06), gruppi_primo_soccorso (07), gruppi_tariffa_inail (08).
--   * La colonna «applica» è la spunta manuale «questa è la riga da applicare»; finché i dati non sono collegati al programma
--     non è usata da nessun calcolo.
-- Dati iniziali: inseriti SOLO se la tabella è vuota. Rischio ATECO: PDF Vega Formazione PS00007 rev 0.4 (fonte provvisoria,
--   ATECO 2007, non l'allegato ufficiale). Gruppo primo soccorso: soglie da verificare sul D.M. 388/2003.
-- Idempotente: si può rilanciare senza duplicare nulla.

BEGIN;

-- 01 – Ruoli di sicurezza (colonne aggiuntive)
ALTER TABLE public.ruoli_sicurezza ADD COLUMN IF NOT EXISTS codice text;
ALTER TABLE public.ruoli_sicurezza ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'ruolo';
ALTER TABLE public.ruoli_sicurezza ADD COLUMN IF NOT EXISTS richiede text;
ALTER TABLE public.ruoli_sicurezza ADD COLUMN IF NOT EXISTS applica boolean NOT NULL DEFAULT false;
UPDATE public.ruoli_sicurezza SET codice = 'LAVORATORE', tipo = 'ruolo', richiede = NULL WHERE nome = 'Lavoratore' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'PREPOSTO', tipo = 'ruolo', richiede = NULL WHERE nome = 'Preposto' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'ADD_ANTINCENDIO', tipo = 'ruolo', richiede = NULL WHERE nome = 'Addetto Antincendio' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'ADD_DAE', tipo = 'ruolo', richiede = NULL WHERE nome = 'Addetto BLSD / Defibrillatore' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'ADD_EVACUAZIONE', tipo = 'ruolo', richiede = NULL WHERE nome = 'Addetto all''evacuazione' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'RLS', tipo = 'ruolo', richiede = NULL WHERE nome = 'RLS' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'ASPP', tipo = 'ruolo', richiede = NULL WHERE nome = 'ASPP' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'INC_PRIVACY', tipo = 'ruolo', richiede = NULL WHERE nome = 'Privacy' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'INC_REG_ANTINCENDIO', tipo = 'incarico', richiede = 'Addetto Antincendio' WHERE nome = 'Addetto al registro antincendio' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'INC_DPI', tipo = 'incarico', richiede = 'Lavoratore' WHERE nome = 'Responsabile distribuzione D.P.I.' AND codice IS NULL;
UPDATE public.ruoli_sicurezza SET codice = 'INC_SDS', tipo = 'incarico', richiede = 'Lavoratore' WHERE nome = 'Responsabile custodia SDS' AND codice IS NULL;

-- 03, 04, 05 – Soglie (spunta manuale)
ALTER TABLE public.soglie_ditta ADD COLUMN IF NOT EXISTS applica boolean NOT NULL DEFAULT false;

-- 02 – Regole ruolo → corso
CREATE TABLE IF NOT EXISTS public.regole_ruolo_corso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruolo text NOT NULL,
  parametro text NOT NULL DEFAULT 'nessuno',
  valore text NOT NULL DEFAULT '—',
  corso_base text,
  corso_aggiornamento text,
  ordine integer NOT NULL DEFAULT 0,
  applica boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regole_ruolo_corso TO anon, authenticated;
GRANT ALL ON public.regole_ruolo_corso TO service_role;
ALTER TABLE public.regole_ruolo_corso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS regole_ruolo_corso_public_all ON public.regole_ruolo_corso;
CREATE POLICY regole_ruolo_corso_public_all ON public.regole_ruolo_corso FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_regole_ruolo_corso_upd ON public.regole_ruolo_corso;
CREATE TRIGGER trg_regole_ruolo_corso_upd BEFORE UPDATE ON public.regole_ruolo_corso FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.regole_ruolo_corso (ruolo, parametro, valore, corso_base, corso_aggiornamento, ordine)
SELECT * FROM (VALUES
  ('Lavoratore', 'nessuno', '—', 'SIC-GEN-04', NULL, 1),
  ('Lavoratore', 'rischio ATECO', 'basso', 'SIC-SPE-04', 'SIC-AGG-06', 2),
  ('Lavoratore', 'rischio ATECO', 'medio', 'SIC-SPE-08', 'SIC-AGG-06', 3),
  ('Lavoratore', 'rischio ATECO', 'alto', 'SIC-SPE-12', 'SIC-AGG-06', 4),
  ('Preposto', 'nessuno', '—', 'PRP-BAS-12', 'PRP-AGG-06', 5),
  ('Add. Antincendio', 'livello', '1', 'VFF-FOR1-4', 'VFF-FOR1A2', 6),
  ('Add. Antincendio', 'livello', '2', 'VFF-FOR2-8', 'VFF-FOR2A5', 7),
  ('Add. Antincendio', 'livello', '3', 'VFF-FOR316', 'VFF-FOR3A8', 8),
  ('Add. Primo Soccorso', 'gruppo', 'B', 'PSO-BCB-12', 'PSO-AgB-04', 9),
  ('Add. Primo Soccorso', 'gruppo', 'C', 'PSO-BCB-12', 'PSO-AgB-04', 10),
  ('Add. Primo Soccorso', 'gruppo', 'A', 'PSO-GAB-16', 'PSO-GAA-06', 11),
  ('Add. Defibrillatore', 'nessuno', '—', 'BLS-BAS-05', 'BLS-AGG-02', 12),
  ('Add. evacuazione', 'nessuno', '—', 'EME-EVA-02', 'EME-EAA-02', 13),
  ('RLS', 'fascia lavoratori', '15-49', 'RLS-BAS-32', 'RLS-AGG-04', 14),
  ('RLS', 'fascia lavoratori', '50+', 'RLS-BAS-32', 'RLS-AGG-08', 15),
  ('ASPP', 'nessuno', '—', 'SIC-ASPP-A', NULL, 16),
  ('ASPP', 'nessuno', '—', 'SIC-ASPP-B', 'SIC-ASPP-AGG', 17),
  ('ASPP', 'settore', 'SP1', 'SIC-ASPP-B-SP1', 'SIC-ASPP-AGG', 18),
  ('ASPP', 'settore', 'SP2', 'SIC-ASPP-B-SP2', 'SIC-ASPP-AGG', 19),
  ('ASPP', 'settore', 'SP3', 'SIC-ASPP-B-SP3', 'SIC-ASPP-AGG', 20),
  ('ASPP', 'settore', 'SP4', 'SIC-ASPP-B-SP4', 'SIC-ASPP-AGG', 21),
  ('ASPP', 'settore', 'SP5', 'SIC-ASPP-B-SP5', 'SIC-ASPP-AGG', 22),
  ('Privacy', 'nessuno', '—', 'PRIVACY-B04', 'PRIVACY-A01', 23)
) AS v(ruolo, parametro, valore, corso_base, corso_aggiornamento, ordine)
WHERE NOT EXISTS (SELECT 1 FROM public.regole_ruolo_corso);

-- 06 – Rischio per codice ATECO
CREATE TABLE IF NOT EXISTS public.rischio_ateco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codice text NOT NULL,
  descrizione text NOT NULL DEFAULT '',
  rischio text NOT NULL CHECK (rischio IN ('basso', 'medio', 'alto')),
  versione_ateco text NOT NULL DEFAULT '2007',
  fonte text,
  ordine integer NOT NULL DEFAULT 0,
  applica boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rischio_ateco TO anon, authenticated;
GRANT ALL ON public.rischio_ateco TO service_role;
ALTER TABLE public.rischio_ateco ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rischio_ateco_public_all ON public.rischio_ateco;
CREATE POLICY rischio_ateco_public_all ON public.rischio_ateco FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_rischio_ateco_upd ON public.rischio_ateco;
CREATE TRIGGER trg_rischio_ateco_upd BEFORE UPDATE ON public.rischio_ateco FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.rischio_ateco (codice, descrizione, rischio, ordine, versione_ateco, fonte)
SELECT v.codice, v.descrizione, v.rischio, v.ordine, '2007', 'Vega Formazione PS00007 rev 0.4 (provvisoria)'
FROM (VALUES
  ('01', 'Agricoltura, silvicoltura, pesca e acquacoltura', 'medio', 1),
  ('02', 'Agricoltura, silvicoltura, pesca e acquacoltura', 'medio', 2),
  ('03', 'Agricoltura, silvicoltura, pesca e acquacoltura', 'medio', 3),
  ('05', 'Estrazione di minerali da cave e miniere', 'alto', 4),
  ('06', 'Estrazione di minerali da cave e miniere', 'alto', 5),
  ('07', 'Estrazione di minerali da cave e miniere', 'alto', 6),
  ('08', 'Estrazione di minerali da cave e miniere', 'alto', 7),
  ('09', 'Estrazione di minerali da cave e miniere', 'alto', 8),
  ('10', 'Industria alimentare e delle bevande', 'alto', 9),
  ('11', 'Industria alimentare e delle bevande', 'alto', 10),
  ('12', 'Industria del tabacco', 'alto', 11),
  ('13', 'Industrie tessili, confezione di abbigliamento, articoli in pelle e pelliccia', 'alto', 12),
  ('14', 'Industrie tessili, confezione di abbigliamento, articoli in pelle e pelliccia', 'alto', 13),
  ('15', 'Conciarie e cuoio', 'alto', 14),
  ('16', 'Industria del legno', 'alto', 15),
  ('17', 'Fabbricazione di carta e prodotti di carta, stampa e riproduzione di supporti registrati', 'alto', 16),
  ('18', 'Fabbricazione di carta e prodotti di carta, stampa e riproduzione di supporti registrati', 'alto', 17),
  ('19', 'Fabbricazione di coke e prodotti derivanti dalla raffinazione del petrolio', 'alto', 18),
  ('20', 'Fabbricazione di prodotti chimici', 'alto', 19),
  ('21', 'Fabbricazione di prodotti farmaceutici di base e di preparati farmaceutici', 'alto', 20),
  ('22', 'Fabbricazione di articoli in gomma e materie plastiche', 'alto', 21),
  ('23', 'Fabbricazione di altri prodotti della lavorazione di minerali non metalliferi', 'alto', 22),
  ('24', 'Metallurgia', 'alto', 23),
  ('25', 'Fabbricazione di prodotti in metallo, macchinari ed apparecchi meccanici', 'alto', 24),
  ('26', 'Fabbricazione di impianti ed apparecchi elettrici ed elettronici', 'alto', 25),
  ('27', 'Fabbricazione di impianti ed apparecchi elettrici ed elettronici', 'alto', 26),
  ('28', 'Fabbricazione di prodotti in metallo, macchinari ed apparecchi meccanici', 'alto', 27),
  ('29', 'Fabbricazione di autoveicoli, rimorchi e altri mezzi di trasporto', 'alto', 28),
  ('30', 'Fabbricazione di autoveicoli, rimorchi e altri mezzi di trasporto', 'alto', 29),
  ('31', 'Fabbricazione di mobili', 'alto', 30),
  ('32', 'Altre industrie manifatturiere', 'alto', 31),
  ('33', 'Fabbricazione di autoveicoli, rimorchi e altri mezzi di trasporto', 'alto', 32),
  ('35', 'Fornitura di energia elettrica, gas, vapore e aria condizionata', 'alto', 33),
  ('36', 'Fornitura di acqua, reti fognarie, gestione dei rifiuti e risanamento', 'alto', 34),
  ('37', 'Fornitura di acqua, reti fognarie, gestione dei rifiuti e risanamento', 'alto', 35),
  ('38', 'Fornitura di acqua, reti fognarie, gestione dei rifiuti e risanamento', 'alto', 36),
  ('39', 'Fornitura di acqua, reti fognarie, gestione dei rifiuti e risanamento', 'alto', 37),
  ('41', 'Costruzioni di edifici, ingegneria civile, lavori di costruzione specializzati', 'alto', 38),
  ('42', 'Costruzioni di edifici, ingegneria civile, lavori di costruzione specializzati', 'alto', 39),
  ('43', 'Costruzioni di edifici, ingegneria civile, lavori di costruzione specializzati', 'alto', 40),
  ('45', 'Commercio all''ingrosso e al dettaglio; riparazione di autoveicoli e motocicli', 'basso', 41),
  ('46', 'Commercio all''ingrosso e al dettaglio; riparazione di autoveicoli e motocicli', 'basso', 42),
  ('47', 'Commercio all''ingrosso e al dettaglio; riparazione di autoveicoli e motocicli', 'basso', 43),
  ('49', 'Trasporto, logistica e magazzinaggio', 'medio', 44),
  ('50', 'Trasporto, logistica e magazzinaggio', 'medio', 45),
  ('51', 'Trasporto, logistica e magazzinaggio', 'medio', 46),
  ('52', 'Trasporto, logistica e magazzinaggio', 'medio', 47),
  ('53', 'Trasporto, logistica e magazzinaggio', 'medio', 48),
  ('55', 'Servizi di ristorazione e di alloggio', 'basso', 49),
  ('56', 'Servizi di ristorazione e di alloggio', 'basso', 50),
  ('58', 'Servizi di informazione e comunicazione', 'basso', 51),
  ('59', 'Servizi di informazione e comunicazione', 'basso', 52),
  ('60', 'Servizi di informazione e comunicazione', 'basso', 53),
  ('61', 'Servizi di informazione e comunicazione', 'basso', 54),
  ('62', 'Servizi di informazione e comunicazione', 'basso', 55),
  ('63', 'Servizi di informazione e comunicazione', 'basso', 56),
  ('64', 'Attività finanziarie e assicurative', 'basso', 57),
  ('65', 'Attività finanziarie e assicurative', 'basso', 58),
  ('66', 'Attività finanziarie e assicurative', 'basso', 59),
  ('68', 'Attività immobiliari', 'basso', 60),
  ('69', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 61),
  ('70', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 62),
  ('71', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 63),
  ('72', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 64),
  ('73', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 65),
  ('74', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 66),
  ('75', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 67),
  ('77', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 68),
  ('78', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 69),
  ('79', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 70),
  ('80', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 71),
  ('81', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 72),
  ('82', 'Attività professionali, scientifiche e tecniche; servizi di supporto alle imprese', 'basso', 73),
  ('84', 'Pubblica amministrazione e difesa; assicurazione sociale obbligatoria', 'medio', 74),
  ('85', 'Istruzione', 'medio', 75),
  ('86', 'Sanità e assistenza sociale residenziale', 'alto', 76),
  ('87', 'Sanità e assistenza sociale residenziale', 'alto', 77),
  ('88', 'Assistenza sociale non residenziale', 'medio', 78),
  ('90', 'Attività artistiche, sportive, di intrattenimento e divertimento', 'basso', 79),
  ('91', 'Attività artistiche, sportive, di intrattenimento e divertimento', 'basso', 80),
  ('92', 'Attività artistiche, sportive, di intrattenimento e divertimento', 'basso', 81),
  ('93', 'Attività artistiche, sportive, di intrattenimento e divertimento', 'basso', 82),
  ('94', 'Altre attività di servizi', 'basso', 83),
  ('95', 'Altre attività di servizi', 'basso', 84),
  ('96', 'Altre attività di servizi', 'basso', 85),
  ('97', 'Servizi domestici', 'basso', 86),
  ('98', 'Servizi domestici', 'basso', 87),
  ('99', 'Organizzazioni extraterritoriali', 'basso', 88)
) AS v(codice, descrizione, rischio, ordine)
WHERE NOT EXISTS (SELECT 1 FROM public.rischio_ateco);

-- 07 – Gruppo di primo soccorso
CREATE TABLE IF NOT EXISTS public.gruppi_primo_soccorso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lavoratori text NOT NULL,
  indice_inail text NOT NULL DEFAULT 'qualsiasi',
  gruppo text NOT NULL,
  nota text,
  ordine integer NOT NULL DEFAULT 0,
  applica boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gruppi_primo_soccorso TO anon, authenticated;
GRANT ALL ON public.gruppi_primo_soccorso TO service_role;
ALTER TABLE public.gruppi_primo_soccorso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gruppi_primo_soccorso_public_all ON public.gruppi_primo_soccorso;
CREATE POLICY gruppi_primo_soccorso_public_all ON public.gruppi_primo_soccorso FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_gruppi_primo_soccorso_upd ON public.gruppi_primo_soccorso;
CREATE TRIGGER trg_gruppi_primo_soccorso_upd BEFORE UPDATE ON public.gruppi_primo_soccorso FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.gruppi_primo_soccorso (lavoratori, indice_inail, gruppo, nota, ordine)
SELECT * FROM (VALUES
  ('1-2', 'qualsiasi', 'C', NULL, 1),
  ('3-5', 'fino a 4', 'B', NULL, 2),
  ('3-5', 'oltre 4', 'B', 'Da verificare sul D.M. 388/2003', 3),
  ('6 o più', 'fino a 4', 'B', 'Da verificare sul D.M. 388/2003', 4),
  ('6 o più', 'oltre 4', 'A', 'Da verificare sul D.M. 388/2003', 5),
  ('6 o più, agricoltura a tempo indeterminato', '—', 'A', 'Da verificare sul D.M. 388/2003', 6)
) AS v(lavoratori, indice_inail, gruppo, nota, ordine)
WHERE NOT EXISTS (SELECT 1 FROM public.gruppi_primo_soccorso);

-- 08 – Gruppi di tariffa INAIL (vuota: l'indice di inabilità permanente va caricato; il PDF dei premi 2019 è solo documento fonte)
CREATE TABLE IF NOT EXISTS public.gruppi_tariffa_inail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gestione text,
  voce text NOT NULL,
  descrizione text NOT NULL DEFAULT '',
  tasso numeric(8,2),
  indice_inabilita numeric(8,2),
  anno integer,
  oltre_4 boolean NOT NULL DEFAULT false,
  ordine integer NOT NULL DEFAULT 0,
  applica boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gruppi_tariffa_inail TO anon, authenticated;
GRANT ALL ON public.gruppi_tariffa_inail TO service_role;
ALTER TABLE public.gruppi_tariffa_inail ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gruppi_tariffa_inail_public_all ON public.gruppi_tariffa_inail;
CREATE POLICY gruppi_tariffa_inail_public_all ON public.gruppi_tariffa_inail FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_gruppi_tariffa_inail_upd ON public.gruppi_tariffa_inail;
CREATE TRIGGER trg_gruppi_tariffa_inail_upd BEFORE UPDATE ON public.gruppi_tariffa_inail FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

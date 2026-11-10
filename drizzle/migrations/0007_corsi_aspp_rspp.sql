-- 0007 — Corsi ASPP e RSPP nel catalogo tipi_corso (17 corsi).
-- Idempotente: un corso con lo stesso codice non viene reinserito.
-- «Non scade», «NA» e 0 ore di aggiornamento sono salvati come NULL (nella tabella appaiono «N/A» / «—»).
-- Accodati in fondo all'elenco (ordine = massimo attuale + progressivo).
WITH base AS (SELECT COALESCE(MAX(ordine), 0) AS m FROM public.tipi_corso)
INSERT INTO public.tipi_corso
  (codice, nome_corso, macro_categoria, livello_specifico, ore_minime_legge, durata_validita_anni,
   anni_aggiornamento, ore_aggiornamento, codice_corso_aggiornamento, visibile_lavoratore, ordine)
SELECT v.codice, v.nome_corso, 'Sicurezza Lavoratori', v.livello, v.ore, v.validita,
       v.agg_anni, v.agg_ore, v.cod_agg, true, base.m + v.n
FROM base,
(VALUES
  (1,'SIC-ASPP-A','ASPP modulo A BASE Addetto al Servizio di prevenzione e protezione A1-28','Base',28,NULL,NULL,NULL,NULL),
  (2,'SIC-ASPP-B','ASPP modulo B COMUNE Addetto al Servizio di prevenzione e protezione 48','COMUNE',48,5,5,20,'SIC-ASPP-AGG'),
  (3,'SIC-ASPP-AGG','ASPP AGGIORNAMENTO modulo B Addetto al Servizio di prevenzione e protezione 20','COMUNE',20,5,5,20,'SIC-ASPP-AGG'),
  (4,'SIC-ASPP-B-SP1','ASPP Modulo B-SP1 – Agricoltura, silvicoltura e zootecnia','SPECIALISTICO',16,5,5,20,'SIC-ASPP-AGG'),
  (5,'SIC-ASPP-B-SP2','ASPP Modulo B-SP2 – Pesca','SPECIALISTICO',12,5,5,20,'SIC-ASPP-AGG'),
  (6,'SIC-ASPP-B-SP3','ASPP Modulo B-SP3 – Costruzioni','SPECIALISTICO',16,5,5,20,'SIC-ASPP-AGG'),
  (7,'SIC-ASPP-B-SP4','ASPP Modulo B-SP4 – Sanità residenziale','SPECIALISTICO',12,5,5,20,'SIC-ASPP-AGG'),
  (8,'SIC-ASPP-B-SP5','ASPP Modulo B-SP5 – Chimico-petrolchimico','SPECIALISTICO',16,5,5,20,'SIC-ASPP-AGG'),
  (9,'SIC-RSPP-A','RSPP modulo A RESPONSABILE del Servizio di prevenzione e protezione 28','Base',28,NULL,NULL,NULL,NULL),
  (10,'SIC-RSPP-B','RSPP modulo B RESPONSABILE del Servizio di prevenzione e protezione 48','COMUNE',48,5,5,40,'SIC-RSPP-AGG'),
  (11,'SIC-RSPP-C','RSPP modulo C RESPONSABILE del Servizio di prevenzione e protezione 24','BASE',24,5,5,40,'SIC-RSPP-AGG'),
  (12,'SIC-RSPP-AGG','RSPP AGGIORNAMENTO modulo B RESPONSABILE del Servizio di prevenzione e protezione 40','SPECIALISTICO',40,5,5,40,'SIC-RSPP-AGG'),
  (13,'SIC-RSPP-B-SP1','RSPP Modulo B-SP1 – Agricoltura, silvicoltura e zootecnia','SPECIALISTICO',16,5,5,40,'SIC-RSPP-AGG'),
  (14,'SIC-RSPP-B-SP2','RSPP Modulo B-SP2 – Pesca','SPECIALISTICO',12,5,5,40,'SIC-RSPP-AGG'),
  (15,'SIC-RSPP-B-SP3','RSPP Modulo B-SP3 – Costruzioni','SPECIALISTICO',16,5,5,40,'SIC-RSPP-AGG'),
  (16,'SIC-RSPP-B-SP4','RSPP Modulo B-SP4 – Sanità residenziale','SPECIALISTICO',12,5,5,40,'SIC-RSPP-AGG'),
  (17,'SIC-RSPP-B-SP5','RSPP Modulo B-SP5 – Chimico-petrolchimico','SPECIALISTICO',16,5,5,40,'SIC-RSPP-AGG')
) AS v(n, codice, nome_corso, livello, ore, validita, agg_anni, agg_ore, cod_agg)
WHERE NOT EXISTS (SELECT 1 FROM public.tipi_corso t WHERE t.codice = v.codice);

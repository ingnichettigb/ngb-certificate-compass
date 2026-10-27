UPDATE public.tipi_corso SET codice_corso_aggiornamento='SIC-AGG-06' WHERE codice='SIC-AGG-06';
UPDATE public.tipi_corso SET anni_aggiornamento=5, ore_aggiornamento=6, codice_corso_aggiornamento='SIC-AGG-06' WHERE codice IN ('SIC-SPE-04','SIC-SPE-08','SIC-SPE-12');
UPDATE public.tipi_corso SET codice_corso_aggiornamento='PRP-AGG-06' WHERE codice IN ('PRP-AGG-06','PRP-BAS-12');
UPDATE public.tipi_corso SET nome_corso='Evacuazione / Emergenze dell''Istituto', durata_validita_anni=5, anni_aggiornamento=5, ore_aggiornamento=2, codice_corso_aggiornamento='EME-EAA-02' WHERE codice='EME-EVA-02';
UPDATE public.tipi_corso SET codice_corso_aggiornamento='ANT-L1A-02' WHERE codice IN ('ANT-L1A-02','ANT-L1B-04');
UPDATE public.tipi_corso SET codice_corso_aggiornamento='ANT-L2A-05' WHERE codice IN ('ANT-L2A-05','ANT-L2B-08');
UPDATE public.tipi_corso SET codice_corso_aggiornamento='PSO-BCB-12' WHERE codice IN ('PSO-AgB-04','PSO-BCB-12');
UPDATE public.tipi_corso SET codice_corso_aggiornamento='PSO-GAA-06' WHERE codice IN ('PSO-GAA-06','PSO-GAB-16');
UPDATE public.tipi_corso SET codice_corso_aggiornamento='BLS-AGG-02' WHERE codice IN ('BLS-AGG-02','BLS-BAS-05');
INSERT INTO public.tipi_corso (codice,nome_corso,macro_categoria,livello_specifico,ore_minime_legge,durata_validita_anni,anni_aggiornamento,ore_aggiornamento,codice_corso_aggiornamento,visibile_lavoratore,ordine)
SELECT 'EME-PRO-02','Prova di Evacuazione / Emergenze','Emergenze','Base',2,1,1,2,'EME-PRO-02',true,0
WHERE NOT EXISTS (SELECT 1 FROM public.tipi_corso WHERE codice='EME-PRO-02');
INSERT INTO public.tipi_corso (codice,nome_corso,macro_categoria,livello_specifico,ore_minime_legge,durata_validita_anni,anni_aggiornamento,ore_aggiornamento,codice_corso_aggiornamento,visibile_lavoratore,ordine)
SELECT 'EME-EAA-02','Aggiornamento Evacuazione / Emergenze dell''Istituto','Emergenze','Base',2,1,5,2,'EME-EAA-02',true,0
WHERE NOT EXISTS (SELECT 1 FROM public.tipi_corso WHERE codice='EME-EAA-02');
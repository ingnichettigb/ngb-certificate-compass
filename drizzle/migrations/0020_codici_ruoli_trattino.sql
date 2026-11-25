-- File:      0020_codici_ruoli_trattino.sql
-- Percorso:  drizzle/migrations/0020_codici_ruoli_trattino.sql
-- Data creaz: 23/11/2026
-- Scopo:     convenzione unica per i codici: MAIUSCOLO con il TRATTINO (come i corsi: SIC-GEN-04). I codici dei ruoli con il trattino basso
--            (ADD_DAE, INC_PRIVACY, DL_RSPP, OPER_PLE_II_831 …) diventano ADD-DAE, INC-PRIVACY, DL-RSPP, OPER-PLE-II-831 …
-- Contenuto: solo public.ruoli_sicurezza.codice. Le regole della Tabella 02 (ruolo_codice) e «Richiede» seguono da sole: le chiavi esterne
--            della 0017 hanno ON UPDATE CASCADE. Nessuna tabella nuova. Idempotente. Si ferma, senza cambiare nulla, se due codici diventassero uguali.
-- Ordine:    eseguire PRIMA di pubblicare il codice che usa i codici col trattino. Fare PRIMA il backup dall'app, e DOPO la migrazione un backup nuovo
--            (un backup fatto prima ripristinerebbe i vecchi codici).

BEGIN;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ruoli_sicurezza a
      JOIN public.ruoli_sicurezza b ON b.id <> a.id AND b.codice = replace(a.codice, '_', '-')
     WHERE a.codice LIKE '%\_%'
  ) THEN
    RAISE EXCEPTION 'Due ruoli avrebbero lo stesso codice dopo la conversione: nessuna modifica fatta';
  END IF;
END $$;

UPDATE public.ruoli_sicurezza
   SET codice = replace(codice, '_', '-')
 WHERE codice LIKE '%\_%';

COMMIT;

-- VERIFICA (sola lettura): attesi 0 / 0 / 0 / 0
SELECT 'ruoli con il trattino basso nel codice' AS controllo, count(*) AS trovato FROM public.ruoli_sicurezza WHERE codice LIKE '%\_%'
UNION ALL SELECT 'regole della Tabella 02 con ruolo_codice col trattino basso', count(*) FROM public.regole_ruolo_corso WHERE ruolo_codice LIKE '%\_%'
UNION ALL SELECT '«Richiede» col trattino basso o che non punta a un ruolo', count(*) FROM public.ruoli_sicurezza r
  WHERE r.richiede IS NOT NULL AND (r.richiede LIKE '%\_%' OR NOT EXISTS (SELECT 1 FROM public.ruoli_sicurezza q WHERE q.codice = r.richiede))
UNION ALL SELECT 'regole della Tabella 02 senza un ruolo valido', count(*) FROM public.regole_ruolo_corso g
  WHERE NOT EXISTS (SELECT 1 FROM public.ruoli_sicurezza r WHERE r.codice = g.ruolo_codice);

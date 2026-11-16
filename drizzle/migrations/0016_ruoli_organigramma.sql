-- File:      0016_ruoli_organigramma.sql
-- Percorso:  drizzle/migrations/0016_ruoli_organigramma.sql
-- Data creaz: 16/11/2026
-- Revisioni:
--   rev 1 — 16/11/2026 — Fonte unica per i nominativi dell'organigramma A3 e delle Nomine:
--                        registro antincendio, distribuzione DPI e custodia SDS diventano ruoli di public.ruoli_sicurezza
--                        (assegnati ai lavoratori in public.dipendenti_ruoli, per sede), come Antincendio e Primo soccorso.
--                        Cognome, nome e luogo di nascita dei lavoratori sempre in MAIUSCOLO anche a livello di database.
-- Regole:
--   * I tre ruoli NON hanno macro-categoria (resta NULL): così non finiscono nei gruppi corsi (Antincendio, Preposti…)
--     e la scheda del lavoratore non chiede corsi per questi incarichi.
--   * I nomi già scritti nelle voci dell'organigramma si abbinano al lavoratore in forza (cognome+nome, anche invertiti,
--     senza distinguere maiuscole/minuscole). L'incarico va a TUTTE le sedi attive: la tavola finora era uguale per ogni plesso.
--   * I nomi che non si abbinano (forma breve «BARDELLI M.», omonimi, nomi inesistenti) NON si perdono: restano nella voce
--     e l'organigramma li mostra come «da abbinare».
--   * Le voci «Evacuazione – figure di classe» e «Categorie di preposti» diventano note (testo libero).
--   * Idempotente: si può rilanciare senza duplicare nulla.

BEGIN;

-- 1. I tre ruoli (senza macro-categoria)
INSERT INTO public.ruoli_sicurezza (nome, descrizione, macro_categoria, obbligatorio_tutti, ordine)
SELECT v.nome, v.descrizione, NULL, false, (SELECT COALESCE(MAX(ordine), 0) FROM public.ruoli_sicurezza) + v.n
FROM (VALUES
  (1, 'Incaricato registro controlli',  'Incaricati della gestione del registro antincendio (organigramma e Nomine)'),
  (2, 'Incaricato distribuzione DPI',   'Incaricati della distribuzione e custodia dei DPI (organigramma e Nomine)'),
  (3, 'Incaricato custodia SDS',        'Incaricati della distribuzione e custodia delle schede di sicurezza (organigramma e Nomine)')
) AS v(n, nome, descrizione)
ON CONFLICT (nome) DO NOTHING;

-- 2. Voci dell'organigramma: collegamento ai ruoli e passaggio dei nomi già scritti
DO $$
DECLARE
  voci     jsonb;
  nuove    jsonb := '[]'::jsonb;
  voce     jsonb;
  titolo   text;
  chiave   text;
  nome_rl  text;
  ruolo    uuid;
  grezzo   jsonb;
  pulito   text;
  trovati  uuid[];
  rimasti  jsonb;
  abbinati int := 0;
  rimasti_tot int := 0;
BEGIN
  SELECT organigramma_voci INTO voci FROM public.ditta WHERE id = true;
  IF voci IS NULL OR jsonb_typeof(voci) <> 'array' THEN
    RAISE NOTICE 'Nessuna voce di organigramma da migrare.';
  ELSE
    FOR voce IN SELECT * FROM jsonb_array_elements(voci) LOOP
      titolo := COALESCE(voce->>'titolo', '');

      -- Evacuazione/figure di classe e categorie di preposti: testo libero
      IF titolo ~* 'figure\s+di\s+classe' OR titolo ~* 'categori\w*\s+(di\s+)?prepost' OR titolo ~* 'prepost\w*\s+di\s+laborator' THEN
        voce := (voce - 'ruolo_id') || jsonb_build_object('tipo', 'nota');
      END IF;

      chiave := CASE
        WHEN titolo ~* 'registro\s+antincendio'      THEN 'registro'
        WHEN titolo ~* '\yd\.?\s?p\.?\s?i\y'         THEN 'dpi'
        WHEN titolo ~* '\ysds\y'                      THEN 'sds'
        ELSE NULL
      END;

      IF chiave IS NOT NULL THEN
        nome_rl := CASE chiave
          WHEN 'registro' THEN 'Incaricato registro controlli'
          WHEN 'dpi'      THEN 'Incaricato distribuzione DPI'
          ELSE                 'Incaricato custodia SDS'
        END;
        SELECT id INTO ruolo FROM public.ruoli_sicurezza WHERE nome = nome_rl;

        rimasti := '[]'::jsonb;
        FOR grezzo IN SELECT * FROM jsonb_array_elements(COALESCE(voce->'nomi', '[]'::jsonb)) LOOP
          -- toglie l'asterisco finale e normalizza spazi e maiuscole
          pulito := upper(btrim(regexp_replace(regexp_replace(grezzo #>> '{}', '\s*\*+\s*$', ''), '\s+', ' ', 'g')));
          IF pulito = '' THEN CONTINUE; END IF;

          SELECT array_agg(d.id) INTO trovati
          FROM public.dipendenti d
          WHERE d.stato_lavoratore <> 'cessato'
            AND (
              upper(btrim(regexp_replace(d.cognome || ' ' || COALESCE(d.nome, ''), '\s+', ' ', 'g'))) = pulito
              OR upper(btrim(regexp_replace(COALESCE(d.nome, '') || ' ' || d.cognome, '\s+', ' ', 'g'))) = pulito
            );

          IF trovati IS NOT NULL AND array_length(trovati, 1) = 1 THEN
            -- incarico in tutte le sedi attive (la tavola era uguale per ogni plesso)
            INSERT INTO public.dipendenti_ruoli (dipendente_id, ruolo_id, sede_id)
            SELECT trovati[1], ruolo, s.id FROM public.sedi s WHERE s.attiva
            ON CONFLICT (dipendente_id, ruolo_id, sede_id) DO NOTHING;
            abbinati := abbinati + 1;
          ELSE
            rimasti := rimasti || to_jsonb(btrim(grezzo #>> '{}'));
            rimasti_tot := rimasti_tot + 1;
            RAISE NOTICE 'NON ABBINATO (voce "%"): "%"', titolo, grezzo #>> '{}';
          END IF;
        END LOOP;

        voce := voce || jsonb_build_object('tipo', 'ruolo', 'ruolo_id', ruolo, 'nomi', rimasti);
      END IF;

      nuove := nuove || jsonb_build_array(voce);
    END LOOP;

    UPDATE public.ditta SET organigramma_voci = nuove WHERE id = true;
    RAISE NOTICE 'Nomi abbinati: %, non abbinati (restano nella voce): %', abbinati, rimasti_tot;
  END IF;
END $$;

-- 3. Cognome, nome e luogo di nascita sempre in MAIUSCOLO (rete di sicurezza: l'app lo fa già, il DB no)
CREATE OR REPLACE FUNCTION public.dipendenti_maiuscolo() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.cognome := upper(btrim(regexp_replace(COALESCE(NEW.cognome, ''), '\s+', ' ', 'g')));
  IF NEW.nome IS NOT NULL THEN
    NEW.nome := upper(btrim(regexp_replace(NEW.nome, '\s+', ' ', 'g')));
  END IF;
  IF NEW.luogo_nascita IS NOT NULL THEN
    NEW.luogo_nascita := upper(btrim(regexp_replace(NEW.luogo_nascita, '\s+', ' ', 'g')));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_dip_maiuscolo ON public.dipendenti;
CREATE TRIGGER trg_dip_maiuscolo BEFORE INSERT OR UPDATE ON public.dipendenti
  FOR EACH ROW EXECUTE FUNCTION public.dipendenti_maiuscolo();

-- Sistema i dati già presenti (il trigger scatta sull'UPDATE e porta tutto in maiuscolo)
UPDATE public.dipendenti
SET cognome = cognome
WHERE cognome IS DISTINCT FROM upper(btrim(regexp_replace(cognome, '\s+', ' ', 'g')))
   OR nome IS DISTINCT FROM upper(btrim(regexp_replace(nome, '\s+', ' ', 'g')))
   OR luogo_nascita IS DISTINCT FROM upper(btrim(regexp_replace(luogo_nascita, '\s+', ' ', 'g')));

COMMIT;

/*
 * File:           correggi-nome-organigramma-bardelli.sql
 * Percorso:       sql/correggi-nome-organigramma-bardelli.sql
 * Data creazione: 2026-11-16
 * Descrizione:    Nelle voci dell'organigramma (tabella ditta, colonna organigramma_voci) il nome è scritto
 *                 «Bardelli Mariacristina» (3 voci: registro antincendio, custodia SDS, distribuzione DPI),
 *                 mentre nell'anagrafica c'è un solo lavoratore: BARDELLI MARIA CRISTINA (ATA, in forza).
 *                 Sostituisce SOLO quella scrittura con il nome dell'anagrafica, così nelle Nomine la persona compare una volta sola.
 *                 Non tocca le altre voci né gli altri nomi. Rieseguibile senza effetti (se non trova il nome non cambia nulla).
 *
 * PASSO 1 — VERIFICA (sola lettura): deve restituire le 3 voci.
 */
SELECT v->>'titolo' AS voce, n AS nome_scritto
FROM public.ditta d,
     jsonb_array_elements(d.organigramma_voci::jsonb) v,
     jsonb_array_elements_text(v->'nomi') n
WHERE n = 'Bardelli Mariacristina';

/* PASSO 2 — CORREZIONE */
UPDATE public.ditta d
SET organigramma_voci = (
  SELECT jsonb_agg(
           CASE
             WHEN jsonb_typeof(t.v->'nomi') = 'array' THEN
               jsonb_set(
                 t.v,
                 '{nomi}',
                 (SELECT COALESCE(
                           jsonb_agg(
                             CASE WHEN n.val = 'Bardelli Mariacristina' THEN 'BARDELLI MARIA CRISTINA' ELSE n.val END
                             ORDER BY n.ord
                           ),
                           '[]'::jsonb)
                    FROM jsonb_array_elements_text(t.v->'nomi') WITH ORDINALITY AS n(val, ord))
               )
             ELSE t.v
           END
           ORDER BY t.ord
         )
  FROM jsonb_array_elements(d.organigramma_voci::jsonb) WITH ORDINALITY AS t(v, ord)
)
WHERE d.id = true
  AND d.organigramma_voci::text LIKE '%Bardelli Mariacristina%';

/* PASSO 3 — CONTROLLO: ora deve mostrare «BARDELLI MARIA CRISTINA» nelle stesse 3 voci. */
SELECT v->>'titolo' AS voce, n AS nome_scritto
FROM public.ditta d,
     jsonb_array_elements(d.organigramma_voci::jsonb) v,
     jsonb_array_elements_text(v->'nomi') n
WHERE n ILIKE '%bardelli%';

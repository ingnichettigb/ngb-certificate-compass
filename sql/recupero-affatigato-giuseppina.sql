/*
 * File:           recupero-affatigato-giuseppina.sql
 * Percorso:       sql/recupero-affatigato-giuseppina.sql
 * Data creazione: 2026-11-06
 * Descrizione:    Inserisce nel registro corsi (attestati_caricati) l'attestato di Affatigato Giuseppina
 *                 già caricato come PDF. Non inserisce nulla se la riga esiste già (stesso lavoratore,
 *                 stesso corso, stessa data); in quel caso usare la UPDATE in fondo.
 *
 * PRIMA: esegui questa verifica. Se restituisce righe, la riga esiste già: salta l'INSERT e usa la UPDATE.
 *
 *   SELECT id, data_corso, url_foto_fronte, stato_validazione
 *   FROM public.attestati_caricati
 *   WHERE dipendente_id = 'ec4e148c-d76d-4560-bf31-5100648fb7df'
 *     AND tipo_corso_id = '380906e4-00a2-411a-9587-a79c8d6c130b'
 *     AND data_corso = '2026-10-19';
 */

INSERT INTO public.attestati_caricati (
  dipendente_id,
  codice_fiscale,
  tipo_corso_id,
  data_corso,
  data_scadenza_calcolata,
  url_foto_fronte,
  numero_attestato,
  stato_validazione,
  data_validazione
)
SELECT
  'ec4e148c-d76d-4560-bf31-5100648fb7df',
  'FFTGPP90L57G273Y',
  t.id,
  '2026-10-19',
  '2031-10-19',
  'Archivio Attestati Sicurezza/AFFATIGATO_GIUSEPPINA_FFTGPP90L57G273Y/2026-10_AFFATIGATO_GIUSEPPINA_FFTGPP90L57G273Y_AGGIORNAMENTO_EVACUAZIONE_EMERGENZE_DELL_ISTITUTO.pdf',
  '261019-' || t.codice,
  'Approvato',
  NOW()
FROM public.tipi_corso t
WHERE t.id = '380906e4-00a2-411a-9587-a79c8d6c130b'
  AND NOT EXISTS (
    SELECT 1
    FROM public.attestati_caricati a
    WHERE a.dipendente_id = 'ec4e148c-d76d-4560-bf31-5100648fb7df'
      AND a.tipo_corso_id = t.id
      AND a.data_corso = '2026-10-19'
  );

/*
 * SOLO se la verifica iniziale ha trovato la riga già presente (senza PDF): agganciala al file.
 *
 * UPDATE public.attestati_caricati
 * SET url_foto_fronte = 'Archivio Attestati Sicurezza/AFFATIGATO_GIUSEPPINA_FFTGPP90L57G273Y/2026-10_AFFATIGATO_GIUSEPPINA_FFTGPP90L57G273Y_AGGIORNAMENTO_EVACUAZIONE_EMERGENZE_DELL_ISTITUTO.pdf',
 *     data_scadenza_calcolata = '2031-10-19',
 *     stato_validazione = 'Approvato',
 *     data_validazione = NOW()
 * WHERE dipendente_id = 'ec4e148c-d76d-4560-bf31-5100648fb7df'
 *   AND tipo_corso_id = '380906e4-00a2-411a-9587-a79c8d6c130b'
 *   AND data_corso = '2026-10-19';
 */

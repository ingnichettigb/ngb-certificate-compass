/* File: 0011_ditta_intestazione_sito.sql | Percorso: drizzle migrations | Data creazione: 13/11/2026 | rev 1 — 13/11/2026 — Sito web e riga istituzionale della ditta, stampati nell'intestazione delle nomine. DA APPLICARE PRIMA di pubblicare il codice che li salva. */
ALTER TABLE public.ditta ADD COLUMN IF NOT EXISTS sito_web text;
ALTER TABLE public.ditta ADD COLUMN IF NOT EXISTS intestazione_ufficiale text;
COMMENT ON COLUMN public.ditta.intestazione_ufficiale IS 'Riga sopra il nome nell''intestazione delle lettere, es. MINISTERO DELL''ISTRUZIONE E DEL MERITO.';

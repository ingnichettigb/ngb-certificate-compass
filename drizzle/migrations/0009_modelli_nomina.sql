/* File: modelli_nomina.sql | Percorso: drizzle migrations | Data creazione: 12/11/2026 | rev 1 — 12/11/2026 — Testi modificabili delle lettere di nomina (una riga per tipo). Se manca la riga, l'app usa i testi di default. */
CREATE TABLE IF NOT EXISTS public.modelli_nomina (
  tipo text PRIMARY KEY,
  titolo text NOT NULL,
  oggetto text NOT NULL,
  introduzione text NOT NULL DEFAULT '',
  corpo text NOT NULL DEFAULT '',
  chiusura text NOT NULL DEFAULT '',
  nota_firma text NOT NULL DEFAULT '',
  etichetta_firma text NOT NULL DEFAULT 'Per presa visione',
  formazione text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelli_nomina TO anon, authenticated;
GRANT ALL ON public.modelli_nomina TO service_role;
ALTER TABLE public.modelli_nomina ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modelli_nomina_public_all ON public.modelli_nomina;
CREATE POLICY modelli_nomina_public_all ON public.modelli_nomina FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.modelli_nomina IS 'Testi delle nomine (primo soccorso, antincendio, DPI, …) con segnaposto {{nome}}, {{anno}}, {{istituto}}…';

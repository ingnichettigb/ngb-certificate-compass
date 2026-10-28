ALTER TABLE public.dipendenti
  ADD COLUMN IF NOT EXISTS tipo_contratto text NOT NULL DEFAULT 'indeterminato',
  ADD COLUMN IF NOT EXISTS data_assunzione date,
  ADD COLUMN IF NOT EXISTS data_fine_contratto date,
  ADD COLUMN IF NOT EXISTS stato_lavoratore text NOT NULL DEFAULT 'in_forza',
  ADD COLUMN IF NOT EXISTS data_cessazione date,
  ADD COLUMN IF NOT EXISTS note_contratto text;
ALTER TABLE public.dipendenti ADD CONSTRAINT dipendenti_tipo_contratto_chk CHECK (tipo_contratto IN ('indeterminato','determinato'));
ALTER TABLE public.dipendenti ADD CONSTRAINT dipendenti_stato_lavoratore_chk CHECK (stato_lavoratore IN ('in_forza','cessato'));
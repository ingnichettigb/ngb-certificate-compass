# Struttura del progetto

App web per l'archivio degli attestati di formazione sulla sicurezza (D.Lgs. 81/2008).
Costruita con Lovable: TanStack Start (React 19), Supabase, Tailwind 4, vitest. Gestore pacchetti: bun.

## Regole di lavoro (Lovable)

- Ogni commit su `main` si sincronizza con Lovable: il ramo deve restare sempre funzionante.
- Mai riscrivere la storia già pubblicata (niente force push, rebase, amend, squash).
- I file si dividono **per argomento**, non per numero di righe. Una pagina = una rotta sottile in `src/routes/`
  + una cartella in `src/features/<argomento>/`.
- Prima di ogni commit: `npx tsc --noEmit`, `npx eslint <file toccati>`, `npx vitest run`.
  I test di rotta (`*.flusso.test.tsx`) sono lenti: se vanno in timeout, riprovare con `--testTimeout=120000`.
- Dopo il push, la pubblicazione si fa dal pulsante Publish dell'editor Lovable.

## Cartelle principali

| Percorso | Contenuto |
| --- | --- |
| `src/routes/` | Rotte sottili (solo meta e componente). `routeTree.gen.ts` è generato: non modificarlo. |
| `src/features/` | Una cartella per argomento, ciascuna con `components/`, `hooks/` e, se serve, `types.ts`, `filtri.ts`, `ordinamento.ts`. |
| `src/components/` | Componenti condivisi tra più funzioni. `ui/` contiene i componenti shadcn. |
| `src/lib/` | Funzioni condivise. `lib/api/` raccoglie l'accesso ai dati Supabase, un file per tabella/argomento. |
| `src/integrations/supabase/` | Client, middleware di autenticazione e tipi generati del database. |
| `supabase/`, `drizzle/` | Configurazione e schema/migrazioni del database. |

## Rotte e funzioni

| Rotta | Funzione (`src/features/…`) | Scopo |
| --- | --- | --- |
| `/` | `home` | Pagina iniziale: contatori, QR del modulo lavoratore, accessi rapidi. |
| `/carica` | `carica` | Modulo per il lavoratore: dati, corso, foto dell'attestato. |
| `/hr` | `hr` | Dashboard HR: lista, filtri, dettaglio, validazione, email. |
| `/dipendenti` | `dipendenti` | Elenco dipendenti, scheda, incarichi, tabella attestati. |
| `/scadenze` | `scadenze` | Scadenze e scaduti, con filtri e ordinamento. |
| `/operatore` | `operatore` | Postazione operatore: coda di lavoro, lettura AI, archiviazione, email. |

Altre funzioni usate da più pagine: `ai` (provider di intelligenza artificiale), `documenti` (attestati archiviati e caricamento),
`impostazioni` (reparti, ruoli, categorie, insegnamento), `tipi-corso` (tabella dei tipi di corso ed export Excel).

## Componenti condivisi (`src/components/`)

- `CatturaOcr.tsx` — visualizzatore documenti con mirino OCR. Le parti sono in `cattura-ocr/`
  (caricamento e rotazione, pan e zoom, selezione OCR, barra strumenti, banner, area di visualizzazione).
- `IntestazioneOrdinabile.tsx` — intestazione di colonna ordinabile, usata da Dipendenti e Scadenze.
- `BackupBar`, `ImageViewer`, `UploadPreview`, `CampoSuggerito`, `DatiAziendaDialog`, `ImpostazioniDialog`, `TabellaRepartiDialog`.

## Test

- `*.test.ts(x)` accanto al codice; `__snapshots__/` accanto ai test di flusso.
- `src/test/setup.ts` prepara l'ambiente di test.

## Storico delle divisioni per argomento

- HR: `hr.tsx` diviso in lista, filtri, dettaglio, validazione, email e hook.
- Home: `routes/index.tsx` (336 righe) diviso in `features/home/`.
- OCR: `CatturaOcr.tsx` (452 righe) diviso in `components/cattura-ocr/`.
- Pulizia: due copie di `IntestazioneOrdinabile` unite; eliminati `lib/ruota-documento.ts` e `lib/email-eml.ts` (non usati).

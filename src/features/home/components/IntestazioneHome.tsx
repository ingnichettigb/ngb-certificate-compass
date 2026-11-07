/*
 * File:      IntestazioneHome.tsx
 * Percorso:  src/features/home/components/IntestazioneHome.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Testata home: logo, titolo, backup e accessi rapidi.
 *   rev 2 — 26/10/2026 17:45 — Bottoni verde tenue a riposo, verde pieno attivo con bordo verde scuro elettrico.
 *   rev 3 — 27/10/2026 21:20 — Aggiunto bottone «Esporta dati in Excel» in fila agli accessi rapidi.
 *   rev 4 — 28/10/2026 09:30 — Rinomina accessi: «Modulo auto invio attestato», «Inserimento attestati».
 *   rev 4 — 28/10/2026 09:30 — Rinomina accessi: «Modulo auto invio attestato» e «Inserimento attestati».
 *   rev 5 — 31/10/2026 09:00 — Stato cartella locale in alto a destra; backup su riga propria.
 *   rev 6 — 02/11/2026 11:10 — Aggiunto accesso «Stampe & Report».
 *   rev 7 — 06/11/2026 16:00 — Aggiunto accesso «Scadenze & Piano Corsi».
 *   rev 8 — 07/11/2026 — Accessi, backup ed esportazione passati alla barra di navigazione e al menu «Sistema».
 */
import { IndicatoreCartella } from "@/features/cartelle/IndicatoreCartella";
import { AvvisoDatiDitta } from "@/features/ditta/AvvisoDatiDitta";
import logoAsset from "@/assets/logo-ngb.jpg.asset.json";

export function IntestazioneHome() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Nichetti Gian Battista"
              className="h-12 w-auto rounded-md bg-card"
            />
            <div>
              <h1 className="text-lg font-semibold">Archivio Attestati Sicurezza</h1>
              <p className="text-xs text-muted-foreground">
                Nichetti Gian Battista · Soresina (CR) · D.Lgs. 81/2008
              </p>
            </div>
          </div>

          <div className="ml-auto flex max-w-[28rem] flex-col items-end gap-1 self-start">
            <IndicatoreCartella />
            <AvvisoDatiDitta />
          </div>
        </div>

      </div>
    </header>
  );
}

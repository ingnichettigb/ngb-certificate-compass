/*
 * File:          IntestazioneHr.tsx
 * Percorso:      src/features/hr/components/IntestazioneHr.tsx
 * Data creazione: 2026-10-20
 * Revisioni:
 *   - Rev 1 (2026-10-20 14:00): Intestazione dashboard HR con backup.
 *   - Rev 3 (2026-10-30 20:28): La matrice si apre con il solo onClose (porta i dati da sé).
 *   - Rev 4 (2026-10-31 09:00): Stato cartella locale in alto a destra.
 *   - Rev 5 (2026-11-07 11:57): Aggiunto pulsante «Importa da cartella» per confluire attestati multipli in attesa di validazione.
 *   - Rev 6 (2026-11-07): Solo titolo. «Importa da cartella» è passato in «Inserimento massivo»; backup, impostazioni e
 *            stato cartella sono nel menu «Sistema» della barra; la Matrice resta in «Dipendenti».
 */
import { ShieldCheck } from "lucide-react";

export function IntestazioneHr() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-5 py-4">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-base font-semibold">Validazione HR</h1>
          <p className="text-xs text-muted-foreground">
            Attestati ricevuti dal Modulo auto invio: verifica, correggi e approva o respingi
          </p>
        </div>
      </div>
    </header>
  );
}

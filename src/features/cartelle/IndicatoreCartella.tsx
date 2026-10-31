/*
 * File:          IndicatoreCartella.tsx
 * Percorso:      src/features/cartelle/IndicatoreCartella.tsx
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 21:00): Indicatore permanente in testata: 🟢 nome cartella attiva · 🟠 cartella scollegata
 *     (un clic chiede il permesso) · nessuna cartella (un clic apre la selezione).
 *   - Rev 2 (2026-10-31 09:00): Aspetto da semplice informazione (non è un pulsante) quando la cartella è attiva;
 *     testo rosso «Assegna cartella locale» o giallo «Riautorizza cartella locale» cliccabile solo se serve un'azione.
 */
import type { ReactElement } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStatoCartelle } from "./useStatoCartelle";

const AZIONE =
  "inline-flex max-w-full items-center gap-1.5 text-xs font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm";

export function IndicatoreCartella({ className }: { className?: string }) {
  const { stato, supportata, autorizza, collega } = useStatoCartelle();
  if (!supportata || !stato) return null;

  let contenuto: ReactElement;

  if (stato.stato === "ok") {
    const nomi = stato.cartelle.map((c) => c.nome);
    const etichetta = nomi.length === 1 ? nomi[0] : `${nomi.length} cartelle`;
    contenuto = (
      <span
        role="status"
        title={`Cartelle collegate e autorizzate: ${nomi.join(", ")}`}
        className="inline-flex max-w-full cursor-default items-center gap-1.5 text-xs text-muted-foreground"
      >
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-success" />
        <span className="shrink-0">Cartella locale:</span>
        <span className="truncate font-medium text-foreground">{etichetta}</span>
      </span>
    );
  } else if (stato.stato === "da_autorizzare") {
    const senza = stato.cartelle.filter((c) => !c.autorizzata).map((c) => c.nome);
    contenuto = (
      <button
        type="button"
        title={`Il browser deve riautorizzare l'accesso a: ${senza.join(", ")}. Clicca per procedere.`}
        onClick={async () => {
          try {
            const nuovo = await autorizza();
            if (nuovo.stato !== "ok") {
              toast.warning("Permesso non concesso", {
                description: "Conferma la richiesta del browser per riattivare la cartella.",
              });
            }
          } catch (e) {
            toast.error("Autorizzazione non riuscita", { description: (e as Error).message });
          }
        }}
        className={cn(AZIONE, "text-amber-600 dark:text-amber-400")}
      >
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-amber-500" />
        Riautorizza cartella locale
      </button>
    );
  } else {
    contenuto = (
      <button
        type="button"
        title="Nessuna cartella assegnata: clicca per scegliere la cartella degli attestati"
        onClick={async () => {
          try {
            await collega();
          } catch (e) {
            toast.error("Collegamento cartella non riuscito", { description: (e as Error).message });
          }
        }}
        className={cn(AZIONE, "text-destructive")}
      >
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-destructive" />
        Assegna cartella locale
      </button>
    );
  }

  return <div className={cn("flex min-w-0 justify-end", className)}>{contenuto}</div>;
}

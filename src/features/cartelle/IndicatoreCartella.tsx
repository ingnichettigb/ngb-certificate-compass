/*
 * File:          IndicatoreCartella.tsx
 * Percorso:      src/features/cartelle/IndicatoreCartella.tsx
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 21:00): Indicatore permanente in testata: 🟢 nome cartella attiva · 🟠 cartella scollegata
 *     (un clic chiede il permesso) · nessuna cartella (un clic apre la selezione).
 */
import { toast } from "sonner";
import { useStatoCartelle } from "./useStatoCartelle";

const BASE =
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors";

export function IndicatoreCartella() {
  const { stato, supportata, autorizza, collega } = useStatoCartelle();
  if (!supportata || !stato) return null;

  if (stato.stato === "ok") {
    const nomi = stato.cartelle.map((c) => c.nome);
    const etichetta = nomi.length === 1 ? nomi[0] : `${nomi.length} cartelle`;
    return (
      <span
        role="status"
        title={`Cartelle collegate e autorizzate: ${nomi.join(", ")}`}
        className={`${BASE} border-success/40 bg-success/10 text-foreground`}
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-success" />
        <span className="max-w-[16rem] truncate">Cartella: {etichetta}</span>
      </span>
    );
  }

  if (stato.stato === "da_autorizzare") {
    const senza = stato.cartelle.filter((c) => !c.autorizzata).map((c) => c.nome);
    return (
      <button
        type="button"
        title={`Clicca per autorizzare l'accesso del browser a: ${senza.join(", ")}`}
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
        className={`${BASE} border-warning/50 bg-warning/10 text-foreground hover:bg-warning/20`}
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-warning" />
        Cartella scollegata
      </button>
    );
  }

  return (
    <button
      type="button"
      title="Nessuna cartella collegata: clicca per scegliere la cartella degli attestati"
      onClick={async () => {
        try {
          await collega();
        } catch (e) {
          toast.error("Collegamento cartella non riuscito", { description: (e as Error).message });
        }
      }}
      className={`${BASE} border-border bg-muted text-muted-foreground hover:bg-muted/70`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground/60" />
      Nessuna cartella
    </button>
  );
}

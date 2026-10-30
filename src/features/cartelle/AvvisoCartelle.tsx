/*
 * File:          AvvisoCartelle.tsx
 * Percorso:      src/features/cartelle/AvvisoCartelle.tsx
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 20:30): Riquadro di avviso con pulsante quando non c'è nessuna cartella collegata o manca il permesso.
 */
import { AlertCircle, FolderOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StatoCartelle } from "@/lib/api/stato-cartelle";

export function AvvisoCartelle({
  stato,
  onAutorizza,
  onCollega,
  conseguenza = "per avviare la ricerca",
}: {
  stato: StatoCartelle | null;
  onAutorizza: () => void;
  onCollega: () => void;
  /** Completa la frase dell'avviso, es. «per avviare la ricerca» o «per salvare la copia locale». */
  conseguenza?: string;
}) {
  if (!stato || stato.stato === "ok") return null;

  if (stato.stato === "nessuna") {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
      >
        <span className="flex items-center gap-2 font-medium">
          <AlertCircle className="size-4 text-warning" /> Nessuna cartella collegata: collegala {conseguenza}.
        </span>
        <Button size="sm" variant="outline" onClick={onCollega}>
          <FolderOpen className="size-3.5" /> Collega cartella
        </Button>
      </div>
    );
  }

  const senza = stato.cartelle.filter((c) => !c.autorizzata).map((c) => c.nome);
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
    >
      <span className="flex items-center gap-2 font-medium">
        <AlertCircle className="size-4 text-warning" /> Cartella locale non autorizzata ({senza.join(", ")}): clicca
        «Autorizza» {conseguenza}.
      </span>
      <Button size="sm" variant="outline" onClick={onAutorizza}>
        <ShieldCheck className="size-3.5" /> Autorizza
      </Button>
    </div>
  );
}

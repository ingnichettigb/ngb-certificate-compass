/*
 * File:      StampaPredefinitaPage.tsx
 * Percorso:  src/features/stampe/components/StampaPredefinitaPage.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Pagina di una stampa predefinita scelta per id (rotta /stampe/predefinite/$id).
 */
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StampePage } from "../StampePage";
import { trovaPredefinita } from "../stampe-predefinite";

export function StampaPredefinitaPage({ id }: { id: string }) {
  const stampa = trovaPredefinita(id);
  if (!stampa) {
    return (
      <div className="mx-auto max-w-[600px] space-y-3 p-10 text-center">
        <p className="text-sm">Questa stampa predefinita non esiste.</p>
        <Button asChild>
          <Link to="/stampe/predefinite">Torna alle stampe predefinite</Link>
        </Button>
      </div>
    );
  }
  // «key»: cambiando stampa si riparte da zero (ordinamento, colonne, filtri).
  return <StampePage key={stampa.id} predefinita={stampa} />;
}

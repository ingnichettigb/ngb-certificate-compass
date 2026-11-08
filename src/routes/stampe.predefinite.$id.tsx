/*
 * File:      stampe.predefinite.$id.tsx
 * Percorso:  src/routes/stampe.predefinite.$id.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Rotta /stampe/predefinite/:id: anteprima della stampa predefinita scelta.
 */
import { createFileRoute } from "@tanstack/react-router";
import { StampaPredefinitaPage } from "@/features/stampe/components/StampaPredefinitaPage";

export const Route = createFileRoute("/stampe/predefinite/$id")({
  component: function StampaPredefinitaRotta() {
    const { id } = Route.useParams();
    return <StampaPredefinitaPage id={id} />;
  },
});

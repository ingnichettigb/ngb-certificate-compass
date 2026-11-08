/*
 * File:      stampe.personalizzata.tsx
 * Percorso:  src/routes/stampe.personalizzata.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Rotta /stampe/personalizzata: la pagina Stampe & Report di prima, invariata.
 */
import { createFileRoute } from "@tanstack/react-router";
import { StampePage } from "@/features/stampe/StampePage";

export const Route = createFileRoute("/stampe/personalizzata")({
  component: () => <StampePage />,
});

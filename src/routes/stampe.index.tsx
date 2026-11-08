/*
 * File:      stampe.index.tsx
 * Percorso:  src/routes/stampe.index.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Rotta /stampe: scelta tra Stampa personalizzata e Stampe predefinite.
 */
import { createFileRoute } from "@tanstack/react-router";
import { SceltaTipoStampa } from "@/features/stampe/components/SceltaTipoStampa";

export const Route = createFileRoute("/stampe/")({
  component: SceltaTipoStampa,
});

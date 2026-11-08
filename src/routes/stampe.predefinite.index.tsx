/*
 * File:      stampe.predefinite.index.tsx
 * Percorso:  src/routes/stampe.predefinite.index.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Rotta /stampe/predefinite: carte delle stampe predefinite.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ElencoStampePredefinite } from "@/features/stampe/components/ElencoStampePredefinite";

export const Route = createFileRoute("/stampe/predefinite/")({
  component: ElencoStampePredefinite,
});

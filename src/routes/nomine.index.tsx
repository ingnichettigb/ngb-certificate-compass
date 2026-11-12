/*
 * File:      nomine.index.tsx
 * Percorso:  src/routes/nomine.index.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Rotta /nomine: elenco dei bottoni delle nomine.
 */
import { createFileRoute } from "@tanstack/react-router";
import { NominePage } from "@/features/nomine/NominePage";

export const Route = createFileRoute("/nomine/")({
  component: NominePage,
});

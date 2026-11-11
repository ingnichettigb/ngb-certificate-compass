/*
 * File:      stampe.globale.tsx
 * Percorso:  src/routes/stampe.globale.tsx
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Rotta /stampe/globale: fascicolo completo (copertina, organigramma A3, lavoratori con attestati) in PDF a blocchi.
 */
import { createFileRoute } from "@tanstack/react-router";
import { StampaGlobalePage } from "@/features/stampe/components/StampaGlobalePage";

export const Route = createFileRoute("/stampe/globale")({
  head: () => ({
    meta: [
      { title: "Stampa globale — Nichetti Gian Battista" },
      {
        name: "description",
        content:
          "Fascicolo completo dei lavoratori con schede e attestati, in PDF divisi a blocchi.",
      },
      { property: "og:title", content: "Stampa globale" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StampaGlobalePage,
});

/*
 * File:      stampe.organigramma-a3.tsx
 * Percorso:  src/routes/stampe.organigramma-a3.tsx
 * Data creaz: 10/11/2026
 * Revisioni:
 *   rev 1 — 10/11/2026 16:10 — Rotta /stampe/organigramma-a3: tavola grafica dell'organigramma della sicurezza in A3.
 */
import { createFileRoute } from "@tanstack/react-router";
import { OrganigrammaA3Page } from "@/features/stampe/components/OrganigrammaA3Page";

export const Route = createFileRoute("/stampe/organigramma-a3")({
  head: () => ({
    meta: [
      { title: "Organigramma sicurezza A3 — Nichetti Gian Battista" },
      { name: "description", content: "Tavola A3 dell'organigramma del servizio di prevenzione e protezione, con squadre e incarichi." },
      { property: "og:title", content: "Organigramma sicurezza A3" },
      { property: "og:description", content: "Organigramma della sicurezza stampabile in formato A3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrganigrammaA3Page,
});

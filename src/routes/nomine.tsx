/*
 * File:      nomine.tsx
 * Percorso:  src/routes/nomine.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Rotta /nomine: contenitore delle sotto-pagine (Outlet): elenco delle nomine e singola nomina.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/nomine")({
  head: () => ({
    meta: [
      { title: "Nomine sicurezza — Archivio Sicurezza" },
      {
        name: "description",
        content:
          "Lettere di nomina degli addetti (primo soccorso, antincendio, evacuazione, registro antincendio, DPI, SDS) con anteprima e PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Outlet />,
});

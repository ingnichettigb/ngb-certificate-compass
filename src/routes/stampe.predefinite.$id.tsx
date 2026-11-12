/*
 * File:      stampe.predefinite.$id.tsx
 * Percorso:  src/routes/stampe.predefinite.$id.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Rotta /stampe/predefinite/:id: anteprima della stampa predefinita scelta.
 *   rev 2 — 12/11/2026 06:53 — Metadati dedicati alla stampa scelta.
 */
import { createFileRoute } from "@tanstack/react-router";
import { StampaPredefinitaPage } from "@/features/stampe/components/StampaPredefinitaPage";

export const Route = createFileRoute("/stampe/predefinite/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Stampa ${params.id} — Archivio Sicurezza` },
      { name: "description", content: `Anteprima ed esportazione PDF della stampa aziendale ${params.id}.` },
      { property: "og:title", content: `Stampa ${params.id} — Archivio Sicurezza` },
      { property: "og:description", content: `Anteprima ed esportazione PDF della stampa aziendale ${params.id}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function StampaPredefinitaRotta() {
    const { id } = Route.useParams();
    return <StampaPredefinitaPage id={id} />;
  },
});

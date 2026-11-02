/*
 * File:      stampe.tsx
 * Percorso:  src/routes/stampe.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Rotta /stampe (pagina in src/features/stampe/).
 */
import { createFileRoute } from "@tanstack/react-router";
import { StampePage } from "@/features/stampe/StampePage";

export const Route = createFileRoute("/stampe")({
  head: () => ({
    meta: [
      { title: "Stampe e report formazione — Archivio Sicurezza · Nichetti Gian Battista" },
      { name: "description", content: "Stampa o salva in PDF registro formazione, incaricati, scadenzario, schede individuali e report per reparto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Stampe e report formazione" },
      { property: "og:description", content: "Elenchi stampabili A4 della formazione sicurezza D.Lgs. 81/08." },
    ],
  }),
  component: StampePage,
});

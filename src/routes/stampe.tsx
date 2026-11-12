/*
 * File:      stampe.tsx
 * Percorso:  src/routes/stampe.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Rotta /stampe (pagina in src/features/stampe/).
 *   rev 2 — 08/11/2026 — /stampe diventa il contenitore delle sotto-pagine (Outlet): ingresso (stampe.index.tsx), stampa personalizzata
 *            (stampe.personalizzata.tsx), elenco carte (stampe.predefinite.index.tsx) e singola stampa (stampe.predefinite.$id.tsx).
 *   rev 3 — 12/11/2026 06:53 — Metadati senza marchio personale fisso.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/stampe")({
  head: () => ({
    meta: [
      { title: "Stampe e report formazione — Archivio Sicurezza" },
      { name: "description", content: "Stampa o salva in PDF registro formazione, incaricati, scadenzario, schede individuali e report per reparto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Stampe e report formazione" },
      { property: "og:description", content: "Elenchi stampabili A4 della formazione sicurezza D.Lgs. 81/08." },
    ],
  }),
  component: () => <Outlet />,
});

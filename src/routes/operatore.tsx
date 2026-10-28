/*
 * File:      operatore.tsx
 * Percorso:  src/routes/operatore.tsx
 * Rotta /operatore. La pagina vera è in src/features/operatore/ (OperatorePage, hooks e componenti).
 */
import { createFileRoute } from "@tanstack/react-router";
import { OperatorePage } from "@/features/operatore/OperatorePage";

export const Route = createFileRoute("/operatore")({
  head: () => ({
    meta: [
      { title: "Inserimento attestati — Archivio Sicurezza · Nichetti Gian Battista" },
      { name: "description", content: "Lettura automatica con AI degli attestati di sicurezza, verifica dei dati e archiviazione." },
      { property: "og:title", content: "Inserimento attestati" },
      { property: "og:description", content: "Carica un attestato, verifica i dati letti dall'AI e archivialo nel database." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperatorePage,
});

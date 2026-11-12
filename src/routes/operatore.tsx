/*
 * File:      operatore.tsx
 * Percorso:  src/routes/operatore.tsx
 * Data creazione: non registrata nel file originale
 * Revisioni: rev 1 — 12/11/2026 06:53 — Metadati senza marchio personale fisso.
 * Rotta /operatore. La pagina vera è in src/features/operatore/ (OperatorePage, hooks e componenti).
 */
import { createFileRoute } from "@tanstack/react-router";
import { OperatorePage } from "@/features/operatore/OperatorePage";

export const Route = createFileRoute("/operatore")({
  head: () => ({
    meta: [
      { title: "Inserimento attestati — Archivio Sicurezza" },
      { name: "description", content: "Lettura automatica con AI degli attestati di sicurezza, verifica dei dati e archiviazione." },
      { property: "og:title", content: "Inserimento attestati" },
      { property: "og:description", content: "Carica un attestato, verifica i dati letti dall'AI e archivialo nel database." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperatorePage,
});

/*
 * File:      dipendenti.tsx
 * Percorso:  src/routes/dipendenti.tsx
 * Rotta /dipendenti. La pagina vera è in src/features/dipendenti/ (DipendentiPage, hook e componenti).
 */
import { createFileRoute } from "@tanstack/react-router";
import { DipendentiPage } from "@/features/dipendenti/DipendentiPage";

export const Route = createFileRoute("/dipendenti")({
  head: () => ({
    meta: [
      { title: "Gestione Dipendenti — Archivio Sicurezza · Nichetti Gian Battista" },
      {
        name: "description",
        content:
          "Elenco completo dei dipendenti, anagrafiche e storico degli attestati di formazione sulla sicurezza.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Gestione Dipendenti" },
      {
        property: "og:description",
        content:
          "Cerca un dipendente, aggiungi nominativi e consulta lo storico dei suoi attestati di sicurezza.",
      },
    ],
  }),
  component: DipendentiPage,
});

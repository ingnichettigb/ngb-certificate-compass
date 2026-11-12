/*
 * File:      scadenze.tsx
 * Percorso:  src/routes/scadenze.tsx
 * Data creazione: non registrata nel file originale
 * Revisioni: rev 1 — 12/11/2026 06:53 — Metadati senza marchio personale fisso.
 * Rotta /scadenze. La pagina vera è in src/features/scadenze/ (ScadenzePage, hook e componenti).
 */
import { createFileRoute } from "@tanstack/react-router";
import { ScadenzePage } from "@/features/scadenze/ScadenzePage";

export const Route = createFileRoute("/scadenze")({
  head: () => ({
    meta: [
      {
        title:
          "Attestati scaduti e in scadenza — Archivio Sicurezza",
      },
      {
        name: "description",
        content:
          "Elenco dei certificati di formazione scaduti e in scadenza a 90 giorni, 6 mesi o 1 anno, con filtro corso e ordinamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Attestati scaduti e in scadenza" },
      {
        property: "og:description",
        content:
          "Chi ha i certificati scaduti e quali corsi vanno rinnovati: elenco filtrabile e ordinato per colonna.",
      },
    ],
  }),
  component: ScadenzePage,
});

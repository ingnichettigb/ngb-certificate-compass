/*
 * File:      index.tsx
 * Percorso:  src/routes/index.tsx
 * Rotta / (home). La pagina vera è in src/features/home/.
 */
import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/home/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Archivio Attestati Sicurezza — Nichetti Gian Battista" },
      {
        name: "description",
        content:
          "Archivio digitale degli attestati di formazione sulla sicurezza: caricamento da cellulare, validazione HR e scadenze calcolate in automatico.",
      },
      {
        property: "og:title",
        content: "Archivio Attestati Sicurezza — Nichetti Gian Battista",
      },
      {
        property: "og:description",
        content:
          "Carica gli attestati dal telefono, valida dal cruscotto risorse umane e tieni sotto controllo tutte le scadenze.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

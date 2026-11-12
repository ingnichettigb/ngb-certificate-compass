/*
 * File:      index.tsx
 * Percorso:  src/routes/index.tsx
 * Data creazione: non registrata nel file originale
 * Revisioni: rev 1 — 12/11/2026 06:53 — Metadati senza marchio personale fisso.
 * Rotta / (home). La pagina vera è in src/features/home/.
 */
import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/home/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Archivio Attestati Sicurezza — Gestione aziendale" },
      {
        name: "description",
        content:
          "Archivio digitale degli attestati di formazione sulla sicurezza: caricamento da cellulare, validazione HR e scadenze calcolate in automatico.",
      },
      {
        property: "og:title",
        content: "Archivio Attestati Sicurezza — Gestione aziendale",
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

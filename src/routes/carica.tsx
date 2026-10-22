/*
 * File:      carica.tsx
 * Percorso:  src/routes/carica.tsx
 * Rotta /carica (modulo per i lavoratori). La pagina vera è in src/features/carica/.
 */
import { createFileRoute } from "@tanstack/react-router";
import { CaricaPage } from "@/features/carica/CaricaPage";

export const Route = createFileRoute("/carica")({
  head: () => ({
    meta: [
      { title: "Carica il tuo attestato — Archivio Sicurezza · Nichetti Gian Battista" },
      {
        name: "description",
        content:
          "Modulo mobile per i lavoratori: inserisci i tuoi dati, scegli il corso e allega la foto dell'attestato di formazione sulla sicurezza.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Carica il tuo attestato" },
      {
        property: "og:description",
        content:
          "Compila i dati anagrafici, seleziona il corso e allega fronte e retro dell'attestato dal telefono.",
      },
    ],
  }),
  component: CaricaPage,
});

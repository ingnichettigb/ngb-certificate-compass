/*
 * File:      massivo.tsx
 * Percorso:  src/routes/massivo.tsx
 * Rotta /massivo (inserimento massivo di attestati). La pagina vera è in src/features/massivo/.
 */
import { createFileRoute } from "@tanstack/react-router";
import { MassivoPage } from "@/features/massivo/MassivoPage";

export const Route = createFileRoute("/massivo")({
  head: () => ({
    meta: [
      { title: "Inserimento massivo — Archivio Sicurezza · Nichetti Gian Battista" },
      {
        name: "description",
        content:
          "Importa da cartella e aggancia in blocco gli attestati: avvio a regime dell'archivio e arrivi dopo un corso di formazione.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MassivoPage,
});

/*
 * File:      hr.tsx
 * Percorso:  src/routes/hr.tsx
 * Rotta /hr (dashboard per l'ufficio personale). La pagina vera è in src/features/hr/.
 */
import { createFileRoute } from "@tanstack/react-router";
import { HrPage } from "@/features/hr/HrPage";

export const Route = createFileRoute("/hr")({
  head: () => ({
    meta: [
      { title: "Cruscotto risorse umane — Validazione attestati sicurezza" },
      {
        name: "description",
        content:
          "Cruscotto risorse umane per l'ufficio personale: filtra gli attestati per stato, verifica le immagini, correggi i dati e approva o respingi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Cruscotto risorse umane" },
      {
        property: "og:description",
        content:
          "Valida gli attestati caricati dai lavoratori: revisione immagini, modifica dati e notifica di esito.",
      },
    ],
  }),
  component: HrPage,
});

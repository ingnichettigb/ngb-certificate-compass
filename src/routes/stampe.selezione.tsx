/*
 * File:      stampe.selezione.tsx
 * Percorso:  src/routes/stampe.selezione.tsx
 * Data creaz: 23/11/2026
 * Revisioni:
 *   rev 1 — 23/11/2026 — Rotta /stampe/selezione: fascicolo PDF (schede e attestati) dei soli lavoratori scelti.
 */
import { createFileRoute } from "@tanstack/react-router";
import { StampaSelezionePage } from "@/features/stampe/components/StampaSelezionePage";

export const Route = createFileRoute("/stampe/selezione")({
  head: () => ({
    meta: [
      { title: "Stampa selezione — Archivio Sicurezza" },
      {
        property: "og:description",
        content: "Fascicolo dei lavoratori scelti, con schede e attestati, in PDF.",
      },
      {
        name: "description",
        content:
          "Fascicolo dei soli lavoratori scelti, con schede e attestati, in PDF divisi a blocchi.",
      },
      { property: "og:title", content: "Stampa selezione" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StampaSelezionePage,
});

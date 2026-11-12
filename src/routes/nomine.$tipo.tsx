/*
 * File:      nomine.$tipo.tsx
 * Percorso:  src/routes/nomine.$tipo.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Rotta /nomine/:tipo: anteprima, modifica del testo e PDF della nomina scelta.
 */
import { createFileRoute } from "@tanstack/react-router";
import { NominaPage } from "@/features/nomine/NominaPage";

export const Route = createFileRoute("/nomine/$tipo")({
  head: ({ params }) => ({
    meta: [
      { title: `Nomina ${params.tipo} — Archivio Sicurezza` },
      {
        name: "description",
        content: `Anteprima ed esportazione PDF della nomina ${params.tipo}.`,
      },
    ],
  }),
  component: function NominaRotta() {
    const { tipo } = Route.useParams();
    return <NominaPage tipo={tipo} />;
  },
});

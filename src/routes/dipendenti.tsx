/*
 * File:      dipendenti.tsx
 * Percorso:  src/routes/dipendenti.tsx
 * Data creazione: non registrata nel file originale
 * Revisioni: rev 1 — 12/11/2026 06:53 — Metadati senza marchio personale fisso.
 *            rev 2 — 27/11/2026 — Parametro facoltativo ?stato=… (es. senza_pdf) per aprire l'elenco con il filtro già attivo.
 * Rotta /dipendenti. La pagina vera è in src/features/dipendenti/ (DipendentiPage, hook e componenti).
 */
import { createFileRoute } from "@tanstack/react-router";
import { DipendentiPage } from "@/features/dipendenti/DipendentiPage";
import { parseFiltroStato } from "@/features/contratti/contratto";

export const Route = createFileRoute("/dipendenti")({
  validateSearch: (search: Record<string, unknown>) => {
    const stato = parseFiltroStato(search["stato"]);
    return stato ? { stato } : {};
  },
  head: () => ({
    meta: [
      { title: "Gestione Dipendenti — Archivio Sicurezza" },
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

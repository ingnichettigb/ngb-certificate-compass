/*
 * File:      SelezioneReparto.materia.test.tsx
 * Percorso:  src/features/dipendenti/components/SelezioneReparto.materia.test.tsx
 * Data creaz: 06/11/2026
 * Revisioni:
 *   rev 1 — 06/11/2026 — Il campo «Materia» compare solo per i Docenti, vuoto = bordo giallo, si salva uscendo dal campo.
 *   rev 2 — 08/11/2026 — La materia non è più richiesta ai Docenti (basta la classe di concorso): il campo non compare nella scheda.
 */
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dipendente } from "@/lib/api";

const aggiorna = vi.fn(async () => undefined);
vi.mock("@/lib/api", async () => {
  const reale = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...reale,
    getReparti: async () => [],
    getSottoreparti: async () => [],
    getClassiConcorso: async () => [],
    aggiornaInsegnamentoDipendente: (...a: unknown[]) => (aggiorna as unknown as (...x: unknown[]) => Promise<void>)(...a),
  };
});

import { SelezioneReparto } from "./SelezioneReparto";

function dip(extra: Partial<Dipendente>): Dipendente {
  return {
    id: "d1", cognome: "Grillo", nome: "Susanna", codice_fiscale: "GRLSNN76E56F205G", email: null, reparto: "Docente",
    sottoreparto: null, classe_concorso: "A027", materia: null, luogo_nascita: null, data_nascita: null, stato_lavoratore: "in_forza",
    ...extra,
  } as Dipendente;
}
function mostra(d: Dipendente) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SelezioneReparto corrente={d} repartiAttivi={["Docente", "ATA"]} onCambia={() => undefined} />
    </QueryClientProvider>,
  );
}

describe("SelezioneReparto: la materia non è richiesta", () => {
  beforeEach(() => aggiorna.mockClear());

  it("per un docente c'è la classe di concorso ma non il campo Materia", () => {
    mostra(dip({}));
    expect(screen.queryByLabelText("Materia dipendente")).toBeNull();
    expect(screen.getByText("Classe di concorso")).toBeTruthy();
  });
  it("nemmeno per gli ATA", () => {
    mostra(dip({ reparto: "ATA" }));
    expect(screen.queryByLabelText("Materia dipendente")).toBeNull();
  });
});

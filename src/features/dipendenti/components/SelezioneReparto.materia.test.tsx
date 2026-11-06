/*
 * File:      SelezioneReparto.materia.test.tsx
 * Percorso:  src/features/dipendenti/components/SelezioneReparto.materia.test.tsx
 * Data creaz: 06/11/2026
 * Revisioni:
 *   rev 1 — 06/11/2026 — Il campo «Materia» compare solo per i Docenti, vuoto = bordo giallo, si salva uscendo dal campo.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("SelezioneReparto: campo Materia", () => {
  beforeEach(() => aggiorna.mockClear());

  it("per un docente senza materia il campo c'è ed è giallo", () => {
    mostra(dip({}));
    const campo = screen.getByLabelText("Materia dipendente");
    expect(campo).toHaveValue("");
    expect(campo.className).toContain("amber");
  });
  it("con la materia compilata non è giallo e mostra il valore", () => {
    mostra(dip({ materia: "Matematica e fisica" }));
    const campo = screen.getByLabelText("Materia dipendente");
    expect(campo).toHaveValue("Matematica e fisica");
    expect(campo.className).not.toContain("amber");
  });
  it("non compare per i non docenti", () => {
    mostra(dip({ reparto: "ATA" }));
    expect(screen.queryByLabelText("Materia dipendente")).toBeNull();
  });
  it("uscendo dal campo salva classe e materia", async () => {
    mostra(dip({}));
    const campo = screen.getByLabelText("Materia dipendente");
    fireEvent.change(campo, { target: { value: "  Matematica e fisica " } });
    fireEvent.blur(campo);
    await waitFor(() => expect(aggiorna).toHaveBeenCalledWith("d1", "A027", "Matematica e fisica"));
  });
  it("se il testo non cambia non salva", () => {
    mostra(dip({ materia: "Storia" }));
    fireEvent.blur(screen.getByLabelText("Materia dipendente"));
    expect(aggiorna).not.toHaveBeenCalled();
  });
});

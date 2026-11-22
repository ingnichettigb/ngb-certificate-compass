/*
 * File:      DialogNuoviNominativi.test.tsx
 * Percorso:  src/features/operatore/components/DialogNuoviNominativi.test.tsx
 * Data creazione: 22/11/2026
 * Test della scheda «Completa i nuovi inserimenti» aperta dopo l'archiviazione di un attestato.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { elenco } = vi.hoisted(() => ({ elenco: { dipendenti: [] as unknown[] } }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getDipendenti: async () => elenco.dipendenti,
  getReparti: async () => [{ nome: "Docente", attivo: true }, { nome: "ATA", attivo: true }],
}));

import { DialogNuoviNominativi } from "./DialogNuoviNominativi";

// Lavoratore creato dall'archiviazione: senza data di assunzione, quindi FUORI dalla regola della coda «Da completare».
const nuovo = {
  id: "dip-1", codice_fiscale: "RSSMRA80A01H501U", cognome: "ROSSI", nome: "MARIO", email: null, reparto: null,
  sottoreparto: null, classe_concorso: null, materia: null, luogo_nascita: null, data_nascita: null,
  data_assunzione: null, stato_lavoratore: "in_forza", tipo_contratto: "indeterminato",
};

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });
function disegna(ids: string[]) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DialogNuoviNominativi ids={ids} onClose={() => {}} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  cleanup();
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  elenco.dipendenti = [nuovo];
});

describe("Scheda dei nuovi nominativi", () => {
  it("si apre sul lavoratore appena creato anche se non rientra nella regola «Da completare»", async () => {
    disegna(["dip-1"]);
    await attendi();
    expect(screen.getByText(/Lavoratore 1 di 1/)).toBeTruthy();
    expect(screen.getByText("ROSSI MARIO")).toBeTruthy();
    expect(screen.getAllByText(/manca: data di assunzione/).length).toBeGreaterThan(0);
  });

  it("non si apre finché l'elenco aggiornato non contiene il nuovo lavoratore", async () => {
    elenco.dipendenti = [];
    disegna(["dip-1"]);
    await attendi();
    expect(screen.queryByText(/Lavoratore 1 di/)).toBeNull();
    expect(screen.queryByText("Non c'è nessun lavoratore da completare.")).toBeNull();
  });

  it("senza nuovi nominativi non mostra nulla", async () => {
    disegna([]);
    await attendi();
    expect(screen.queryByText("Completa i nuovi inserimenti")).toBeNull();
  });
});

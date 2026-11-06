/*
 * File:      ImpostazioniDialog.conferma.test.tsx
 * Percorso:  src/components/ImpostazioniDialog.conferma.test.tsx
 * Data creaz: 06/11/2026
 * Verifica la conferma a 3 scelte (Salva e chiudi / Esci senza salvare / Annulla) su «Torna», Esc e cambio scheda.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { salvaDittaMock } = vi.hoisted(() => ({ salvaDittaMock: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/api/ditta", async (importOriginal) => {
  const reale = await importOriginal<typeof import("@/lib/api/ditta")>();
  return {
    ...reale,
    getDitta: vi.fn(async () => ({ ...reale.DITTA_DEFAULT })),
    getSoglieDitta: vi.fn(async () => []),
    salvaDitta: salvaDittaMock,
  };
});
vi.mock("@/features/ditta/useDitta", () => ({ useLavoratoriInForza: () => ({ data: 0 }) }));
vi.mock("@/features/tipi-corso/TabellaTipiCorsoDialog", () => ({ TabellaTipiCorsoDialog: () => <div>scheda TabellaTipiCorsoDialog</div> }));
vi.mock("@/features/impostazioni/RepartiTab", () => ({ RepartiTab: () => <div>scheda RepartiTab</div> }));
vi.mock("@/features/impostazioni/InsegnamentoTab", () => ({ InsegnamentoTab: () => <div>scheda InsegnamentoTab</div> }));
vi.mock("@/features/impostazioni/CategorieTab", () => ({ CategorieTab: () => <div>scheda CategorieTab</div> }));
vi.mock("@/features/impostazioni/RuoliTab", () => ({ RuoliTab: () => <div>scheda RuoliTab</div> }));
vi.mock("@/features/impostazioni/ArchivioTab", () => ({ ArchivioTab: () => <div>scheda ArchivioTab</div> }));

import { ImpostazioniDialog } from "@/components/ImpostazioniDialog";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const conferma = () => screen.queryByRole("alertdialog");

async function apri() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ImpostazioniDialog />
    </QueryClientProvider>,
  );
  await clic(screen.getByText("Impostazioni generali"));
  await screen.findByText(/Codici ATECO Associati/);
}
async function aggiungiAteco() {
  fireEvent.change(screen.getByPlaceholderText(/Codice ATECO/), { target: { value: "853120" } });
  await clic(screen.getByRole("button", { name: /Aggiungi/ }));
}

beforeEach(() => {
  salvaDittaMock.mockReset();
  salvaDittaMock.mockImplementation(async (d) => d);
});
afterEach(() => cleanup());

describe("Impostazioni: conferma di uscita", () => {
  it("«Torna» chiede sempre conferma, anche senza modifiche; Annulla resta, «Salva e chiudi» chiude senza salvare nulla", async () => {
    await apri();
    await clic(screen.getByRole("button", { name: /Torna/ }));
    expect(conferma()).not.toBeNull();
    await clic(screen.getByRole("button", { name: "Annulla" }));
    expect(conferma()).toBeNull();
    expect(screen.getByText(/Impostazioni generali del programma/)).toBeTruthy();

    await clic(screen.getByRole("button", { name: /Torna/ }));
    await clic(screen.getByRole("button", { name: /Salva e chiudi/ }));
    expect(salvaDittaMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Impostazioni generali del programma/)).toBeNull();
  });

  it("con modifiche pendenti «Salva e chiudi» salva sul database e chiude", async () => {
    await apri();
    await aggiungiAteco();
    await clic(screen.getByRole("button", { name: /Torna/ }));
    expect(conferma()?.textContent).toMatch(/non ancora salvate/);
    await clic(screen.getByRole("button", { name: /Salva e chiudi/ }));
    expect(salvaDittaMock).toHaveBeenCalledTimes(1);
    expect(salvaDittaMock.mock.calls[0]![0].codici_ateco[0].codice).toBe("85.31.20");
    expect(screen.queryByText(/Impostazioni generali del programma/)).toBeNull();
  });

  it("«Esci senza salvare» scarta le modifiche e chiude", async () => {
    await apri();
    await aggiungiAteco();
    await clic(screen.getByRole("button", { name: /Torna/ }));
    await clic(screen.getByRole("button", { name: /Esci senza salvare/ }));
    expect(salvaDittaMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Impostazioni generali del programma/)).toBeNull();
  });

  it("se il salvataggio fallisce la finestra resta aperta", async () => {
    salvaDittaMock.mockRejectedValue(new Error("rete"));
    await apri();
    await aggiungiAteco();
    await clic(screen.getByRole("button", { name: /Torna/ }));
    await clic(screen.getByRole("button", { name: /Salva e chiudi/ }));
    expect(screen.getByText(/Impostazioni generali del programma/)).toBeTruthy();
  });

  it("Esc apre la conferma; Esc di nuovo equivale ad Annulla", async () => {
    await apri();
    fireEvent.keyDown(window, { key: "Escape" }); await attendi();
    expect(conferma()).not.toBeNull();
    fireEvent.keyDown(window, { key: "Escape" }); await attendi();
    expect(conferma()).toBeNull();
    expect(screen.getByText(/Impostazioni generali del programma/)).toBeTruthy();
  });

  it("cambiando scheda con modifiche pendenti compare la conferma; senza modifiche si cambia subito", async () => {
    await apri();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Corsi" }), { button: 0 }); await attendi();
    expect(conferma()).toBeNull();
    expect(screen.getByText("scheda TabellaTipiCorsoDialog")).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Ditta" }), { button: 0 }); await attendi();
    await aggiungiAteco();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Reparti" }), { button: 0 }); await attendi();
    expect(conferma()?.textContent).toMatch(/Cambiare scheda/);
    await clic(screen.getByRole("button", { name: /Salva e chiudi/ }));
    expect(salvaDittaMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("scheda RepartiTab")).toBeTruthy();
  });
});

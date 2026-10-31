/*
 * File:          IndicatoreCartella.test.tsx
 * Percorso:      src/features/cartelle/IndicatoreCartella.test.tsx
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 21:15): Verifica dei tre stati dell'indicatore in testata e dei clic che chiedono permesso / collegano.
 *   - Rev 2 (2026-10-31 09:00): Stato attivo = sola informazione (nessun pulsante); rosso «Assegna» e giallo «Riautorizza» cliccabili.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { StatoCartelle } from "@/lib/api/stato-cartelle";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

let supportata = true;
vi.mock("@/lib/api/cartella-locale", async (importOriginal) => {
  const reale = await importOriginal<typeof import("@/lib/api/cartella-locale")>();
  return { ...reale, supportaCartellaLocale: () => supportata };
});

const leggi = vi.fn<() => Promise<StatoCartelle>>();
const autorizza = vi.fn<() => Promise<StatoCartelle>>();
const collega = vi.fn<() => Promise<string | null>>();
vi.mock("@/lib/api/stato-cartelle", () => ({
  leggiStatoCartelle: () => leggi(),
  autorizzaCartelle: () => autorizza(),
  collegaCartella: () => collega(),
}));

import { IndicatoreCartella } from "./IndicatoreCartella";

const ok: StatoCartelle = { stato: "ok", autorizzate: 1, cartelle: [{ id: "a", nome: "Archivio", autorizzata: true }] };
const scollegata: StatoCartelle = {
  stato: "da_autorizzare",
  autorizzate: 0,
  cartelle: [{ id: "a", nome: "Archivio", autorizzata: false }],
};
const nessuna: StatoCartelle = { stato: "nessuna", autorizzate: 0, cartelle: [] };

beforeEach(() => {
  supportata = true;
  leggi.mockReset();
  autorizza.mockReset();
  collega.mockReset();
});
afterEach(cleanup);

describe("IndicatoreCartella", () => {
  it("cartella attiva: solo informazione con il nome, senza pulsanti", async () => {
    leggi.mockResolvedValue(ok);
    render(<IndicatoreCartella />);
    expect(await screen.findByText("Archivio")).toBeTruthy();
    expect(screen.getByText(/Cartella locale:/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("cartella da riautorizzare: testo giallo cliccabile che chiede il permesso", async () => {
    leggi.mockResolvedValue(scollegata);
    autorizza.mockResolvedValue(ok);
    render(<IndicatoreCartella />);
    fireEvent.click(await screen.findByRole("button", { name: /Riautorizza cartella locale/ }));
    await waitFor(() => expect(autorizza).toHaveBeenCalledTimes(1));
  });

  it("nessuna cartella: testo rosso «Assegna cartella locale» che avvia l'assegnazione", async () => {
    leggi.mockResolvedValue(nessuna);
    collega.mockResolvedValue("Archivio");
    render(<IndicatoreCartella />);
    const bottone = await screen.findByRole("button", { name: /Assegna cartella locale/ });
    expect(bottone.className).toMatch(/text-destructive/);
    fireEvent.click(bottone);
    await waitFor(() => expect(collega).toHaveBeenCalledTimes(1));
  });

  it("non compare nei browser senza accesso alle cartelle", async () => {
    supportata = false;
    leggi.mockResolvedValue(ok);
    const { container } = render(<IndicatoreCartella />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.innerHTML).toBe("");
    expect(leggi).not.toHaveBeenCalled();
  });
});

/*
 * File:      RiquadroAtecoRischio.test.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroAtecoRischio.test.tsx
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 11:45 — Catalogo ATECO della Tabella 06: ricerca per numero e descrizione, compilazione dei campi,
 *            rischio di ogni codice e rischio aziendale suggerito con «Applica».
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/api/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  const reale = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ...reale,
    sb: creaClientFinto({
      tabelle: {
        rischio_ateco: [
          { id: "1", codice: "01", descrizione: "Agricoltura", rischio: "medio" },
          { id: "2", codice: "41", descrizione: "Costruzione di edifici", rischio: "alto" },
          { id: "3", codice: "85", descrizione: "Istruzione", rischio: "medio" },
        ],
      },
    }),
  };
});

import { DITTA_DEFAULT, type DittaRecord } from "@/lib/api/ditta";
import { RiquadroAtecoRischio } from "./RiquadroAtecoRischio";

afterEach(cleanup);
const attendi = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))));

function monta(form: Partial<DittaRecord> = {}) {
  const setNuovoAteco = vi.fn();
  const updateCampo = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RiquadroAtecoRischio
        form={{ ...DITTA_DEFAULT, ...form }}
        updateCampo={updateCampo}
        nuovoAteco={{ codice: "", descrizione: "" }}
        setNuovoAteco={setNuovoAteco}
        aggiungiAteco={vi.fn()}
        rimuoviAteco={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { setNuovoAteco, updateCampo };
}

describe("RiquadroAtecoRischio con il catalogo della Tabella 06", () => {
  it("cerca per numero o per descrizione e compila codice e descrizione", async () => {
    const { setNuovoAteco } = monta();
    await attendi();
    fireEvent.click(screen.getByRole("button", { name: /Scegli dal catalogo/ }));
    await attendi();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);

    fireEvent.change(screen.getByLabelText("Cerca nel catalogo ATECO"), {
      target: { value: "istruz" },
    });
    await attendi();
    fireEvent.click(screen.getByRole("button", { name: /85.*Istruzione/ }));
    expect(setNuovoAteco).toHaveBeenCalledWith({ codice: "85", descrizione: "Istruzione" });
  });

  it("senza risultati lo dice", async () => {
    monta();
    await attendi();
    fireEvent.click(screen.getByRole("button", { name: /Scegli dal catalogo/ }));
    fireEvent.change(screen.getByLabelText("Cerca nel catalogo ATECO"), {
      target: { value: "zzz" },
    });
    await attendi();
    expect(document.body.textContent).toContain("Nessun codice trovato per «zzz»");
  });

  it("suggerisce il rischio più alto dei codici e lo applica solo al clic", async () => {
    const { updateCampo } = monta({
      rischio_ditta: "medio",
      codici_ateco: [
        { codice: "85.31.20", descrizione: "Istruzione" },
        { codice: "41.20.00", descrizione: "Edifici" },
      ],
    });
    await attendi();
    expect(document.body.textContent).toContain(
      "I codici ATECO indicano rischio alto (Tabella 06)",
    );
    expect(updateCampo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Applica" }));
    expect(updateCampo).toHaveBeenCalledWith("rischio_ditta", "alto");
  });

  it("rischio già in linea: nessun pulsante; mostra il rischio di ogni codice", async () => {
    monta({
      rischio_ditta: "medio",
      codici_ateco: [{ codice: "85.31.20", descrizione: "Istruzione" }],
    });
    await attendi();
    expect(screen.queryByRole("button", { name: "Applica" })).toBeNull();
    expect(document.body.textContent).toContain("In linea con la Tabella 06");
    expect(document.body.textContent).toContain("rischio medio");
  });
});

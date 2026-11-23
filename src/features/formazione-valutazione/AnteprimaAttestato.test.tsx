/*
 * File:          AnteprimaAttestato.test.tsx
 * Percorso:      src/features/formazione-valutazione/AnteprimaAttestato.test.tsx
 * Data creazione: 2026-11-23
 * Anteprima dell'attestato nella finestra «Formazione da valutare»: senza file si avvisa; con file si mostra al clic (PDF o immagine)
 * e si può nascondere; se il file non si trova compare il messaggio con il nome; il retro ha il suo pulsante.
 * Revisioni:
 *   - Rev 1 (2026-11-23): Prima stesura.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { risolvi } = vi.hoisted(() => ({ risolvi: vi.fn() }));
vi.mock("@/lib/api/cartelle-risoluzione", () => ({ risolviDocumentoAttestato: risolvi }));
vi.mock("@/lib/api/cartelle-archivio", () => ({ elencoCartelle: async () => [] }));
vi.mock("@/lib/api/cartella-locale", () => ({ verificaPermessi: async () => true }));

import { AnteprimaAttestato } from "./AnteprimaAttestato";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };

describe("AnteprimaAttestato", () => {
  beforeEach(() => risolvi.mockReset());
  afterEach(cleanup);

  it("senza file collegato avvisa e non mostra pulsanti", () => {
    render(<AnteprimaAttestato fronte="" retro={null} />);
    expect(screen.getByText(/Nessun file collegato/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("mostra il PDF al clic e lo nasconde con il secondo clic", async () => {
    risolvi.mockResolvedValue({ url: "https://x/doc.pdf", tipo: "storage", isPdf: true, nomeFile: "doc.pdf", percorsoOriginale: "a/doc.pdf" });
    render(<AnteprimaAttestato fronte="Archivio Attestati Sicurezza/A/doc.pdf" />);
    expect(document.querySelector("iframe")).toBeNull();
    await clic(screen.getByRole("button", { name: /Mostra attestato/ }));
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe("https://x/doc.pdf");
    expect(risolvi).toHaveBeenCalledWith("Archivio Attestati Sicurezza/A/doc.pdf");
    await clic(screen.getByRole("button", { name: /Nascondi attestato/ }));
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("mostra un'immagine se il file non è un PDF", async () => {
    risolvi.mockResolvedValue({ url: "https://x/foto.jpg", tipo: "storage", isPdf: false, nomeFile: "foto.jpg", percorsoOriginale: "foto.jpg" });
    render(<AnteprimaAttestato fronte="Coda/foto.jpg" />);
    await clic(screen.getByRole("button", { name: /Mostra attestato/ }));
    expect(document.querySelector("img")?.getAttribute("src")).toBe("https://x/foto.jpg");
  });

  it("file non trovato: messaggio con il nome del file", async () => {
    risolvi.mockResolvedValue({ url: null, tipo: "mancante", isPdf: true, nomeFile: "perso.pdf", percorsoOriginale: "x/perso.pdf" });
    render(<AnteprimaAttestato fronte="ATTESTATI 2026-27/perso.pdf" />);
    await clic(screen.getByRole("button", { name: /Mostra attestato/ }));
    expect(screen.getByRole("alert").textContent).toContain("perso.pdf");
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("il retro, se c'è, ha il suo pulsante", () => {
    render(<AnteprimaAttestato fronte="a.pdf" retro="b.pdf" />);
    expect(screen.getByRole("button", { name: /Mostra attestato/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Mostra retro/ })).toBeTruthy();
  });
});

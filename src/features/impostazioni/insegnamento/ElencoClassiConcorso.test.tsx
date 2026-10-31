/*
 * File:          ElencoClassiConcorso.test.tsx
 * Percorso:      src/features/impostazioni/insegnamento/ElencoClassiConcorso.test.tsx
 * Data creazione: 2026-10-31
 * Revisioni:
 *   - Rev 1 (2026-10-31 10:00): Modifica della denominazione: salva con Invio, annulla con Esc, resta aperta se il salvataggio fallisce.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ElencoClassiConcorso } from "./ElencoClassiConcorso";

const classi = [
  { id: "1", codice: "A027", denominazione: null, usi: 13, da_lavoratore: true, attivo: true },
  { id: "2", codice: "A01", denominazione: "Arte e immagine", usi: 0, da_lavoratore: false, attivo: true },
];

function mostra(salva: (id: string, t: string) => Promise<boolean>) {
  return render(
    <ElencoClassiConcorso
      totale={2}
      classi={classi}
      isLoading={false}
      filtro=""
      onFiltro={() => {}}
      busy={null}
      onCambiaAttiva={() => {}}
      onSalvaDenominazione={salva}
      onRimuovi={() => {}}
    />,
  );
}

afterEach(cleanup);

describe("modifica della denominazione di una classe di concorso", () => {
  it("la matita apre il campo e Invio salva il testo scritto", async () => {
    const salva = vi.fn().mockResolvedValue(true);
    mostra(salva);
    fireEvent.click(screen.getByLabelText("Modifica denominazione di A027"));
    const campo = screen.getByLabelText("Denominazione di A027");
    fireEvent.change(campo, { target: { value: "Matematica e fisica" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    await waitFor(() => expect(salva).toHaveBeenCalledWith("1", "Matematica e fisica"));
    await waitFor(() => expect(screen.queryByLabelText("Denominazione di A027")).toBeNull());
  });

  it("Esc annulla senza salvare", () => {
    const salva = vi.fn();
    mostra(salva);
    fireEvent.click(screen.getByLabelText("Modifica denominazione di A01"));
    expect((screen.getByLabelText("Denominazione di A01") as HTMLInputElement).value).toBe("Arte e immagine");
    fireEvent.keyDown(screen.getByLabelText("Denominazione di A01"), { key: "Escape" });
    expect(salva).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Denominazione di A01")).toBeNull();
  });

  it("se il salvataggio fallisce il campo resta aperto per riprovare", async () => {
    const salva = vi.fn().mockResolvedValue(false);
    mostra(salva);
    fireEvent.click(screen.getByLabelText("Modifica denominazione di A027"));
    const campo = screen.getByLabelText("Denominazione di A027");
    fireEvent.change(campo, { target: { value: "Prova" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    await waitFor(() => expect(salva).toHaveBeenCalled());
    expect(screen.getByLabelText("Denominazione di A027")).toBeTruthy();
  });
});

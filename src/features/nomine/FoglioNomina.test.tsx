/*
 * File:      FoglioNomina.test.tsx
 * Percorso:  src/features/nomine/FoglioNomina.test.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — L'intestazione della lettera segue la ditta: ragione sociale, recapiti e logo si leggono dall'anagrafica.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { costruisciDocumento } from "./documento";
import { FoglioNomina } from "./components/FoglioNomina";
import { MODELLI_DEFAULT } from "./modelli-default";

const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABQCAIAAAARP+ljAAABF0lEQVR4nO3awQnAIBQFQSuxsFRndakjLQQPgawD7z7KXv+Y19reveb2uN+447QPn+YKHHcFjrsCx12B467AcVfguCtw3BU47gocdwWOuwLHXYHjrsBxV+C4K3DcFTjuChx3BY6744+P5r6fwHFX4LgrcNwVOO4KHHcFjrsCx12B467AcVfguCtw3BU47gocdwWOuwLHXYHjrsBxV+C4K3DcdXQXdwWOuwLHXYHjrsBxV+C4K3DcFTjuChx3BY67AsddgeOuwHFX4LgrcNwVOO4KHHcFjrsCx12B466ju7grcNwVOO4KHHcFjrsCx12B467AcVfguCtw3BU47gocdwWOuwLHXYHjrsBxV+C4K3DcFTjuChx3H+baX/17oPF7AAAAAElFTkSuQmCC";
const dati = { nome: "Rossi Mario", anno: "2026-2027", protocollo: "10", data: "12/11/2026" };

describe("FoglioNomina", () => {
  it("mostra intestazione e logo della ditta e il nome del nominato", () => {
    const ditta = {
      ragione_sociale: "Alfa Srl",
      indirizzo: "Via Roma 1",
      comune: "Milano",
      provincia: "MI",
      pec: "alfa@pec.it",
      logo_data_url: LOGO,
      datore_di_lavoro: "Luca Verdi",
    };
    render(
      <FoglioNomina
        ditta={ditta}
        blocchi={costruisciDocumento(MODELLI_DEFAULT.evacuazione, ditta, dati)}
      />,
    );
    expect(screen.getByText("Alfa Srl")).toBeTruthy();
    expect(screen.getByText(/PEC: alfa@pec.it/)).toBeTruthy();
    expect(screen.getByAltText("Logo Alfa Srl")).toBeTruthy();
    expect(screen.getAllByText("Rossi Mario").length).toBeGreaterThan(0);
    expect(screen.getByText("Il Datore di Lavoro")).toBeTruthy();
  });

  it("senza logo in anagrafica non mostra nessuna immagine", () => {
    const ditta = { ragione_sociale: "Beta Spa" };
    render(
      <FoglioNomina
        ditta={ditta}
        blocchi={costruisciDocumento(MODELLI_DEFAULT.sds, ditta, dati)}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
  });
});

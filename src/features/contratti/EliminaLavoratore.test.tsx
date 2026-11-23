/*
 * File:      EliminaLavoratore.test.tsx
 * Percorso:  src/features/contratti/EliminaLavoratore.test.tsx
 * Data creaz: 23/11/2026
 * Revisioni:
 *   rev 1 — 23/11/2026 08:55 — Doppia conferma: nulla viene cancellato prima del secondo «sì»; avviso attestati; scheda deselezionata.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { dati } = vi.hoisted(() => ({
  dati: { tabelle: {}, singoli: { ditta: { organigramma_voci: [] } } },
}));

vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});
vi.mock("sonner", async () => {
  const { creaToastFinto } = await import("@/test/registratore-supabase");
  return { toast: creaToastFinto(vi) };
});

import { registro } from "@/test/registratore-supabase";
import { EliminaLavoratore } from "./EliminaLavoratore";

const lav = {
  id: "d1",
  cognome: "ROSSI",
  nome: "MARIO",
  codice_fiscale: "RSSMRA80A01H501U",
  reparto: "Docente",
  email: null,
  sottoreparto: null,
  classe_concorso: null,
  materia: null,
  luogo_nascita: null,
  data_nascita: null,
};
const attendi = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
// Ogni cancellazione lascia due righe nel registro (delete e filtro): si conta solo la chiamata delete().
const cancellazioni = () =>
  registro.filter((r) => r[0] === "sb" && r[1] === "from.delete" && r[2] === "dipendenti");

function mostra(nAttestati: number, onEliminato = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EliminaLavoratore corrente={lav} nAttestati={nAttestati} onEliminato={onEliminato} />
    </QueryClientProvider>,
  );
  return onEliminato;
}

beforeEach(() => {
  registro.length = 0;
});
afterEach(() => cleanup());

describe("EliminaLavoratore", () => {
  it("mostra la zona di pericolo con il pulsante", () => {
    mostra(0);
    expect(screen.getByText("Zona di pericolo")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Elimina definitivamente lavoratore/ })).toBeTruthy();
  });

  it("primo passo: riepilogo del lavoratore e nessuna cancellazione; «Annulla» chiude", async () => {
    mostra(0);
    fireEvent.click(screen.getByRole("button", { name: /Elimina definitivamente lavoratore/ }));
    await attendi();
    expect(screen.getByText("RSSMRA80A01H501U")).toBeTruthy();
    expect(screen.getByText(/non ha attestati registrati/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
    await attendi();
    expect(screen.queryByText("RSSMRA80A01H501U")).toBeNull();
    expect(cancellazioni()).toHaveLength(0);
  });

  it("avvisa se ci sono attestati", async () => {
    mostra(3);
    fireEvent.click(screen.getByRole("button", { name: /Elimina definitivamente lavoratore/ }));
    await attendi();
    expect(screen.getByText(/ha 3 attestati registrati/)).toBeTruthy();
    expect(screen.getByText(/restano dove sono/)).toBeTruthy();
  });

  it("«Elimina per sempre» passa alla seconda conferma senza cancellare nulla", async () => {
    mostra(1);
    fireEvent.click(screen.getByRole("button", { name: /Elimina definitivamente lavoratore/ }));
    await attendi();
    fireEvent.click(screen.getByRole("button", { name: "Elimina per sempre" }));
    await attendi();
    expect(screen.getByText("Sei sicuro di volerlo eliminare per sempre?")).toBeTruthy();
    expect(cancellazioni()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "No, annulla" }));
    await attendi();
    expect(cancellazioni()).toHaveLength(0);
  });

  it("solo con il secondo «sì» elimina, avvisa e deseleziona la scheda", async () => {
    const onEliminato = mostra(1);
    fireEvent.click(screen.getByRole("button", { name: /Elimina definitivamente lavoratore/ }));
    await attendi();
    fireEvent.click(screen.getByRole("button", { name: "Elimina per sempre" }));
    await attendi();
    fireEvent.click(screen.getByRole("button", { name: "Sì, elimina per sempre" }));
    await attendi();
    expect(cancellazioni()).toHaveLength(1);
    expect(
      registro.some(
        (r) => r[0] === "toast.success" && r[1] === "Lavoratore eliminato definitivamente",
      ),
    ).toBe(true);
    expect(onEliminato).toHaveBeenCalledTimes(1);
  });
});

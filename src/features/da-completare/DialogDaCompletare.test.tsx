/*
 * File:      DialogDaCompletare.test.tsx
 * Percorso:  src/features/da-completare/DialogDaCompletare.test.tsx
 * Creato:    06/11/2026
 * Test della finestra «Da completare»: avanzamento «1 di 2», dati mancanti, Salta, Salva e prossimo
 * (con azzeramento della data di cessazione dei riabilitati), riepilogo finale.
 * Revisioni:
 *   rev 1 — 06/11/2026 08:20 — Prima stesura.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { dati } = vi.hoisted(() => ({ dati: { tabelle: { reparti: [], sottoreparti: [], classi_concorso: [], materie: [] } } }));

vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});
vi.mock("sonner", async () => {
  const { creaToastFinto } = await import("@/test/registratore-supabase");
  return { toast: creaToastFinto(vi) };
});

import { registro } from "@/test/registratore-supabase";
import type { Dipendente } from "@/lib/api";
import { DialogDaCompletare } from "./DialogDaCompletare";

const lav = (id: string, cognome: string, nome: string, extra: Partial<Dipendente>) =>
  ({
    id, cognome, nome, codice_fiscale: `CF${id}`, email: null, reparto: "ATA", sottoreparto: null, classe_concorso: null, materia: null,
    luogo_nascita: "CREMONA", data_nascita: "1990-01-01", codice_ateco: "", tipo_contratto: "indeterminato",
    data_assunzione: "2026-09-01", data_fine_contratto: null, stato_lavoratore: "in_forza", data_cessazione: null, note_contratto: null,
    ...extra,
  }) as Dipendente;

const elenco = [
  lav("1", "BIANCHI", "ANNA", { luogo_nascita: "" }), // nuovo, manca il luogo di nascita (e il profilo ATA)
  lav("2", "VERDI", "LUCA", { sottoreparto: "Assistente amministrativo", data_cessazione: "2026-08-31" }), // riabilitato
  lav("3", "NERI", "OLGA", { data_assunzione: "2015-09-01", luogo_nascita: "" }), // vecchio incompleto: fuori coda
];

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };

beforeEach(() => {
  registro.length = 0;
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-06T09:00:00Z"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

function apri() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DialogDaCompletare open onClose={() => {}} dipendenti={elenco} repartiAttivi={["Docente", "ATA"]} />
    </QueryClientProvider>,
  );
}

describe("finestra «Da completare»", () => {
  it("parte dal primo della coda in ordine alfabetico e lascia fuori i vecchi incompleti", async () => {
    apri();
    await attendi();
    expect(screen.getByText(/Lavoratore 1 di 2/)).toBeTruthy();
    expect(screen.getByText("BIANCHI ANNA")).toBeTruthy();
    expect(screen.getAllByText(/manca: luogo di nascita/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/NERI/)).toBeNull();
  });

  it("Salta passa al successivo; il riabilitato è segnalato", async () => {
    apri();
    await attendi();
    await clic(screen.getByText("Salta"));
    expect(screen.getByText(/Lavoratore 2 di 2/)).toBeTruthy();
    expect(screen.getByText(/Riabilitato \(cessato il/)).toBeTruthy();
  });

  it("Salva e prossimo azzera la data di cessazione e a fine coda mostra il riepilogo", async () => {
    apri();
    await attendi();
    await clic(screen.getByText("Salta"));
    await clic(screen.getByText("Salva e prossimo"));
    const aggiornamento = registro.find((r) => r[1] === "from.update" && r[2] === "dipendenti");
    expect(aggiornamento).toBeTruthy();
    expect(String(aggiornamento?.[3])).toContain('"data_cessazione":null');
    expect(String(aggiornamento?.[3])).toContain('"cognome":"VERDI"');
    expect(screen.getByText(/Completati 1, saltati 1/)).toBeTruthy();
    expect(screen.getByText(/Rivedi i saltati \(1\)/)).toBeTruthy();
  });

  it("non salva se mancano cognome, nome o codice fiscale", async () => {
    apri();
    await attendi();
    const cognome = screen.getByText("Cognome", { selector: "label" }).parentElement!.querySelector("input")!;
    fireEvent.change(cognome, { target: { value: "" } });
    await clic(screen.getByText("Salva e prossimo"));
    expect(registro.some((r) => r[1] === "from.update")).toBe(false);
    expect(screen.getByText(/Lavoratore 1 di 2/)).toBeTruthy();
  });

  it("scrive cognome e nome in maiuscolo mentre si digita", async () => {
    apri();
    await attendi();
    const nome = screen.getByText("Nome", { selector: "label" }).parentElement!.querySelector("input")!;
    fireEvent.change(nome, { target: { value: "maria" } });
    expect(nome.value).toBe("MARIA");
  });
});

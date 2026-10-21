/*
 * Test di flusso di «Attestati (PDF)» nella scheda dipendente.
 * Registra chiamate al database/storage, notifiche e contenuto del dialog e le confronta con lo snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { dati } = vi.hoisted(() => ({
  dati: {
    tabelle: {
      documenti_attestati: [
        { id: "doc1", dipendente_id: "d1", codice_fiscale: "RSSMRA80A01H501U", tipo_attestato: "Antincendio", tipo_personalizzato: null, data_scadenza: "2030-01-10", nome_file: "2025-01_ROSSI_MARIO_RSSMRA80A01H501U_ANTINCENDIO.pdf", percorso_file: "Archivio Attestati Sicurezza/ROSSI_MARIO_RSSMRA80A01H501U/2025-01_ROSSI_MARIO_RSSMRA80A01H501U_ANTINCENDIO.pdf", created_at: "2026-01-01" },
        { id: "doc2", dipendente_id: "d1", codice_fiscale: "RSSMRA80A01H501U", tipo_attestato: "Altro", tipo_personalizzato: "Lavori in quota", data_scadenza: "2026-01-01", nome_file: "2021-01_ROSSI_MARIO_RSSMRA80A01H501U_LAVORI_IN_QUOTA.pdf", percorso_file: "Archivio Attestati Sicurezza/ROSSI_MARIO_RSSMRA80A01H501U/2021-01_ROSSI_MARIO_RSSMRA80A01H501U_LAVORI_IN_QUOTA.pdf", created_at: "2026-01-02" },
      ],
    },
    singoli: { documenti_attestati: { id: "doc-nuovo" } },
  },
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
import { DocumentiAttestati } from "@/features/documenti/DocumentiAttestati";

const dipendente = {
  id: "d1", cognome: "Rossi", nome: "Mario", codice_fiscale: "rssmra80a01h501u", email: null, reparto: null,
  sottoreparto: null, classe_concorso: null, materia: null, luogo_nascita: null, data_nascita: null,
} as never;

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const dialogo = () => (document.querySelector("[role=dialog]")?.textContent ?? "").replace(/\s+/g, " ");
const foto = (etichetta: string) => registro.push(["pagina", etichetta, dialogo()]);

async function scegliTipo(nome: string) {
  const trigger = screen.getByRole("combobox");
  fireEvent.keyDown(trigger, { key: "Enter" });
  await attendi();
  fireEvent.keyDown(screen.getByRole("option", { name: nome }), { key: "Enter" });
  await attendi();
}

beforeEach(() => {
  registro.length = 0;
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "open").mockImplementation(((...a: unknown[]) => { registro.push(["window.open", String(a[0]), String(a[1])]); return null; }) as never);
  URL.createObjectURL = vi.fn(() => "blob:anteprima");
  URL.revokeObjectURL = vi.fn();
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Attestati (PDF): percorso d'uso completo", () => {
  it("registra tutto quello che il componente fa", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DocumentiAttestati dipendente={dipendente} />
      </QueryClientProvider>,
    );
    await screen.findByText("Lavori in quota");
    registro.push(["lista", document.body.textContent?.replace(/\s+/g, " ")]);

    // apri ed elimina
    await clic(screen.getAllByLabelText("Apri PDF")[0]!);
    await clic(screen.getAllByLabelText("Elimina PDF")[1]!);

    // dialog di caricamento
    await clic(screen.getByText("Aggiungi attestato"));
    foto("dialog iniziale");
    expect((screen.getByText(/Conferma e carica/).closest("button") as HTMLButtonElement).disabled).toBe(true);

    // file non PDF: rifiutato
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "foto.jpg", { type: "image/jpeg" })] } });
    await attendi();

    // compilazione completa
    await scegliTipo("Altro");
    fireEvent.change(screen.getByPlaceholderText("Es. Lavori in quota"), { target: { value: "Lavori in quota" } });
    const date = document.querySelectorAll("input[type=date]");
    fireEvent.change(date[0]!, { target: { value: "2026-03-15" } });
    fireEvent.change(date[1]!, { target: { value: "2031-03-15" } });
    fireEvent.change(input, { target: { files: [new File(["%PDF-1.4"], "scan.pdf", { type: "application/pdf" })] } });
    await attendi();
    foto("dialog compilato");
    await clic(screen.getByRole("checkbox"));
    await clic(screen.getByText(/Conferma e carica/));
    registro.push(["dialog chiuso", document.querySelector("[role=dialog]") === null]);

    // annulla a metà
    await clic(screen.getByText("Aggiungi attestato"));
    foto("dialog riaperto (campi azzerati)");
    await clic(screen.getByText("Annulla"));

    expect(registro).toMatchSnapshot();
  });
});

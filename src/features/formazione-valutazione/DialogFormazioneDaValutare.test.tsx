/*
 * File:          DialogFormazioneDaValutare.test.tsx
 * Percorso:      src/features/formazione-valutazione/DialogFormazioneDaValutare.test.tsx
 * Data creazione: 2026-11-21
 * Finestra «Formazione da valutare»: un lavoratore con la specifica da 12 ore in una ditta a rischio medio (atteso: 8 ore) compare da
 * valutare; la decisione richiede una scelta e una nota e si salva sull'attestato; le decise si possono annullare.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { dati, toasts } = vi.hoisted(() => {
  const regola = (ordine: number, parametro: string, valore: string, corso_base: string) => ({
    id: `g${ordine}`, ordine, ruolo_codice: "LAVORATORE", ruolo: "Lavoratore", parametro, valore, corso_base, corso_aggiornamento: null, applica: false,
  });
  return {
    dati: {
      singoli: { ditta: { id: true, rischio_ditta: "medio" } } as Record<string, unknown>,
      tabelle: {
        dipendenti: [{ id: "d1", cognome: "Rossi", nome: "Mario", codice_fiscale: "RSSMRA", stato_lavoratore: "in_forza" }],
        attestati_caricati: [
          { id: "a1", dipendente_id: "d1", stato_validazione: "Approvato", data_corso: "2024-03-05", tipi_corso: { codice: "SIC-GEN-04", nome_corso: "Formazione generale" } },
          { id: "a2", dipendente_id: "d1", stato_validazione: "Approvato", data_corso: "2024-03-12", tipi_corso: { codice: "SIC-SPE-12", nome_corso: "Specifica 12 ore" } },
        ],
        regole_ruolo_corso: [
          regola(1, "nessuno", "—", "SIC-GEN-04"),
          regola(2, "rischio ATECO", "basso", "SIC-SPE-04"),
          regola(3, "rischio ATECO", "medio", "SIC-SPE-08"),
          regola(4, "rischio ATECO", "alto", "SIC-SPE-12"),
        ],
        tipi_corso: [
          { id: "c1", codice: "SIC-SPE-08", nome_corso: "Specifica 8 ore" },
          { id: "c2", codice: "SIC-SPE-12", nome_corso: "Specifica 12 ore" },
        ],
      } as Record<string, unknown[]>,
    },
    toasts: [] as string[],
  };
});

vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});
vi.mock("sonner", () => ({
  toast: Object.assign((m: string) => toasts.push(m), {
    success: (m: string) => toasts.push(`ok:${m}`),
    error: (m: string) => toasts.push(`errore:${m}`),
  }),
}));

import { registro } from "@/test/registratore-supabase";
import { DialogFormazioneDaValutare } from "./DialogFormazioneDaValutare";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const aggiornamenti = () => registro.filter((r) => String(r[1]).endsWith(".update") && r[2] === "attestati_caricati").map((r) => String(r[3]));

async function apri() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalida = vi.spyOn(qc, "invalidateQueries");
  render(<QueryClientProvider client={qc}><DialogFormazioneDaValutare open onClose={() => {}} /></QueryClientProvider>);
  await attendi();
  await attendi();
  return { invalida };
}

const attestatoA2 = () => dati.tabelle["attestati_caricati"]!.find((a) => (a as { id: string }).id === "a2") as Record<string, unknown>;
const ditta = () => dati.singoli["ditta"] as Record<string, unknown>;

beforeEach(() => {
  registro.length = 0;
  toasts.length = 0;
  ditta()["rischio_ditta"] = "medio";
  for (const k of ["esito", "corso_svolto", "corso_atteso", "rischio", "nota", "data"]) delete attestatoA2()[`equivalenza_${k}`];
});
afterEach(cleanup);

describe("Formazione da valutare", () => {
  it("elenca il lavoratore con il corso che ha e quello atteso per il rischio della ditta", async () => {
    await apri();
    const testo = document.body.textContent!;
    expect(testo).toContain("Da valutare (1)");
    expect(testo).toContain("Rossi Mario");
    expect(testo).toContain("SIC-SPE-12 – Specifica 12 ore");
    expect(testo).toContain("rischio medio");
    expect(testo).toContain("SIC-SPE-08 – Specifica 8 ore");
  });

  it("il pulsante resta spento finché non c'è una scelta e una nota", async () => {
    await apri();
    const salva = screen.getByRole("button", { name: "Salva decisione" }) as HTMLButtonElement;
    expect(salva.disabled).toBe(true);
    await clic(screen.getByRole("radio", { name: /Accettata come equivalente/ }));
    expect(salva.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Nota (obbligatoria)"), { target: { value: "Stesso settore" } });
    await attendi();
    expect(salva.disabled).toBe(false);
  });

  it("salva la decisione sull'attestato del corso diverso e aggiorna gli attestati", async () => {
    const { invalida } = await apri();
    await clic(screen.getByRole("radio", { name: /Non valida/ }));
    fireEvent.change(screen.getByLabelText("Nota (obbligatoria)"), { target: { value: "Settore diverso" } });
    await attendi();
    await clic(screen.getByRole("button", { name: "Salva decisione" }));
    const aggiornamento = aggiornamenti().at(-1)!;
    expect(aggiornamento).toContain('"equivalenza_esito":"non_valida"');
    expect(aggiornamento).toContain('"equivalenza_corso_svolto":"SIC-SPE-12"');
    expect(aggiornamento).toContain('"equivalenza_corso_atteso":"SIC-SPE-08"');
    expect(aggiornamento).toContain('"equivalenza_rischio":"medio"');
    expect(aggiornamento).toContain('"equivalenza_nota":"Settore diverso"');
    expect(registro.some((r) => String(r[1]).endsWith(".eq") && String(r[3]).includes('"a2"'))).toBe(true);
    expect(toasts).toContain("ok:Decisione salvata");
    expect(invalida.mock.calls.some(([f]) => JSON.stringify((f as { queryKey: unknown }).queryKey) === '["attestati"]')).toBe(true);
  });

  it("una decisione già presa passa tra le «Decise» e si può annullare", async () => {
    Object.assign(attestatoA2(), {
      equivalenza_esito: "accettata", equivalenza_corso_svolto: "SIC-SPE-12", equivalenza_corso_atteso: "SIC-SPE-08",
      equivalenza_rischio: "medio", equivalenza_nota: "Stesso settore", equivalenza_data: "2026-11-21T10:00:00.000Z",
    });
    await apri();
    expect(document.body.textContent).toContain("Da valutare (0)");
    expect(document.body.textContent).toContain("Decise (1)");
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Decise/ }));
    await attendi();
    expect(document.body.textContent).toContain("Accettata come equivalente");
    expect(document.body.textContent).toContain("Stesso settore");
    await clic(screen.getByRole("button", { name: "Annulla decisione" }));
    const aggiornamento = aggiornamenti().at(-1)!;
    expect(aggiornamento).toBe(
      JSON.stringify([{ equivalenza_esito: null, equivalenza_corso_svolto: null, equivalenza_corso_atteso: null, equivalenza_rischio: null, equivalenza_nota: null, equivalenza_data: null }]),
    );
  });

  it("se la ditta ha cambiato grado di rischio la decisione decade e torna da valutare", async () => {
    Object.assign(attestatoA2(), {
      equivalenza_esito: "accettata", equivalenza_corso_svolto: "SIC-SPE-12", equivalenza_corso_atteso: "SIC-SPE-08",
      equivalenza_rischio: "medio", equivalenza_nota: "Stesso settore", equivalenza_data: "2026-11-21T10:00:00.000Z",
    });
    ditta()["rischio_ditta"] = "basso";
    await apri();
    expect(document.body.textContent).toContain("Da valutare (1)");
    expect(document.body.textContent).toContain("SIC-SPE-04");
  });

  it("senza grado di rischio della ditta lo dice e non propone decisioni", async () => {
    ditta()["rischio_ditta"] = null;
    await apri();
    expect(document.body.textContent).toContain("grado di rischio della ditta non è impostato");
    expect(screen.queryByRole("button", { name: "Salva decisione" })).toBeNull();
  });
});

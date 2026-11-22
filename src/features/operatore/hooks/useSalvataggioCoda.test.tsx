/*
 * File:      useSalvataggioCoda.test.tsx
 * Percorso:  src/features/operatore/hooks/useSalvataggioCoda.test.tsx
 * Data creazione: 22/11/2026
 * Test di «Archivia subito»: controlli preventivi e protezione di modulo e allegato.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const { inserisci, aggiorna, carica, toast } = vi.hoisted(() => ({
  inserisci: vi.fn(),
  aggiorna: vi.fn(),
  carica: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: (payload: unknown) => ({ select: () => ({ single: async () => inserisci(payload) }) }),
      update: (payload: unknown) => ({ eq: (_c: string, id: string) => ({ select: () => ({ single: async () => aggiorna(payload, id) }) }) }),
    }),
    storage: { from: () => ({ upload: carica }) },
  },
}));

import { useDocumento } from "./useDocumento";
import { useFormRiga } from "./useFormRiga";
import { useSalvataggioCoda } from "./useSalvataggioCoda";
import type { CodaRiga } from "../types";

function monta(archivia: (r: CodaRiga[]) => Promise<boolean>) {
  const nuovo = vi.fn();
  const ricarica = vi.fn();
  const vista = renderHook(() => {
    const formRiga = useFormRiga();
    const documento = useDocumento();
    const salvataggio = useSalvataggioCoda({ formRiga, documento, righeCoda: [], ricarica, archivia, nuovo });
    return { formRiga, documento, salvataggio };
  });
  return { vista, nuovo, ricarica };
}

const compila = (vista: ReturnType<typeof monta>["vista"], extra: Record<string, unknown> = {}) =>
  act(async () => {
    const { set } = vista.result.current.formRiga;
    set("cognome", "ROSSI");
    set("nome", "MARIO");
    set("codice_fiscale", "RSSMRA80A01H501U");
    for (const [k, v] of Object.entries(extra)) set(k as never, v as never);
  });

beforeEach(() => {
  vi.clearAllMocks();
  inserisci.mockResolvedValue({ data: { id: "riga-1" }, error: null });
  aggiorna.mockResolvedValue({ data: { id: "riga-1" }, error: null });
  carica.mockResolvedValue({ error: null });
});

describe("Archivia subito: controlli preventivi", () => {
  it("senza corso: avvisa e non crea nulla, il modulo resta com'è", async () => {
    const archivia = vi.fn(async () => true);
    const { vista, nuovo } = monta(archivia);
    await compila(vista, { data_corso: "2026-09-01" });
    await act(async () => void (await vista.result.current.salvataggio.salvaInCoda(true)));
    expect(toast.error).toHaveBeenCalledWith("Scegli il corso identificato prima di archiviare");
    expect(inserisci).not.toHaveBeenCalled();
    expect(archivia).not.toHaveBeenCalled();
    expect(nuovo).not.toHaveBeenCalled();
    expect(vista.result.current.formRiga.form.cognome).toBe("ROSSI");
  });

  it("senza data: avvisa, non carica il file e non svuota il modulo", async () => {
    const archivia = vi.fn(async () => true);
    const { vista, nuovo } = monta(archivia);
    await compila(vista, { tipo_corso_id: "t1" });
    await act(async () => vista.result.current.documento.setFile(new File(["x"], "att.pdf", { type: "application/pdf" })));
    await act(async () => void (await vista.result.current.salvataggio.salvaInCoda(true)));
    expect(toast.error).toHaveBeenCalledWith("Inserisci la data del corso rilevata dall'attestato prima di archiviare");
    expect(carica).not.toHaveBeenCalled();
    expect(inserisci).not.toHaveBeenCalled();
    expect(nuovo).not.toHaveBeenCalled();
    expect(vista.result.current.documento.file).not.toBeNull();
  });

  it("«Aggiungi alla coda» resta possibile anche senza corso e data (la coda è una bozza)", async () => {
    const { vista, nuovo } = monta(vi.fn(async () => true));
    await compila(vista);
    await act(async () => void (await vista.result.current.salvataggio.salvaInCoda(false)));
    expect(inserisci).toHaveBeenCalledTimes(1);
    expect(nuovo).toHaveBeenCalledTimes(1);
  });
});

describe("Archivia subito: esito dell'archiviazione", () => {
  it("archiviazione riuscita: svuota il modulo", async () => {
    const archivia = vi.fn(async () => true);
    const { vista, nuovo } = monta(archivia);
    await compila(vista, { tipo_corso_id: "t1", data_corso: "2026-09-01" });
    await act(async () => void (await vista.result.current.salvataggio.salvaInCoda(true)));
    expect(archivia).toHaveBeenCalledTimes(1);
    expect(nuovo).toHaveBeenCalledTimes(1);
  });

  it("archiviazione fallita: modulo e anteprima restano, e un secondo tentativo aggiorna la stessa riga", async () => {
    const archivia = vi.fn(async () => false);
    const { vista, nuovo } = monta(archivia);
    await compila(vista, { tipo_corso_id: "t1", data_corso: "2026-09-01" });
    await act(async () => vista.result.current.documento.setAnteprima("blob:x"));
    await act(async () => void (await vista.result.current.salvataggio.salvaInCoda(true)));

    expect(nuovo).not.toHaveBeenCalled();
    expect(vista.result.current.formRiga.form.cognome).toBe("ROSSI");
    expect(vista.result.current.documento.anteprima).toBe("blob:x");
    expect(vista.result.current.formRiga.idInModifica).toBe("riga-1");

    await act(async () => void (await vista.result.current.salvataggio.salvaInCoda(true)));
    expect(inserisci).toHaveBeenCalledTimes(1); // nessun doppione in coda
    expect(aggiorna).toHaveBeenCalledTimes(1);
    expect(aggiorna.mock.calls[0]![1]).toBe("riga-1");
  });

  it("con file allegato: dopo un'archiviazione fallita il file non viene caricato una seconda volta", async () => {
    const archivia = vi.fn(async () => false);
    const { vista } = monta(archivia);
    await compila(vista, { tipo_corso_id: "t1", data_corso: "2026-09-01" });
    await act(async () => vista.result.current.documento.setFile(new File(["x"], "att.png", { type: "image/png" })));
    await act(async () => void (await vista.result.current.salvataggio.salvaInCoda(true)));
    expect(carica).toHaveBeenCalledTimes(1);
    const percorso = (inserisci.mock.calls[0]![0] as { percorso_file: string }).percorso_file;

    await act(async () => void (await vista.result.current.salvataggio.salvaInCoda(true)));
    expect(carica).toHaveBeenCalledTimes(1);
    expect((aggiorna.mock.calls[0]![0] as { percorso_file: string }).percorso_file).toBe(percorso);
  });
});

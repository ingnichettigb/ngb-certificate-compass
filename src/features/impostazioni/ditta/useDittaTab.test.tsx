/*
 * File:          useDittaTab.test.tsx
 * Percorso:      src/features/impostazioni/ditta/useDittaTab.test.tsx
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 14:00): Scheda Ditta: codice ATECO controllato, normalizzato e senza doppioni; data di aggiornamento
 *     impostata da sola quando cambia il numero dei lavoratori o delle presenze.
 *   - Rev 2 (2026-11-15): Mock di getSedi e contaLavoratoriInForza (mai risolto) per non far scattare la sincronizzazione automatica
 *     di lavoratori e presenze dalle sedi durante i test esistenti.
 *   - Rev 3 (2026-11-15): Il primo codice ATECO inserito è «principale» (principale: true). Nuovi test: l'allineamento automatico di
 *     N. lavoratori (anagrafica) e Presenze (sedi) non conta come modifica non salvata (isDirty), una modifica dell'utente sì.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { errori } = vi.hoisted(() => ({ errori: [] as string[] }));
vi.mock("sonner", () => ({
  toast: { error: (m: string) => errori.push(m), success: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/api/ditta", async (importOriginal) => {
  const reale = await importOriginal<typeof import("@/lib/api/ditta")>();
  return {
    ...reale,
    getDitta: vi.fn(async () => ({ ...reale.DITTA_DEFAULT })),
    getSoglieDitta: vi.fn(async () => []),
    salvaDitta: vi.fn(),
    // Conteggio lavoratori in forza: mai risolto, così i test esistenti non vengono toccati dalla sincronizzazione automatica
    contaLavoratoriInForza: vi.fn(() => new Promise<number>(() => {})),
  };
});

vi.mock("@/lib/api/sedi", async (importOriginal) => {
  const reale = await importOriginal<typeof import("@/lib/api/sedi")>();
  return { ...reale, getSedi: vi.fn(async () => []) };
});

import { contaLavoratoriInForza, DITTA_DEFAULT, getDitta } from "@/lib/api/ditta";
import { getSedi } from "@/lib/api/sedi";
import { useDittaTab } from "./useDittaTab";

function avvolgi({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function pronto() {
  const r = renderHook(() => useDittaTab(), { wrapper: avvolgi });
  await waitFor(() => expect(r.result.current.form).not.toBeNull());
  return r;
}

beforeEach(() => {
  errori.length = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-01T10:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function scrivi(r: Awaited<ReturnType<typeof pronto>>, codice: string, descrizione = "") {
  act(() => r.result.current.setNuovoAteco({ codice, descrizione }));
}

describe("codici ATECO nella scheda Ditta", () => {
  it("aggiunge un codice valido normalizzato, con il rischio suggerito per l'Istruzione", async () => {
    const r = await pronto();
    scrivi(r, "853120", "Istruzione secondaria");
    act(() => r.result.current.aggiungiAteco());
    expect(r.result.current.form!.codici_ateco).toEqual([
      { codice: "85.31.20", descrizione: "Istruzione secondaria", rischio: "medio", principale: true },
    ]);
    expect(r.result.current.nuovoAteco).toEqual({ codice: "", descrizione: "" });
  });

  it("per gli altri settori non inventa il rischio", async () => {
    const r = await pronto();
    scrivi(r, "47.11");
    act(() => r.result.current.aggiungiAteco());
    expect(r.result.current.form!.codici_ateco).toEqual([
      { codice: "47.11", descrizione: "", principale: true },
    ]);
  });

  it("il secondo codice non è principale", async () => {
    const r = await pronto();
    scrivi(r, "85.31");
    act(() => r.result.current.aggiungiAteco());
    scrivi(r, "47.11");
    act(() => r.result.current.aggiungiAteco());
    expect(r.result.current.form!.codici_ateco.map((c) => c.principale)).toEqual([true, undefined]);
  });

  it("rifiuta un codice non valido e uno già inserito", async () => {
    const r = await pronto();
    scrivi(r, "abc");
    act(() => r.result.current.aggiungiAteco());
    expect(errori).toEqual(["Codice ATECO non valido"]);
    expect(r.result.current.form!.codici_ateco).toEqual([]);

    scrivi(r, "85.31");
    act(() => r.result.current.aggiungiAteco());
    scrivi(r, "8531");
    act(() => r.result.current.aggiungiAteco());
    expect(errori).toEqual(["Codice ATECO non valido", "Codice ATECO già inserito"]);
    expect(r.result.current.form!.codici_ateco).toHaveLength(1);
  });
});

describe("date di aggiornamento", () => {
  it("cambiando il numero dei lavoratori la data diventa oggi; svuotandolo si azzera", async () => {
    const r = await pronto();
    act(() => r.result.current.updateCampo("n_lavoratori_dichiarato", 90));
    expect(r.result.current.form!.n_lavoratori_data_aggiornamento).toBe("2026-11-01");
    act(() => r.result.current.updateCampo("n_lavoratori_dichiarato", null));
    expect(r.result.current.form!.n_lavoratori_data_aggiornamento).toBeNull();
  });

  it("cambiando le presenze la data delle presenze diventa oggi", async () => {
    const r = await pronto();
    act(() => r.result.current.updateCampo("presenze_contemporanee_max", 850));
    expect(r.result.current.form!.presenze_data_aggiornamento).toBe("2026-11-01");
  });

  it("modificando un altro campo non tocca le date", async () => {
    const r = await pronto();
    act(() => r.result.current.updateCampo("referente", "Mario Rossi"));
    expect(r.result.current.form!.n_lavoratori_data_aggiornamento).toBeNull();
    expect(r.result.current.form!.presenze_data_aggiornamento).toBeNull();
  });
});

describe("modifiche non salvate (isDirty)", () => {
  const sedeCentrale = (persone: number | null) =>
    ({
      id: "s1",
      nome: "Sede Centrale",
      is_principale: true,
      attiva: true,
      persone_max: persone,
      ordine: 0,
    }) as unknown as Awaited<ReturnType<typeof getSedi>>[number];

  afterEach(() => {
    vi.mocked(contaLavoratoriInForza).mockImplementation(() => new Promise<number>(() => {}));
    vi.mocked(getSedi).mockImplementation(async () => []);
    vi.mocked(getDitta).mockImplementation(async () => ({ ...DITTA_DEFAULT }));
  });

  it("aprendo la finestra senza toccare nulla non risulta modificato, anche con 127 dichiarati e 128 in forza", async () => {
    vi.mocked(getDitta).mockImplementation(async () => ({
      ...DITTA_DEFAULT,
      n_lavoratori_dichiarato: 127,
      n_lavoratori_data_aggiornamento: "2026-10-01",
    }));
    vi.mocked(contaLavoratoriInForza).mockResolvedValue(128);
    const r = await pronto();
    // Il form mostra il conteggio dell'anagrafica…
    await waitFor(() => expect(r.result.current.form!.n_lavoratori_dichiarato).toBe(128));
    expect(r.result.current.form!.n_lavoratori_data_aggiornamento).toBe("2026-11-01");
    // …ma «Torna» non deve chiedere conferma: nessuna modifica dell'utente
    expect(r.result.current.isDirty).toBe(false);
  });

  it("una modifica dell'utente accende isDirty e «scarta» lo spegne", async () => {
    vi.mocked(getDitta).mockImplementation(async () => ({ ...DITTA_DEFAULT, n_lavoratori_dichiarato: 127 }));
    vi.mocked(contaLavoratoriInForza).mockResolvedValue(128);
    const r = await pronto();
    await waitFor(() => expect(r.result.current.form!.n_lavoratori_dichiarato).toBe(128));
    act(() => r.result.current.updateCampo("referente", "Mario Rossi"));
    expect(r.result.current.isDirty).toBe(true);
    act(() => r.result.current.reimpostaForm());
    await waitFor(() => expect(r.result.current.form!.referente).not.toBe("Mario Rossi"));
    expect(r.result.current.isDirty).toBe(false);
  });

  it("anche la somma delle presenze dalle sedi è un allineamento automatico, non una modifica", async () => {
    vi.mocked(getSedi).mockImplementation(async () => [sedeCentrale(450)]);
    const r = await pronto();
    await waitFor(() => expect(r.result.current.form!.presenze_contemporanee_max).toBe(450));
    expect(r.result.current.form!.presenze_data_aggiornamento).toBe("2026-11-01");
    expect(r.result.current.isDirty).toBe(false);
  });

  it("senza anagrafica né sedi il form resta pulito", async () => {
    const r = await pronto();
    expect(r.result.current.isDirty).toBe(false);
  });
});

/*
 * File:      useArchiviazione.nuovi.test.tsx
 * Percorso:  src/features/operatore/hooks/useArchiviazione.nuovi.test.tsx
 * Data creazione: 22/11/2026
 * Test: l'archiviazione segnala i lavoratori CREATI ex novo (CF non in anagrafica) per aprire la scheda da completare.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { cerca, upsert, stato, toast } = vi.hoisted(() => ({
  cerca: vi.fn(),
  upsert: vi.fn(),
  stato: { insertFallisce: false },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api", () => ({
  generaNumeroAttestato: () => "260901-ANT",
  pulisciCF: (s: string) => (s || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
  upsertDipendente: upsert,
  CARTELLA_ARCHIVIO: "Archivio",
  cartellaDipendente: () => "cartella",
  creaIntegrazioneDvr: vi.fn(),
}));
vi.mock("@/lib/api/dipendenti", () => ({ cercaDipendentePerAnagrafica: cerca }));
vi.mock("@/integrations/supabase/client", () => {
  // Catena di chiamate finta: attesa = elenco vuoto; .single() = riga appena creata (o errore se richiesto).
  const catena = (path: string[]): any =>
    new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") return (ok: (v: unknown) => unknown) => ok({ data: [], error: null, count: 0 });
        return catena([...path, String(prop)]);
      },
      apply() {
        if (path[path.length - 1] === "single") {
          const esito = path.includes("insert") && stato.insertFallisce ? { data: null, error: new Error("insert fallita") } : { data: { id: "att-1" }, error: null };
          return { then: (ok: (v: unknown) => unknown) => ok(esito) };
        }
        return catena([...path, "()"]);
      },
    });
  return { supabase: { from: () => catena(["from"]), storage: { from: () => catena(["storage"]) } } };
});

import { useArchiviazione } from "./useArchiviazione";
import { VUOTA, type CodaRiga } from "../types";

const riga = (id: string, cf: string): CodaRiga => ({
  ...VUOTA,
  id,
  cognome: "ROSSI",
  nome: "MARIO",
  codice_fiscale: cf,
  tipo_corso_id: "t1",
  tipo_corso_nome: "Antincendio",
  data_corso: "2026-09-01",
  percorso_file: null,
  mime_file: null,
  nome_file: null,
  archiviato: false,
  inviato: false,
  argomenti_mancanti: [],
});

function monta(onNuovi: (ids: string[]) => void) {
  const qc = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return renderHook(() => useArchiviazione(() => {}, onNuovi), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  stato.insertFallisce = false;
  upsert.mockImplementation(async (d: { codice_fiscale: string }) => ({ id: `dip-${d.codice_fiscale}`, ...d }));
});

describe("Archiviazione: nuovi lavoratori da completare", () => {
  it("CF non in anagrafica: dopo l'archiviazione segnala il lavoratore appena creato", async () => {
    cerca.mockResolvedValue(null);
    const onNuovi = vi.fn();
    const { result } = monta(onNuovi);
    await act(async () => void (await result.current.archivia([riga("1", "RSSMRA80A01H501U")])));
    expect(cerca).toHaveBeenCalledWith({ codice_fiscale: "RSSMRA80A01H501U" });
    expect(onNuovi).toHaveBeenCalledTimes(1);
    expect(onNuovi).toHaveBeenCalledWith(["dip-RSSMRA80A01H501U"]);
  });

  it("CF già in anagrafica: nessuna scheda da completare", async () => {
    cerca.mockResolvedValue({ id: "dip-esistente" });
    const onNuovi = vi.fn();
    const { result } = monta(onNuovi);
    await act(async () => void (await result.current.archivia([riga("1", "RSSMRA80A01H501U")])));
    expect(onNuovi).not.toHaveBeenCalled();
  });

  it("ricerca in anagrafica fallita: il lavoratore non viene considerato nuovo", async () => {
    cerca.mockRejectedValue(new Error("rete"));
    const onNuovi = vi.fn();
    const { result } = monta(onNuovi);
    await act(async () => void (await result.current.archivia([riga("1", "RSSMRA80A01H501U")])));
    expect(onNuovi).not.toHaveBeenCalled();
  });

  it("più righe: una sola segnalazione con tutti i nuovi, senza chi esisteva già", async () => {
    cerca.mockImplementation(async ({ codice_fiscale }: { codice_fiscale: string }) => (codice_fiscale === "BNCNNA85B41F205X" ? { id: "gia" } : null));
    const onNuovi = vi.fn();
    const { result } = monta(onNuovi);
    await act(async () => void (await result.current.archivia([riga("1", "RSSMRA80A01H501U"), riga("2", "BNCNNA85B41F205X"), riga("3", "VRDLNE80A41H501X")])));
    expect(onNuovi).toHaveBeenCalledTimes(1);
    expect(onNuovi).toHaveBeenCalledWith(["dip-RSSMRA80A01H501U", "dip-VRDLNE80A41H501X"]);
  });

  it("attestato non registrato al primo tentativo: il nuovo lavoratore viene segnalato al secondo", async () => {
    const onNuovi = vi.fn();
    const { result } = monta(onNuovi);
    stato.insertFallisce = true;
    cerca.mockResolvedValue(null);
    await act(async () => void (await result.current.archivia([riga("1", "RSSMRA80A01H501U")])));
    expect(onNuovi).not.toHaveBeenCalled();

    // Al secondo tentativo il lavoratore (creato la prima volta) è già in anagrafica, ma va segnalato lo stesso.
    stato.insertFallisce = false;
    cerca.mockResolvedValue({ id: "dip-RSSMRA80A01H501U" });
    await act(async () => void (await result.current.archivia([riga("1", "RSSMRA80A01H501U")])));
    expect(onNuovi).toHaveBeenCalledTimes(1);
    expect(onNuovi).toHaveBeenCalledWith(["dip-RSSMRA80A01H501U"]);
  });

  it("restituisce true solo se tutti gli attestati sono stati archiviati", async () => {
    cerca.mockResolvedValue({ id: "x" });
    const { result } = monta(vi.fn());
    let esito: boolean | undefined;
    await act(async () => void (esito = await result.current.archivia([riga("1", "RSSMRA80A01H501U")])));
    expect(esito).toBe(true);
    stato.insertFallisce = true;
    await act(async () => void (esito = await result.current.archivia([riga("1", "RSSMRA80A01H501U")])));
    expect(esito).toBe(false);
  });
});

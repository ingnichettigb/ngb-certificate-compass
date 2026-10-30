/*
 * File:          stato-cartelle.test.ts
 * Percorso:      src/lib/api/stato-cartelle.test.ts
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 20:45): Test dello stato cartelle (nessuna / da autorizzare / ok), della richiesta di permesso
 *     e degli esiti di rinomina e salvataggio locale, con cartelle simulate.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

type Permesso = "granted" | "prompt" | "denied";

function cartella(nome: string, iniziale: Permesso, dopoRichiesta: Permesso = "granted") {
  let stato = iniziale;
  const richieste: string[] = [];
  const handle = {
    name: nome,
    kind: "directory",
    queryPermission: vi.fn(async () => stato),
    requestPermission: vi.fn(async ({ mode }: { mode: string }) => {
      richieste.push(mode);
      stato = dopoRichiesta;
      return stato;
    }),
    getDirectoryHandle: vi.fn(async () => {
      throw new Error("NotFoundError");
    }),
    getFileHandle: vi.fn(async () => {
      throw new Error("NotFoundError");
    }),
  } as unknown as FileSystemDirectoryHandle;
  return { handle, richieste };
}

let baseSimulata: FileSystemDirectoryHandle | null = null;
let extraSimulate: { id: string; nome: string; handle: FileSystemDirectoryHandle; dataAggiunta: string }[] = [];

// La cartella principale arriva da getCartellaArchivio, quelle aggiuntive da IndexedDB: simuliamo entrambe.
vi.mock("@/lib/api/cartella-locale", async (importOriginal) => {
  const reale = await importOriginal<typeof import("@/lib/api/cartella-locale")>();
  return { ...reale, getCartellaArchivio: vi.fn(async () => baseSimulata) };
});

function installaIndexedDbFinto() {
  const finto = {
    open() {
      const req: { result?: unknown; onsuccess?: () => void; onerror?: () => void; onupgradeneeded?: () => void } = {};
      const db = {
        objectStoreNames: { contains: () => true },
        transaction: () => ({
          objectStore: () => ({
            getAll() {
              const r: { result?: unknown; onsuccess?: () => void } = { result: extraSimulate };
              queueMicrotask(() => r.onsuccess?.());
              return r;
            },
          }),
        }),
      };
      req.result = db;
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  };
  vi.stubGlobal("indexedDB", finto);
}

import { leggiStatoCartelle, autorizzaCartelle } from "@/lib/api/stato-cartelle";

function imposta(...lista: [string, Permesso, Permesso?][]) {
  const richieste: Record<string, string[]> = {};
  const create = lista.map(([nome, ini, dopo]) => {
    const c = cartella(nome, ini, dopo);
    richieste[nome] = c.richieste;
    return { nome, handle: c.handle };
  });
  baseSimulata = create[0]?.handle ?? null;
  extraSimulate = create.slice(1).map((c, i) => ({
    id: `extra${i}`,
    nome: c.nome,
    handle: c.handle,
    dataAggiunta: new Date().toISOString(),
  }));
  return richieste;
}

beforeEach(() => {
  baseSimulata = null;
  extraSimulate = [];
  installaIndexedDbFinto();
});

describe("stato delle cartelle collegate", () => {
  it("nessuna cartella collegata", async () => {
    const s = await leggiStatoCartelle();
    expect(s.stato).toBe("nessuna");
    expect(s.autorizzate).toBe(0);
  });

  it("tutte autorizzate = ok", async () => {
    imposta(["Archivio", "granted"], ["Extra", "granted"]);
    const s = await leggiStatoCartelle();
    expect(s.stato).toBe("ok");
    expect(s.autorizzate).toBe(2);
  });

  it("anche una sola in attesa = da autorizzare, e la lettura NON chiede permessi", async () => {
    const richieste = imposta(["Archivio", "granted"], ["Extra", "prompt"]);
    const s = await leggiStatoCartelle();
    expect(s.stato).toBe("da_autorizzare");
    expect(s.cartelle.find((c) => c.nome === "Extra")?.autorizzata).toBe(false);
    expect(richieste["Extra"]).toEqual([]);
  });
});

describe("richiesta di autorizzazione", () => {
  it("chiede il permesso solo alle cartelle che non lo hanno, in sola lettura", async () => {
    const richieste = imposta(["Archivio", "granted"], ["Extra", "prompt"]);
    const s = await autorizzaCartelle("read");
    expect(s.stato).toBe("ok");
    expect(richieste["Archivio"]).toEqual([]);
    expect(richieste["Extra"]).toEqual(["read"]);
  });

  it("se il browser nega resta da autorizzare", async () => {
    imposta(["Archivio", "prompt", "denied"]);
    const s = await autorizzaCartelle("read");
    expect(s.stato).toBe("da_autorizzare");
    expect(s.autorizzate).toBe(0);
  });
});

describe("rinomina: motivo preciso dell'insuccesso", () => {
  it("nessuna cartella collegata", async () => {
    const { rinominaFileNelPercorso } = await import("@/lib/api/cartelle-multiple");
    const r = await rinominaFileNelPercorso("A/B/file.pdf", "nuovo.pdf");
    expect(r.success).toBe(false);
    expect(r.motivo).toBe("nessuna_cartella");
    expect(r.errore).toMatch(/Nessuna cartella collegata/);
  });

  it("permesso di scrittura negato", async () => {
    imposta(["Archivio", "prompt", "denied"]);
    const { rinominaFileNelPercorso } = await import("@/lib/api/cartelle-multiple");
    const r = await rinominaFileNelPercorso("A/B/file.pdf", "nuovo.pdf");
    expect(r.motivo).toBe("permesso");
    expect(r.cartelleSenzaPermesso).toEqual(["Archivio"]);
    expect(r.errore).toMatch(/Permesso di scrittura negato/);
  });

  it("file davvero assente nelle cartelle autorizzate", async () => {
    imposta(["Archivio", "granted"]);
    const { rinominaFileNelPercorso } = await import("@/lib/api/cartelle-multiple");
    const r = await rinominaFileNelPercorso("file.pdf", "nuovo.pdf");
    expect(r.motivo).toBe("non_trovato");
    expect(r.errore).toMatch(/file\.pdf/);
  });

  it("file assente ma una cartella senza permesso: non dice «non trovato», chiede di autorizzare", async () => {
    imposta(["Archivio", "granted"], ["Extra", "prompt", "denied"]);
    const { rinominaFileNelPercorso } = await import("@/lib/api/cartelle-multiple");
    const r = await rinominaFileNelPercorso("file.pdf", "nuovo.pdf");
    expect(r.motivo).toBe("permesso");
    expect(r.cartelleSenzaPermesso).toEqual(["Extra"]);
  });
});

describe("salvataggio copia locale: esito esplicito", () => {
  it("nessuna cartella", async () => {
    const { salvaInCartellaSceltaEsito } = await import("@/lib/api/cartelle-multiple");
    const r = await salvaInCartellaSceltaEsito(null, new File(["x"], "a.pdf"), "a.pdf");
    expect(r).toEqual({ esito: "nessuna_cartella" });
  });

  it("permesso negato (prima restituiva null in silenzio)", async () => {
    imposta(["Archivio", "prompt", "denied"]);
    const { salvaInCartellaSceltaEsito, salvaInCartellaScelta } = await import("@/lib/api/cartelle-multiple");
    const r = await salvaInCartellaSceltaEsito("Archivio", new File(["x"], "a.pdf"), "a.pdf");
    expect(r).toEqual({ esito: "permesso", cartelle: ["Archivio"] });
    imposta(["Archivio", "prompt", "denied"]);
    expect(await salvaInCartellaScelta("Archivio", new File(["x"], "a.pdf"), "a.pdf")).toBeNull();
  });
});

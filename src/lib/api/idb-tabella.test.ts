/*
 * File:          idb-tabella.test.ts
 * Percorso:      src/lib/api/idb-tabella.test.ts
 * Data creazione: 2026-11-22
 * Revisioni:
 *   - Rev 1 (2026-11-22): Database già esistente senza la tabella (caso reale: «cartelle» → «cartelle_collegate»): si riapre con la
 *     versione successiva e la tabella viene creata; database nuovo o già a posto: nessun aggiornamento inutile.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apriDbConTabella } from "./idb-tabella";

type Iniziale = { versione: number; tabelle: string[] } | null;

/** IndexedDB finto con versioni: l'evento di aggiornamento scatta solo se la versione richiesta è maggiore di quella esistente. */
function installaIndexedDbFinto(iniziale: Iniziale) {
  let versione = iniziale?.versione ?? 0;
  const tabelle = new Set(iniziale?.tabelle ?? []);
  const richieste: (number | undefined)[] = [];
  const chiusure: number[] = [];
  vi.stubGlobal("indexedDB", {
    open(_nome: string, richiesta?: number) {
      richieste.push(richiesta);
      const req: { result?: unknown; onsuccess?: () => void; onerror?: () => void; onupgradeneeded?: () => void; onblocked?: () => void } = {};
      queueMicrotask(() => {
        const target = richiesta ?? Math.max(versione, 1);
        const db = {
          version: target,
          objectStoreNames: { contains: (t: string) => tabelle.has(t) },
          createObjectStore: (t: string) => { tabelle.add(t); },
          close: () => { chiusure.push(target); },
          onversionchange: null as null | (() => void),
        };
        req.result = db;
        if (target > versione) {
          versione = target;
          req.onupgradeneeded?.();
        }
        req.onsuccess?.();
      });
      return req;
    },
  });
  return { richieste, chiusure, tabelle, versione: () => versione };
}

afterEach(() => vi.unstubAllGlobals());

describe("apriDbConTabella", () => {
  it("database creato con la vecchia tabella «cartelle»: crea «cartelle_collegate» con la versione successiva", async () => {
    const f = installaIndexedDbFinto({ versione: 1, tabelle: ["cartelle"] });
    const db = await apriDbConTabella("app_archivio_cartelle", "cartelle_collegate", { keyPath: "id" });
    expect(db.objectStoreNames.contains("cartelle_collegate")).toBe(true);
    expect(f.tabelle.has("cartelle")).toBe(true); // i vecchi dati non si toccano
    expect(f.versione()).toBe(2);
    expect(f.richieste).toEqual([undefined, 2]);
    expect(f.chiusure).toEqual([1]); // la prima connessione viene chiusa prima dell'aggiornamento
  });

  it("database già a posto: nessun aggiornamento di versione", async () => {
    const f = installaIndexedDbFinto({ versione: 1, tabelle: ["cartelle_collegate"] });
    await apriDbConTabella("app_archivio_cartelle", "cartelle_collegate");
    expect(f.versione()).toBe(1);
    expect(f.richieste).toEqual([undefined]);
  });

  it("database inesistente: viene creato con la tabella", async () => {
    const f = installaIndexedDbFinto(null);
    const db = await apriDbConTabella("nuovo", "impostazioni");
    expect(db.objectStoreNames.contains("impostazioni")).toBe(true);
    expect(f.versione()).toBe(1);
    expect(f.richieste).toEqual([undefined]);
  });

  it("aggiornamento bloccato da un'altra scheda: messaggio chiaro", async () => {
    vi.stubGlobal("indexedDB", {
      open(_n: string, richiesta?: number) {
        const req: { result?: unknown; onsuccess?: () => void; onblocked?: () => void } = {};
        queueMicrotask(() => {
          if (richiesta) req.onblocked?.();
          else {
            req.result = { version: 1, objectStoreNames: { contains: () => false }, close: () => undefined };
            req.onsuccess?.();
          }
        });
        return req;
      },
    });
    await expect(apriDbConTabella("x", "t")).rejects.toThrow(/Chiudi le altre schede/);
  });
});

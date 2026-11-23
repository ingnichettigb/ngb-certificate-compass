/*
 * File:      elimina-dipendente.test.ts
 * Percorso:  src/lib/api/elimina-dipendente.test.ts
 * Data creaz: 23/11/2026
 * Revisioni:
 *   rev 1 — 23/11/2026 08:55 — Eliminazione definitiva del lavoratore: nominativo tolto dalle voci dell'organigramma,
 *            ordine delle cancellazioni, nessuna chiamata allo storage, avviso se la lettura dell'organigramma fallisce (il lavoratore resta eliminato).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dati } = vi.hoisted(() => ({
  dati: {
    singoli: {} as Record<string, unknown>,
    errori: {} as Record<string, string>,
  },
}));

vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});

import { registro } from "@/test/registratore-supabase";
import { eliminaDipendente, togliNominativoDalleVoci } from "./dipendenti";
import type { VoceOrganigramma } from "./ditta";

const lavoratore = {
  id: "d1",
  codice_fiscale: "bnchna80a41f205x",
  cognome: "BIANCHI",
  nome: "MARIA CRISTINA",
};

const chiamate = () => registro.filter((r) => r[0] === "sb").map((r) => `${r[1]} ${r[2]} ${r[3]}`);
const scritture = () =>
  registro.filter((r) => r[0] === "sb" && /\.(delete|update)$/.test(String(r[1])));

beforeEach(() => {
  registro.length = 0;
  // Il client finto tiene gli oggetti ricevuti alla creazione: si svuotano sul posto, non si sostituiscono.
  for (const k of Object.keys(dati.singoli)) delete dati.singoli[k];
  for (const k of Object.keys(dati.errori)) delete dati.errori[k];
});

describe("togliNominativoDalleVoci", () => {
  const voci: VoceOrganigramma[] = [
    { titolo: "Custodia SDS", nomi: ["Bianchi  Maria Cristina", "ROSSI MARIO"] },
    { titolo: "DPI", nomi: ["maria cristina bianchi"] },
    {
      titolo: "Antincendio",
      nomi: ["BIANCHI MARIACRISTINA", "VERDI ELENA"],
      tipo: "ruolo",
      ruolo_id: "ru1",
    },
  ];

  it("toglie il nome nei due ordini, senza badare a maiuscole e spazi", () => {
    const { voci: nuove, rimossi } = togliNominativoDalleVoci(voci, "BIANCHI", "MARIA CRISTINA");
    expect(rimossi).toBe(2);
    expect(nuove[0]!.nomi).toEqual(["ROSSI MARIO"]);
    expect(nuove[1]!.nomi).toEqual([]);
  });

  it("non unisce né divide le parole: «MARIACRISTINA» è un altro nome", () => {
    const { voci: nuove } = togliNominativoDalleVoci(voci, "BIANCHI", "MARIA CRISTINA");
    expect(nuove[2]!.nomi).toEqual(["BIANCHI MARIACRISTINA", "VERDI ELENA"]);
  });

  it("senza corrispondenze lascia le voci identiche e conta zero", () => {
    const { voci: nuove, rimossi } = togliNominativoDalleVoci(voci, "NERI", "LUCA");
    expect(rimossi).toBe(0);
    expect(nuove).toEqual(voci);
    expect(nuove[0]).toBe(voci[0]);
  });

  it("mantiene titolo, tipo e ruolo_id delle voci modificate", () => {
    const { voci: nuove } = togliNominativoDalleVoci(
      [{ titolo: "Preposti", nomi: ["BIANCHI MARIA"], tipo: "nota", ruolo_id: "r9" }],
      "BIANCHI",
      "MARIA",
    );
    expect(nuove[0]).toEqual({ titolo: "Preposti", nomi: [], tipo: "nota", ruolo_id: "r9" });
  });

  it("ignora i nomi vuoti e un nome mancante", () => {
    const { rimossi } = togliNominativoDalleVoci(
      [{ titolo: "X", nomi: ["", "  "] }],
      "ROSSI",
      null,
    );
    expect(rimossi).toBe(0);
  });
});

describe("eliminaDipendente", () => {
  it("cancella prima l'anagrafica, poi la coda operatore, e salva le voci solo se cambiano", async () => {
    dati.singoli["ditta"] = {
      organigramma_voci: [{ titolo: "DPI", nomi: ["BIANCHI MARIA CRISTINA", "ROSSI MARIO"] }],
    };
    const { avvisi } = await eliminaDipendente(lavoratore);
    expect(avvisi).toEqual([]);
    const c = chiamate();
    expect(
      c.some((x) => x.startsWith("from.delete.eq dipendenti") && x.includes('"id","d1"')),
    ).toBe(true);
    expect(
      c.some(
        (x) => x.startsWith("from.delete.ilike coda_valutazioni") && x.includes("BNCHNA80A41F205X"),
      ),
    ).toBe(true);
    const iDip = c.findIndex((x) => x.startsWith("from.delete.eq dipendenti"));
    const iCoda = c.findIndex((x) => x.startsWith("from.delete.ilike coda_valutazioni"));
    expect(iDip).toBeLessThan(iCoda);
    expect(c.some((x) => x.startsWith("from.update.eq ditta"))).toBe(true);
    const upd = c.find((x) => x.startsWith("from.update ditta"));
    expect(upd).toBeDefined();
    expect(upd).toContain("ROSSI MARIO");
    expect(upd).not.toContain("BIANCHI");
  });

  it("non riscrive l'organigramma se il nome non c'è", async () => {
    dati.singoli["ditta"] = { organigramma_voci: [{ titolo: "DPI", nomi: ["ROSSI MARIO"] }] };
    await eliminaDipendente(lavoratore);
    expect(chiamate().some((x) => x.startsWith("from.update.eq ditta"))).toBe(false);
  });

  it("se l'organigramma non si legge, il lavoratore è comunque eliminato e arriva un avviso", async () => {
    dati.errori["ditta"] = "lettura non riuscita";
    const { avvisi } = await eliminaDipendente(lavoratore);
    expect(avvisi).toEqual(["nominativi dell'organigramma"]);
    expect(chiamate().some((x) => x.startsWith("from.delete.eq dipendenti"))).toBe(true);
  });

  it("non tocca mai lo storage: i file restano dove sono", async () => {
    dati.singoli["ditta"] = { organigramma_voci: [] };
    await eliminaDipendente(lavoratore);
    expect(chiamate().some((x) => /storage|remove/.test(x))).toBe(false);
    expect(
      scritture().every((r) => ["dipendenti", "coda_valutazioni", "ditta"].includes(String(r[2]))),
    ).toBe(true);
  });

  it("non cancella altro su tabelle che seguono per cascata (ruoli, attestati, documenti, integrazioni)", async () => {
    await eliminaDipendente(lavoratore);
    const tabelle = scritture().map((r) => String(r[2]));
    for (const t of [
      "dipendenti_ruoli",
      "attestati_caricati",
      "documenti_attestati",
      "integrazioni_dvr",
    ]) {
      expect(tabelle).not.toContain(t);
    }
  });
});

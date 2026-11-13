/*
 * File:      backup-copertura.test.ts
 * Percorso:  src/lib/api/backup-copertura.test.ts
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 — Guardia: il backup deve contenere TUTTE le tabelle create dalle migrazioni; il ripristino rimappa sedi, ruoli e lavoratori.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dati } = vi.hoisted(() => ({
  dati: {
    tabelle: {
      sedi: [{ id: "P-DB", is_principale: true }],
      ruoli_sicurezza: [{ id: "R-DB", nome: "Preposto" }],
      dipendenti: [{ id: "D-DB", codice_fiscale: "CF1" }],
    } as Record<string, unknown[]>,
  },
}));
vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});

import { registro } from "@/test/registratore-supabase";
import { TABELLE_BACKUP, VERSIONE_BACKUP, costruisciDump, importaDb } from "./backup";

const tabelleMigrazioni = () => {
  const dir = join(process.cwd(), "drizzle", "migrations");
  const nomi = new Set<string>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql"))) {
    for (const m of readFileSync(join(dir, f), "utf8").matchAll(/CREATE TABLE(?: IF NOT EXISTS)? public\.([a-z_]+)/gi)) nomi.add(m[1]!);
  }
  return [...nomi].sort();
};

beforeEach(() => {
  registro.length = 0;
});

describe("copertura del backup", () => {
  it("ogni tabella delle migrazioni è nel backup", () => {
    const nelBackup = TABELLE_BACKUP.map((t) => t.tabella) as string[];
    expect(tabelleMigrazioni().filter((t) => !nelBackup.includes(t))).toEqual([]);
  });

  it("il dump contiene una voce per ogni tabella e la versione corrente", async () => {
    const dump = await costruisciDump();
    expect(dump.versione).toBe(VERSIONE_BACKUP);
    for (const { tabella } of TABELLE_BACKUP) expect(dump, tabella).toHaveProperty(tabella);
    expect(registro.filter((r) => r[1] === "from").map((r) => r[2]).sort()).toEqual(TABELLE_BACKUP.map((t) => t.tabella).sort());
  });

  it("il ripristino aggancia gli incarichi a sede, ruolo e lavoratore già presenti nel database", async () => {
    const dump = {
      versione: 5,
      sedi: [
        { id: "P-FILE", nome: "Sede Centrale", is_principale: true },
        { id: "S2", nome: "Plesso B", is_principale: false },
      ],
      ruoli_sicurezza: [{ id: "R-FILE", nome: "Preposto", attivo: true }],
      dipendenti: [{ id: "D-FILE", codice_fiscale: "CF1", cognome: "ROSSI", sede_id: "P-FILE" }],
      dipendenti_ruoli: [
        { id: "x1", dipendente_id: "D-FILE", ruolo_id: "R-FILE", sede_id: "P-FILE" },
        { id: "x2", dipendente_id: "D-FILE", ruolo_id: "R-FILE", sede_id: "S2" },
      ],
    };
    // jsdom non ha File.text(): oggetto equivalente
    const file = { name: "030ArchAttestati_2611132000_archivio-attestati.json", text: async () => JSON.stringify(dump) } as unknown as File;
    const res = await importaDb(file);
    expect(res.incarichiCount).toBe(2);
    const inc = registro.find((r) => r[1] === "from.upsert" && r[2] === "dipendenti_ruoli");
    const righe = JSON.parse(String(inc![3]))[0] as Record<string, string>[];
    expect(righe).toEqual([
      { dipendente_id: "D-DB", ruolo_id: "R-DB", sede_id: "P-DB" },
      { dipendente_id: "D-DB", ruolo_id: "R-DB", sede_id: "S2" },
    ]);
    // il lavoratore esistente mantiene il suo id e passa alla sede principale del database
    const dip = JSON.parse(String(registro.find((r) => r[1] === "from.upsert" && r[2] === "dipendenti")![3]))[0][0];
    expect(dip).toMatchObject({ codice_fiscale: "CF1", sede_id: "P-DB" });
    expect(dip).not.toHaveProperty("id");
  });
});

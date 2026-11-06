/*
 * File:      registra-nuovi.ateco.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/registra-nuovi.ateco.test.ts
 * Creato:    06/11/2026
 * Verifica che l'importazione assegni ai nuovi lavoratori l'ATECO primario della ditta.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dati } = vi.hoisted(() => ({
  dati: {
    tabelle: { dipendenti: [] as Record<string, unknown>[] },
    singoli: { ditta: { id: true, ragione_sociale: "Scuola", codici_ateco: [{ codice: "85.31.20", descrizione: "Istruzione" }] } },
  },
}));
vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});

import { registro } from "@/test/registratore-supabase";
import { analizzaSoloNuovi, type RigaGrezza } from "./analisi-elenco";
import { registraNuovi } from "./registra-nuovi";

const riga: RigaGrezza = {
  nominativo: "Dova Gianluca", cf: "DVOGLC80A01F205X", funzione: "docenti", cognome: "Dova", nome: "Gianluca",
  luogoNascita: "Milano", dataNascita: "1980-01-01",
};

beforeEach(() => { registro.length = 0; });

describe("importazione: ATECO della ditta", () => {
  it("il nuovo lavoratore nasce con il codice ATECO primario della ditta", async () => {
    const esito = await registraNuovi({ righe: analizzaSoloNuovi([riga], [], "ATA"), dataInizio: "2026-09-01", ruoli: [] });
    expect(esito.errori).toEqual([]);
    const scritture = registro.filter((r) => String(r[1]).startsWith("from.upsert") && r[2] === "dipendenti");
    expect(String(scritture[0]?.[3])).toContain('"codice_ateco":"85.31.20"');
  });
});

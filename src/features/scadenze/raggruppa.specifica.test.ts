/*
 * File: raggruppa.specifica.test.ts
 * Percorso: src/features/scadenze/raggruppa.specifica.test.ts
 * Data creazione: 2026-11-27
 * Revisioni:
 * - Rev 1 (2026-11-27 07:51): Regressione Affatigato: specifica e integrazione non sono aggiornamenti.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Attestato } from "@/lib/api";
import { aAttestatoCiclo, costruisciRighe } from "./raggruppa";

function attestato(id: string, codice: string, livello: string, data: string, ore: number): Attestato {
  return {
    id, dipendente_id: "affatigato", tipo_corso_id: codice,
    data_corso: data, ore_dichiarate: ore, stato_validazione: "Approvato",
    tipi_corso: {
      id: codice, codice, nome_corso: codice, macro_categoria: "Sicurezza Lavoratori",
      livello_specifico: livello, durata_validita_anni: 5,
      ore_aggiornamento: 6, ore_minime_legge: ore,
    },
  } as unknown as Attestato;
}

const specifica = attestato("spe", "SIC-SPE-08", "Specifico", "2026-11-06", 8);
const integrazione = attestato("spi", "SIC-SPI-04", "Base", "2026-11-06", 4);
const oggi = new Date("2026-11-27T12:00:00Z");

describe("formazione iniziale e rinnovo", () => {
  it("Affatigato: specifica e integrazione del 06/11/2026 scadono il 06/11/2031", () => {
    for (const gruppo of [[integrazione, specifica], [specifica, integrazione]]) {
      const righe = costruisciRighe(gruppo, oggi);
      expect(righe).toHaveLength(1);
      expect(righe[0]?.ciclo.scadenzaEffettiva).toBe("2031-11-06");
      expect(righe[0]?.ciclo.stato).toBe("valido");
      expect(righe[0]?.ciclo.eventi.some((e) => e.tipo === "completo")).toBe(false);
    }
  });

  it("la specifica rifatta nel 2026 avvia un nuovo quinquennio, non rinnova due cicli", () => {
    const vecchia = attestato("old", "SIC-SPE-08", "Specifico", "2021-04-13", 8);
    const righe = costruisciRighe([vecchia, integrazione, specifica], oggi);
    expect(righe[0]?.ciclo.dataAncora).toBe("2026-11-06");
    expect(righe[0]?.ciclo.scadenzaEffettiva).toBe("2031-11-06");
  });

  it("un vero SIC-AGG-06 mantiene il rinnovo quinquennale", () => {
    const agg = attestato("agg", "SIC-AGG-06", "Aggiornamento", "2030-11-06", 6);
    const righe = costruisciRighe([specifica, agg], new Date("2030-11-27T12:00:00Z"));
    expect(righe[0]?.ciclo.scadenzaEffettiva).toBe("2036-11-06");
  });

  it("un corso senza classificazione di aggiornamento non accumula ore di rinnovo", () => {
    const altro = attestato("other", "SIC-ALT-08", "Altro", "2026-11-10", 8);
    const righe = costruisciRighe([specifica, altro], oggi);
    expect(righe[0]?.ciclo.scadenzaEffettiva).toBe("2031-11-06");
    expect(righe[0]?.ciclo.oreAccumulate).toBe(0);
  });

  it("Specifico comprende la formazione iniziale Preposto e non il suo aggiornamento", () => {
    expect(aAttestatoCiclo(attestato("prp", "PRP-BAS-12", "Specifico", "2026-11-06", 12)).eBase).toBe(true);
    expect(aAttestatoCiclo(attestato("agg", "PRP-AGG-06", "Specifico", "2026-11-06", 6)).eBase).toBe(false);
  });
});
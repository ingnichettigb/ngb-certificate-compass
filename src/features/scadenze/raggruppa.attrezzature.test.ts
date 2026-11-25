/*
 * File:          raggruppa.attrezzature.test.ts
 * Percorso:      src/features/scadenze/raggruppa.attrezzature.test.ts
 * Data creazione: 2026-11-22
 * Ogni attrezzatura (corsi LAV-…) ha un ciclo di scadenza proprio: il corso base e il suo aggiornamento stanno insieme, ma non si mescolano alla
 * formazione del Lavoratore né alle altre attrezzature, pur avendo la stessa macro-categoria «Sicurezza lavoratori».
 * Revisioni:
 *   - Rev 1 (2026-11-22): Prima stesura.
 *   - Rev 2 (2026-11-23): Corso base ripetuto: riparte da capo solo se il corso base ha livello «Base» (migrazione 0019: i corsi LAV-… avevano «Specifico»).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Attestato } from "@/lib/api";
import { chiaveGruppo, costruisciRighe } from "./raggruppa";

const OGGI = new Date("2026-11-22T10:00:00");

function att(id: string, codice: string, data: string, livello: string, extra: Record<string, unknown> = {}, ore: number | null = null): Attestato {
  return {
    id, dipendente_id: "d1", codice_fiscale: "CF1", tipo_corso_id: `t-${codice}`, data_corso: data, data_scadenza_calcolata: null,
    ore_dichiarate: ore, stato_validazione: "Approvato", created_at: data,
    tipi_corso: {
      id: `t-${codice}`, nome_corso: "Corso", codice, macro_categoria: "Sicurezza Lavoratori", livello_specifico: livello,
      durata_validita_anni: 5, ore_aggiornamento: 4, ore_minime_legge: 4, ...extra,
    },
  } as unknown as Attestato;
}

const carripontBase = att("cp1", "LAV-CAR-CP-II-8311", "2019-05-02", "Base", {}, 12);
const carripontAgg = att("cp2", "LAV-CAR-CP-II-8311-AGG", "2024-03-01", "Aggiornamento", {}, 4);
const pleBase = att("ple1", "LAV-PLE-II-831", "2025-02-10", "Base", {}, 10);
const specifica = att("spe", "SIC-SPE-08", "2024-01-10", "Base", {}, 8);
const aggLavoratore = att("agg", "SIC-AGG-06", "2026-06-01", "Aggiornamento", { ore_aggiornamento: 6, ore_minime_legge: 6 }, 6);

describe("chiaveGruppo: le attrezzature", () => {
  it("base e aggiornamento della stessa attrezzatura stanno insieme", () => {
    expect(chiaveGruppo(carripontBase)).toBe(chiaveGruppo(carripontAgg));
    expect(chiaveGruppo(carripontBase)).toBe("d1|attrezzatura:OPER-CAR-CP-II-8311");
  });

  it("attrezzature diverse, e la formazione del Lavoratore, sono gruppi diversi", () => {
    const chiavi = new Set([carripontBase, pleBase, specifica].map(chiaveGruppo));
    expect(chiavi.size).toBe(3);
  });

  it("la formazione del Lavoratore resta nel gruppo della macro-categoria, come prima", () => {
    expect(chiaveGruppo(specifica)).toBe("d1|macro:Sicurezza Lavoratori");
    expect(chiaveGruppo(aggLavoratore)).toBe("d1|macro:Sicurezza Lavoratori");
  });

  it("il codice in minuscolo non cambia il gruppo", () => {
    expect(chiaveGruppo(att("x", "lav-car-cp-ii-8311-agg", "2024-03-01", "Aggiornamento"))).toBe(chiaveGruppo(carripontBase));
  });
});

describe("costruisciRighe: scadenze separate", () => {
  const scadenzaDi = (righe: ReturnType<typeof costruisciRighe>, chiave: string) => righe.find((r) => r.chiave === chiave)!.ciclo.scadenzaEffettiva;
  const K_CP = "d1|attrezzatura:OPER-CAR-CP-II-8311";

  it("l'aggiornamento della formazione del Lavoratore non prolunga la scadenza del carriponte", () => {
    const solo = costruisciRighe([carripontBase], OGGI);
    const conAltro = costruisciRighe([carripontBase, specifica, aggLavoratore, pleBase], OGGI);
    expect(conAltro).toHaveLength(3);
    expect(scadenzaDi(conAltro, K_CP)).toBe(scadenzaDi(solo, K_CP));
    expect(scadenzaDi(solo, K_CP)! < "2026-11-22").toBe(true);
  });

  it("un'altra attrezzatura non prolunga il carriponte", () => {
    const solo = costruisciRighe([carripontBase], OGGI);
    const conPle = costruisciRighe([carripontBase, pleBase], OGGI);
    expect(scadenzaDi(conPle, K_CP)).toBe(scadenzaDi(solo, K_CP));
  });

  it("l'aggiornamento del carriponte prolunga il carriponte", () => {
    const senza = costruisciRighe([carripontBase], OGGI);
    const con = costruisciRighe([carripontBase, carripontAgg], OGGI);
    expect(con).toHaveLength(1);
    expect(scadenzaDi(con, K_CP)! > scadenzaDi(senza, K_CP)!).toBe(true);
    expect(scadenzaDi(con, K_CP)! > "2026-11-22").toBe(true);
  });

  it("un corso base ripetuto riparte da capo: la validità è quella del corso più recente (richiede livello «Base»)", () => {
    const vecchio = att("b1", "LAV-CAR-CP-II-8311", "2018-03-01", "Base", {}, 12);
    const rifatto = att("b2", "LAV-CAR-CP-II-8311", "2025-02-10", "Base", {}, 12);
    const righe = costruisciRighe([vecchio, rifatto], OGGI);
    expect(righe).toHaveLength(1);
    expect(scadenzaDi(righe, K_CP)).toBe("2030-02-10");
  });
});

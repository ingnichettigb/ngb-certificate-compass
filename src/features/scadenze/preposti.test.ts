/*
 * File:      preposti.test.ts
 * Percorso:  src/features/scadenze/preposti.test.ts
 * Data creazione: 2026-11-06
 * Test della scadenza dei Preposti applicata a scheda dipendente (incarichi) e stampe:
 * devono mostrare la stessa data e lo stesso stato della pagina Scadenze (regime transitorio 19/05/2026).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Attestato } from "@/lib/api";
import { riepilogoIncarichi } from "@/lib/api/incarichi";
import { calcolaRighe, FILTRI_INIZIALI } from "@/features/stampe/dati-stampa";
import { applicaScadenzaPreposti } from "./preposti";

const OGGI = new Date("2026-11-06T10:00:00");

/** Attestato Preposto con il vecchio campo a 5 anni (2027-03-10), che il motore deve scavalcare. */
function prep(id: string, data: string, livello: string, extra: Partial<Attestato> = {}): Attestato {
  return {
    id,
    dipendente_id: "d1",
    codice_fiscale: "CF1",
    tipo_corso_id: "t-prep",
    data_corso: data,
    data_scadenza_calcolata: "2027-03-10",
    ore_dichiarate: 6,
    stato_validazione: "Approvato",
    created_at: data,
    dipendenti: { id: "d1", cognome: "ROSSI", nome: "MARIO", codice_fiscale: "CF1", reparto: "ATA", stato_lavoratore: "in_forza" },
    tipi_corso: {
      id: "t-prep",
      nome_corso: "Preposto",
      codice: "PRP-BAS-12",
      macro_categoria: "Preposto",
      livello_specifico: livello,
      durata_validita_anni: 5,
      ore_aggiornamento: 6,
      ore_minime_legge: 8,
    },
    ...extra,
  } as unknown as Attestato;
}

const altro = (): Attestato =>
  ({
    ...prep("x", "2024-01-01", "Base"),
    id: "x",
    tipo_corso_id: "t-aff",
    data_scadenza_calcolata: "2029-01-01",
    tipi_corso: { id: "t-aff", nome_corso: "Antincendio", codice: "VFF-FOR1-4", macro_categoria: "Antincendio", livello_specifico: "Base", durata_validita_anni: 5 },
  }) as unknown as Attestato;

describe("applicaScadenzaPreposti", () => {
  it("Preposto con Base 2022 e nessun aggiornamento: scadenza 19/05/2026 per tutti gli attestati del gruppo", () => {
    const r = applicaScadenzaPreposti([prep("a", "2022-03-10", "Specifico")], OGGI);
    expect(r[0]!.data_scadenza_calcolata).toBe("2026-05-19");
  });

  it("gli attestati non Preposto restano identici (stesso oggetto)", () => {
    const a = altro();
    expect(applicaScadenzaPreposti([a], OGGI)[0]).toBe(a);
  });

  it("senza Preposti restituisce lo stesso array", () => {
    const lista = [altro()];
    expect(applicaScadenzaPreposti(lista, OGGI)).toBe(lista);
  });

  it("aggiornato entro il taglio: 19/05/2028", () => {
    const r = applicaScadenzaPreposti(
      [prep("a", "2022-03-10", "Specifico"), prep("b", "2026-02-01", "Aggiornamento")],
      OGGI,
    );
    expect(r.map((x) => x.data_scadenza_calcolata)).toEqual(["2028-05-19", "2028-05-19"]);
  });
});

describe("scheda dipendente (incarichi)", () => {
  it("Preposto scaduto per il transitorio: non risulta «Valido» anche se il vecchio campo a 5 anni lo era", () => {
    // Il test usa la data reale di oggi: il 19/05/2026 è nel passato.
    const riep = riepilogoIncarichi([prep("a", "2022-03-10", "Specifico")]);
    const p = riep.find((r) => r.incarico.key === "preposto")!;
    expect(p.ricoperto).toBe(true);
    expect(p.peggiore).toBe("scaduto");
  });
});

describe("stampe", () => {
  it("riga Preposto: scadenza 19/05/2026 e stato scaduto", () => {
    const [riga] = calcolaRighe([prep("a", "2022-03-10", "Specifico")], FILTRI_INIZIALI, OGGI);
    expect(riga?.scadenza).toBe("2026-05-19");
    expect(riga?.stato).toBe("scaduto");
  });

  it("gli altri corsi non cambiano", () => {
    const [riga] = calcolaRighe([altro()], FILTRI_INIZIALI, OGGI);
    expect(riga?.scadenza).toBe("2029-01-01");
  });
});

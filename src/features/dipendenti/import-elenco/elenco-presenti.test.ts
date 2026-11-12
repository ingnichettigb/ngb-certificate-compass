/*
 * File:      elenco-presenti.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/elenco-presenti.test.ts
 * Creato:    05/11/2026
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import { htmlStampaPresenti, righePresenti, testoCsvPresenti } from "./elenco-presenti";
import type { EsitoImportazione } from "./registra-nuovi";

const esito: EsitoImportazione = {
  inseriti: [],
  presentiInForza: [{ id: "1", cognome: "ROSSI", nome: "MARIO", cf: "RSSMRA80A01H501U" }],
  presentiCessati: [{ id: "2", cognome: "D'ANGELO <X>", nome: "ANNA", cf: "DNGNNA80A41H501X" }],
  riabilitatiSubito: [],
  nonValidi: [], doppioni: [], errori: [], ruoliCreati: [], ruoliAggiuntiAPresenti: 0,
};

describe("elenco dei già presenti", () => {
  it("mette prima gli in forza poi i cessati", () => {
    expect(righePresenti(esito).map((r) => r.stato)).toEqual(["In forza", "Cessato"]);
  });
  it("CSV con intestazione, separatore «;» e virgolette", () => {
    const righe = testoCsvPresenti(esito).split("\r\n");
    expect(righe[0]).toBe('"Cognome";"Nome";"Codice fiscale";"Stato"');
    expect(righe[1]).toBe('"ROSSI";"MARIO";"RSSMRA80A01H501U";"In forza"');
  });
  it("la pagina di stampa neutralizza i caratteri speciali e riporta i totali", () => {
    const html = htmlStampaPresenti(esito, new Date(2026, 10, 5));
    expect(html).toContain("D'ANGELO &lt;X&gt;");
    expect(html).toContain("1 in forza, 1 cessati");
    expect(html).toContain("05/11/2026");
  });
});

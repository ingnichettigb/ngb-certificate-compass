/*
 * File:      esporta-raccordo.test.ts
 * Percorso:  src/features/tabelle-raccordo/esporta-raccordo.test.ts
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 10:50 — Test dei dati esportati: N, ordine delle colonne, «Applica», valori sì/no e numerici, nomi file di tutte le tabelle.
 *   rev 2 — 15/11/2026 — Allineato alle definizioni attuali: tabella 01 con le colonne Codice/Descrizione/Categoria/Assegnazioni/Attivo e
 *            tabella 05 con id «soglie-antincendio» (colonne «Da presenze», «A presenze (vuoto = oltre)»).
 *   rev 3 — 21/11/2026 — Allineato alle definizioni dopo la bonifica dei ruoli: tabella 01 con Codice/Ruolo/Tipo/Richiede/Per tutti/Attivo e
 *            tabella 03 con id «antincendio» (colonne «Da», «A», «Livello»); le colonne «riferimento» si esportano con il codice.
 */
import { describe, expect, it } from "vitest";
import { TABELLE_RACCORDO, type Riga } from "./definizioni";
import { tabellaRaccordoDaEsportare, valoreDaEsportare } from "./esporta-raccordo";

const def = (id: string) => TABELLE_RACCORDO.find((t) => t.id === id)!;

describe("dati esportati dalle tabelle di raccordo", () => {
  it("valoreDaEsportare rispetta il tipo della colonna", () => {
    expect(valoreDaEsportare({ chiave: "a", etichetta: "A", tipo: "bool" }, null)).toBe(false);
    expect(valoreDaEsportare({ chiave: "a", etichetta: "A", tipo: "bool" }, true)).toBe(true);
    expect(valoreDaEsportare({ chiave: "a", etichetta: "A", tipo: "numero" }, "15")).toBe(15);
    expect(valoreDaEsportare({ chiave: "a", etichetta: "A", tipo: "numero" }, null)).toBeNull();
    expect(valoreDaEsportare({ chiave: "a", etichetta: "A" }, "")).toBeNull();
    expect(valoreDaEsportare({ chiave: "a", etichetta: "A" }, "01")).toBe("01");
  });

  it("ruoli: N progressivo, colonne nell'ordine mostrato e «Applica» in fondo", () => {
    const d = def("ruoli");
    const righe: Riga[] = [
      {
        id: "1",
        codice: "OPER_PLE_II_831",
        nome: "OPERATORE PLE",
        tipo: "ruolo",
        richiede: "LAVORATORE",
        obbligatorio_tutti: false,
        attivo: true,
        applica: false,
      },
      {
        id: "2",
        codice: null,
        nome: "ASPP",
        tipo: "ruolo",
        richiede: null,
        obbligatorio_tutti: false,
        attivo: false,
        applica: true,
      },
    ];
    const t = tabellaRaccordoDaEsportare(d, d.colonne, righe);
    expect(t.intestazioni).toEqual([
      "N",
      "Codice",
      "Ruolo",
      "Tipo",
      "Richiede",
      "Per tutti",
      "Attivo",
      "Applica",
    ]);
    // «Richiede» è una colonna «riferimento»: si esporta il codice, che è la chiave stabile
    expect(t.righe).toEqual([
      [1, "OPER_PLE_II_831", "OPERATORE PLE", "ruolo", "LAVORATORE", false, true, false],
      [2, null, "ASPP", "ruolo", null, false, false, true],
    ]);
  });

  it("regole ruolo → corso: si esportano i codici di ruolo e corsi", () => {
    const d = def("regole-corso");
    const t = tabellaRaccordoDaEsportare(d, d.colonne, [
      {
        id: "1",
        ruolo_codice: "ADD_DAE",
        parametro: "nessuno",
        valore: "—",
        corso_base: "BLS-BAS-05",
        corso_aggiornamento: "BLS-AGG-05",
        applica: false,
      },
    ]);
    expect(t.intestazioni).toEqual(["N", "Ruolo", "Parametro", "Valore", "Corso base", "Aggiornamento", "Applica"]);
    expect(t.righe[0]).toEqual([1, "ADD_DAE", "nessuno", "—", "BLS-BAS-05", "BLS-AGG-05", false]);
  });

  it("usa l'ordine delle colonne scelto dall'utente", () => {
    const d = def("ateco");
    const invertite = [...d.colonne].reverse();
    const t = tabellaRaccordoDaEsportare(d, invertite, [
      { id: "1", codice: "85", descrizione: "Istruzione", applica: true },
    ]);
    expect(t.intestazioni[0]).toBe("N");
    expect(t.intestazioni.at(-1)).toBe("Applica");
    expect(t.intestazioni.slice(1, -1)).toEqual(invertite.map((c) => c.etichetta));
  });

  it("le soglie numeriche restano numeri e i codici con lo zero restano testo", () => {
    const d = def("antincendio");
    const t = tabellaRaccordoDaEsportare(d, d.colonne, [
      { id: "1", da: 10, a: null, esito: "Livello 2", attiva: true, applica: false },
    ]);
    const i = (e: string) => t.intestazioni.indexOf(e);
    expect(t.righe[0]![i("Da")]).toBe(10);
    expect(t.righe[0]![i("A")]).toBeNull();
    expect(t.righe[0]![i("Applica")]).toBe(false);
    const ateco = def("ateco");
    const t2 = tabellaRaccordoDaEsportare(ateco, ateco.colonne, [
      { id: "1", codice: "01", applica: false },
    ]);
    expect(t2.righe[0]![t2.intestazioni.indexOf("Codice ATECO")]).toBe("01");
  });

  it("ogni tabella con dati nel database ha foglio e nome file validi", () => {
    for (const d of TABELLE_RACCORDO.filter((x) => x.tabella)) {
      const t = tabellaRaccordoDaEsportare(d, d.colonne, []);
      expect(t.nomeBase, d.id).toMatch(/^raccordo-\d\d-[a-z0-9-]+$/);
      expect(t.foglio!.length, d.id).toBeLessThanOrEqual(40);
      expect(t.intestazioni.length, d.id).toBe(d.colonne.length + 2);
    }
  });
});

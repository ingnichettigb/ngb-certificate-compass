/*
 * File:      esporta-raccordo.test.ts
 * Percorso:  src/features/tabelle-raccordo/esporta-raccordo.test.ts
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 10:50 — Test dei dati esportati: N, ordine delle colonne, «Applica», valori sì/no e numerici, nomi file di tutte le tabelle.
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
        codice: "PREPOSTO",
        nome: "Preposto",
        tipo: "ruolo",
        richiede: null,
        obbligatorio_tutti: false,
        attivo: true,
        applica: false,
      },
      {
        id: "2",
        codice: null,
        nome: "ASPP",
        tipo: "incarico",
        richiede: "PREPOSTO",
        obbligatorio_tutti: true,
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
    expect(t.righe).toEqual([
      [1, "PREPOSTO", "Preposto", "ruolo", null, false, true, false],
      [2, null, "ASPP", "incarico", "PREPOSTO", true, false, true],
    ]);
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

/*
 * Test della logica della tabella tipi di corso aggiunta da Lovable:
 * lettura dei valori scritti nelle celle numeriche e ordinamento per colonna.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { TipoCorso } from "@/lib/api";
import { interpretaValore } from "./components/CellaNumerica";
import { ordina } from "./TabellaTipiCorso";

describe("interpretaValore (celle numeriche)", () => {
  it("vuoto o con soli spazi: nessun valore", () => {
    expect(interpretaValore("")).toBeNull();
    expect(interpretaValore("   ")).toBeNull();
  });
  it("parole che significano «nessun valore»", () => {
    for (const t of ["NA", "n/a", "N/A", "n.a.", "Non scade", " illimitata "]) expect(interpretaValore(t), t).toBeNull();
  });
  it("numeri, anche con la virgola decimale e gli spazi", () => {
    expect(interpretaValore("12")).toBe(12);
    expect(interpretaValore(" 8,5 ")).toBe(8.5);
    expect(interpretaValore("6.5")).toBe(6.5);
  });
  it("testo non numerico: nessun valore", () => {
    expect(interpretaValore("abc")).toBeNull();
    expect(interpretaValore("12 ore")).toBeNull();
  });
  it("lo zero è un valore, tranne dove vale «nessun valore» (zeroComeVuoto)", () => {
    expect(interpretaValore("0")).toBe(0);
    expect(interpretaValore("0", true)).toBeNull();
    expect(interpretaValore("5", true)).toBe(5);
  });
});

describe("ordina (colonne della tabella)", () => {
  const c = (id: string, extra: Partial<TipoCorso>) => ({ id, codice: null, nome_corso: id, ore_minime_legge: null, visibile_lavoratore: true, ...extra }) as TipoCorso;
  const dati = [c("b", { codice: "A10", ore_minime_legge: 8 }), c("a", { codice: "A2", ore_minime_legge: 4 }), c("v", { codice: null }), c("z", { codice: "B1", ore_minime_legge: 12, visibile_lavoratore: false })];
  const ids = (chiave: Parameters<typeof ordina>[1]["chiave"], dir: "asc" | "desc") => ordina(dati, { chiave, dir }).map((x) => x.id);
  it("testo con numeri dentro: ordine «naturale» (A2 prima di A10)", () => {
    expect(ids("codice", "asc")).toEqual(["a", "b", "z", "v"]);
  });
  it("i valori vuoti restano sempre in fondo, anche in ordine decrescente", () => {
    expect(ids("codice", "desc")).toEqual(["z", "b", "a", "v"]);
  });
  it("colonne numeriche", () => {
    expect(ids("ore_minime_legge", "asc")).toEqual(["a", "b", "z", "v"]);
    expect(ids("ore_minime_legge", "desc")).toEqual(["z", "b", "a", "v"]);
  });
  it("colonna sì/no: i «No» vengono prima dei «Sì»", () => {
    const r = ids("visibile_lavoratore", "asc");
    expect(r[0]).toBe("z");
  });
  it("non modifica l'elenco originale", () => {
    const copia = [...dati];
    ordina(dati, { chiave: "codice", dir: "desc" });
    expect(dati).toEqual(copia);
  });
});

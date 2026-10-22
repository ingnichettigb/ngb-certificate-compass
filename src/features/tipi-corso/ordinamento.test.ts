/*
 * Test delle funzioni pure di riordinamento della tabella tipi di corso.
 */
import { describe, expect, it } from "vitest";
import { scambiaPosizioni, spostaId } from "./ordinamento";

const corsi = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

describe("scambiaPosizioni", () => {
  it("sposta giù: scambia con il successivo e indica quale corso è stato mosso", () => {
    expect(scambiaPosizioni(corsi, 1, 1)).toEqual({ ids: ["a", "c", "b", "d"], idSpostato: "b" });
  });
  it("sposta su: scambia con il precedente", () => {
    expect(scambiaPosizioni(corsi, 2, -1)).toEqual({ ids: ["a", "c", "b", "d"], idSpostato: "c" });
  });
  it("ai bordi non fa nulla", () => {
    expect(scambiaPosizioni(corsi, 0, -1)).toBeNull();
    expect(scambiaPosizioni(corsi, 3, 1)).toBeNull();
  });
  it("indice inesistente o elenco vuoto: null", () => {
    expect(scambiaPosizioni(corsi, 9, -1)).toBeNull();
    expect(scambiaPosizioni([], 0, 1)).toBeNull();
  });
  it("non modifica l'elenco originale", () => {
    const originale = [{ id: "x" }, { id: "y" }];
    scambiaPosizioni(originale, 0, 1);
    expect(originale.map((c) => c.id)).toEqual(["x", "y"]);
  });
});

describe("spostaId", () => {
  const ids = ["a", "b", "c", "d"];
  it("porta un corso dall'alto verso il basso", () => {
    expect(spostaId(ids, "a", "c")).toEqual(["b", "c", "a", "d"]);
  });
  it("porta un corso dal basso verso l'alto", () => {
    expect(spostaId(ids, "d", "a")).toEqual(["d", "a", "b", "c"]);
  });
  it("verso la posizione adiacente equivale a uno scambio", () => {
    expect(spostaId(ids, "b", "c")).toEqual(["a", "c", "b", "d"]);
  });
  it("id sconosciuti: null", () => {
    expect(spostaId(ids, "z", "a")).toBeNull();
    expect(spostaId(ids, "a", "z")).toBeNull();
  });
  it("non modifica l'elenco originale", () => {
    const originale = ["a", "b", "c"];
    spostaId(originale, "a", "c");
    expect(originale).toEqual(["a", "b", "c"]);
  });
});

/*
 * File:      filtra-classi.test.ts
 * Percorso:  src/features/impostazioni/insegnamento/filtra-classi.test.ts
 */
import { describe, expect, it } from "vitest";
import { filtraClassi } from "./filtra-classi";

const classi = [
  { codice: "A-26", denominazione: "Matematica" },
  { codice: "A-27", denominazione: "Matematica e fisica" },
  { codice: "B-12", denominazione: null },
];

describe("filtraClassi", () => {
  it("senza testo restituisce tutto", () => {
    expect(filtraClassi(classi, "  ")).toHaveLength(3);
  });

  it("cerca nel codice e nella denominazione, senza badare alle maiuscole", () => {
    expect(filtraClassi(classi, "a-2")).toHaveLength(2);
    expect(filtraClassi(classi, "FISICA").map((c) => c.codice)).toEqual(["A-27"]);
  });

  it("non si rompe con la denominazione mancante", () => {
    expect(filtraClassi(classi, "b-12").map((c) => c.codice)).toEqual(["B-12"]);
  });
});

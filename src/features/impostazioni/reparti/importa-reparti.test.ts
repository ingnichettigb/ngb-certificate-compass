/*
 * File:      importa-reparti.test.ts
 * Percorso:  src/features/impostazioni/reparti/importa-reparti.test.ts
 */
import { describe, expect, it } from "vitest";
import { repartiDaImportare } from "./importa-reparti";

describe("repartiDaImportare", () => {
  it("propone solo i reparti non ancora in elenco, senza doppioni", () => {
    const r = repartiDaImportare(
      [
        { reparto: "Docenti" },
        { reparto: "docenti " },
        { reparto: "ATA" },
        { reparto: "Segreteria" },
      ],
      [{ nome: "ata" }],
    );
    expect(r).toEqual(["Docenti", "Segreteria"]);
  });

  it("salta vuoti, date importate male e testi troppo lunghi", () => {
    const r = repartiDaImportare(
      [
        { reparto: "" },
        { reparto: null },
        { reparto: "12/05/2020" },
        { reparto: "x".repeat(41) },
        {},
      ],
      [],
    );
    expect(r).toEqual([]);
  });

  it("ordina in italiano e si ferma a 30", () => {
    const molti = Array.from({ length: 40 }, (_, i) => ({
      reparto: `Reparto ${String(i).padStart(2, "a")}`,
    }));
    expect(repartiDaImportare(molti, [])).toHaveLength(30);
  });
});

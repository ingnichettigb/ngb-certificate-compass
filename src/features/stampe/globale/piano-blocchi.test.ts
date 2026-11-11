/*
 * File:      piano-blocchi.test.ts
 * Percorso:  src/features/stampe/globale/piano-blocchi.test.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Test di ordine alfabetico, divisione in blocchi, intervalli di lettere e nome file.
 */
import { describe, expect, it } from "vitest";
import {
  BYTE_A3,
  BYTE_COPERTINA,
  BYTE_FINALE,
  dividiInBlocchi,
  iniziale,
  nomeDittaPerFile,
  nomeFileBlocco,
  ordinaLavoratori,
  timestampAAMMGGhh,
  type VoceStima,
} from "./piano-blocchi";

const v = (id: string, cognome: string, byte: number, nome = "Mario"): VoceStima => ({
  id,
  cognome,
  nome,
  byte,
});

describe("ordine e iniziali", () => {
  it("ordina per cognome e nome ignorando maiuscole e accenti", () => {
    const o = ordinaLavoratori([
      v("1", "Rossi", 1, "Luca"),
      v("2", "Èbano", 1),
      v("3", "bianchi", 1),
      v("4", "Rossi", 1, "Anna"),
    ]);
    expect(o.map((x) => x.id)).toEqual(["3", "2", "4", "1"]);
  });
  it("iniziale senza accento, # se non c'è una lettera", () => {
    expect(iniziale("Èbano")).toBe("E");
    expect(iniziale("  d'Angelo")).toBe("D");
    expect(iniziale("123")).toBe("#");
  });
});

describe("divisione in blocchi", () => {
  const fisso1 = BYTE_COPERTINA + BYTE_FINALE + BYTE_A3;
  const fisso = BYTE_COPERTINA + BYTE_FINALE;

  it("un solo blocco se tutto sta nel limite", () => {
    const b = dividiInBlocchi([v("1", "Bianchi", 1000), v("2", "Verdi", 1000)], 10_000_000);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ numero: 1, da: "B", a: "V", oltreLimite: false });
  });

  it("chiude il blocco prima di superare il limite e non spezza mai un lavoratore", () => {
    const limite = fisso1 + 2500;
    const b = dividiInBlocchi(
      [
        v("1", "Alpha", 1000),
        v("2", "Bravo", 1000),
        v("3", "Charlie", 1000),
        v("4", "Delta", 1000),
      ],
      limite,
    );
    expect(b.map((x) => x.voci.map((y) => y.id))).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(b.map((x) => [x.da, x.a])).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
    expect(b[1]?.byte).toBe(fisso + 2000); // il secondo blocco non ha la pagina A3
  });

  it("l'A3 pesa solo nel primo blocco", () => {
    const b = dividiInBlocchi([v("1", "A", 100)], 1e9);
    expect(b[0]?.byte).toBe(fisso1 + 100);
  });

  it("un lavoratore più grande del limite ha un blocco tutto suo, segnalato", () => {
    const b = dividiInBlocchi([v("1", "Alpha", 50_000_000), v("2", "Bravo", 10)], 1_000_000);
    expect(b).toHaveLength(2);
    expect(b[0]?.oltreLimite).toBe(true);
    expect(b[1]?.oltreLimite).toBe(false);
  });

  it("nessun lavoratore, nessun blocco", () => {
    expect(dividiInBlocchi([], 1000)).toEqual([]);
  });
});

describe("nome del file", () => {
  it("timestamp AAMMGGhh", () => {
    expect(timestampAAMMGGhh(new Date(2026, 10, 11, 14, 5))).toBe("26111114");
  });
  it("ragione sociale ripulita", () => {
    expect(nomeDittaPerFile('Rossi & Figli S.r.l. / "Sede"')).toBe(
      'ROSSI & FIGLI S.R.L. "SEDE"'.replace(/"/g, "").replace(/\s+/g, " ").trim(),
    );
    expect(nomeDittaPerFile("")).toBe("DITTA");
  });
  it("formato richiesto: NN-AAMMGGhh-STAMPA GLOBALE-DITTA-DA X a Y.pdf", () => {
    expect(
      nomeFileBlocco({
        numero: 1,
        data: new Date(2026, 10, 11, 14),
        ditta: "Rossi Srl",
        da: "A",
        a: "D",
      }),
    ).toBe("01-26111114-STAMPA GLOBALE-ROSSI SRL-DA A a D.pdf");
    expect(
      nomeFileBlocco({ numero: 12, data: new Date(2026, 10, 11, 9), ditta: "X", da: "S", a: "Z" }),
    ).toBe("12-26111109-STAMPA GLOBALE-X-DA S a Z.pdf");
  });
});

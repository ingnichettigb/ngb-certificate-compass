import { describe, expect, it } from "vitest";
import {
  altezzaMassimaMm,
  colonneInterneDi,
  impaginaColonne,
  SOGLIA_DUE_COLONNE,
  type ElementoLayout,
} from "./impagina-organigramma-a3";

// Quantità prese dall'organigramma reale della scuola (PDF di esempio)
const REALE: ElementoLayout[] = [
  { id: "preposti", righe: 46, separatori: 1 },
  { id: "primo-soccorso", righe: 33, separatori: 1 },
  { id: "defibrillatore", righe: 25, separatori: 1 },
  { id: "evacuazione", righe: 3 },
  { id: "antincendio", righe: 30, separatori: 1 },
  { id: "privacy", righe: 0 },
  { id: "voce-0", righe: 4 },
  { id: "voce-1", righe: 2 },
  { id: "voce-2", righe: 0 },
];

describe("impaginazione dell'organigramma A3", () => {
  it("divide in due colonne interne solo gli elenchi lunghi", () => {
    expect(colonneInterneDi(SOGLIA_DUE_COLONNE)).toBe(1);
    expect(colonneInterneDi(SOGLIA_DUE_COLONNE + 1)).toBe(2);
    expect(colonneInterneDi(0)).toBe(1);
  });
  it("colloca ogni riquadro una sola volta, senza perderne", () => {
    const ids = impaginaColonne(REALE).flat().map((p) => p.id);
    expect(ids.sort()).toEqual(REALE.map((e) => e.id).sort());
  });
  it("tiene l'ordine logico: i primi tre riquadri aprono le tre colonne", () => {
    const col = impaginaColonne(REALE);
    expect(col.map((c) => c[0]!.id)).toEqual(["preposti", "primo-soccorso", "defibrillatore"]);
  });
  it("con i numeri reali sta nell'area utile A3 (circa 200 mm sotto l'intestazione)", () => {
    expect(altezzaMassimaMm(REALE)).toBeLessThan(200);
  });
  it("le colonne sono equilibrate (differenza contenuta)", () => {
    const per = new Map(REALE.map((e) => [e.id, e]));
    const alt = impaginaColonne(REALE).map((c) => c.reduce((s, p) => s + (per.get(p.id)!.righe + 4), 0));
    expect(Math.max(...alt) - Math.min(...alt)).toBeLessThan(45);
  });
  it("funziona senza elementi e con una sola colonna", () => {
    expect(impaginaColonne([], 3)).toEqual([[], [], []]);
    expect(impaginaColonne(REALE, 1)).toHaveLength(1);
  });
});

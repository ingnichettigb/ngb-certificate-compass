import { describe, expect, it } from "vitest";
import {
  altezzaMassimaMm,
  altezzaStimataMm,
  colonneInterneDi,
  impaginaColonne,
  impaginaPerFunzione,
  SOGLIA_DUE_COLONNE,
  type ElementoFunzionale,
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

describe("disposizione funzionale (sinistra primo soccorso, centro evacuazione, destra antincendio)", () => {
  const TITOLI: Record<string, string> = {
    preposti: "Preposti",
    "primo-soccorso": "Addetti primo soccorso",
    defibrillatore: "Addetti defibrillatore",
    evacuazione: "Addetti all'evacuazione",
    antincendio: "Addetti antincendio",
    privacy: "Incaricati privacy",
    "voce-0": "Evacuazione – figure di classe",
    "voce-1": "Preposti di laboratorio",
    "voce-2": "Addetti registro antincendio",
  };
  const FUNZ: ElementoFunzionale[] = REALE.map((e) => ({ ...e, titolo: TITOLI[e.id]! }));
  const ids = (c: { id: string }[]) => c.map((p) => p.id);

  it("a sinistra primo soccorso e sotto defibrillatore", () => {
    expect(ids(impaginaPerFunzione(FUNZ)[0]!)).toEqual(["primo-soccorso", "defibrillatore"]);
  });
  it("al centro evacuazione (poi figure di classe, preposti, preposti di laboratorio)", () => {
    expect(ids(impaginaPerFunzione(FUNZ)[1]!)).toEqual(["evacuazione", "voce-0", "preposti", "voce-1"]);
  });
  it("a destra antincendio (poi registro antincendio e privacy)", () => {
    expect(ids(impaginaPerFunzione(FUNZ)[2]!)).toEqual(["antincendio", "voce-2", "privacy"]);
  });
  it("non dipende dall'ordine con cui arrivano i riquadri", () => {
    expect(impaginaPerFunzione([...FUNZ].reverse())).toEqual(impaginaPerFunzione(FUNZ));
  });
  it("una voce libera nuova, senza parole chiave note, va in fondo alla colonna più bassa", () => {
    const nuova: ElementoFunzionale = { id: "voce-3", titolo: "Custodia SDS", righe: 2 };
    const col = impaginaPerFunzione([...FUNZ, nuova]);
    expect(col.flat().map((p) => p.id)).toContain("voce-3");
    const dove = col.findIndex((c) => ids(c).includes("voce-3"));
    expect(ids(col[dove]!).at(-1)).toBe("voce-3");
    expect(dove).toBe(2); // la destra è la colonna più bassa con i numeri reali
  });
  it("ogni riquadro compare una sola volta e con i numeri reali sta nell'area utile", () => {
    const col = impaginaPerFunzione(FUNZ);
    expect(col.flat().map((p) => p.id).sort()).toEqual(FUNZ.map((e) => e.id).sort());
    const per = new Map(FUNZ.map((e) => [e.id, e]));
    const alt = Math.max(...col.map((c) => c.reduce((t, p) => t + altezzaStimataMm(per.get(p.id)!), 0)));
    expect(alt).toBeLessThan(200);
  });
  it("con una sola colonna mette tutto in quella", () => {
    expect(impaginaPerFunzione(FUNZ, 1)).toHaveLength(1);
    expect(impaginaPerFunzione(FUNZ, 1)[0]).toHaveLength(FUNZ.length);
  });
});

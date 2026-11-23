/*
 * File:          cartella-locale.scansione.test.ts
 * Percorso:      src/lib/api/cartella-locale.scansione.test.ts
 * Data creazione: 2026-11-22
 * Revisioni:
 *   - Rev 1 (2026-11-22): Ricerca nei file: cartelle lette in parallelo, avanzamento, annullamento, limite di tempo anche con una lettura
 *     che non risponde, cartelle non leggibili saltate, compatibilità di cercaFileRicorsivo.
 */
import { describe, expect, it } from "vitest";

import { cercaFileRicorsivo, scansionaCartella, type AvanzamentoRicerca } from "./cartella-locale";

type Voce = { kind: "file" | "directory"; name: string } & Record<string, unknown>;

const attesa = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function file(nome: string, size = 10): Voce {
  return { kind: "file", name: nome, getFile: async () => ({ size, lastModified: 1_700_000_000_000, type: "application/pdf" }) };
}

function cartella(nome: string, figli: Voce[], opz: { ritardoMs?: number; errore?: boolean; contatore?: { attivi: number; max: number } } = {}): Voce {
  return {
    kind: "directory",
    name: nome,
    values: async function* () {
      const c = opz.contatore;
      if (c) {
        c.attivi += 1;
        c.max = Math.max(c.max, c.attivi);
      }
      try {
        if (opz.ritardoMs) await attesa(opz.ritardoMs);
        if (opz.errore) throw new Error("accesso negato");
        for (const f of figli) yield f;
      } finally {
        if (c) c.attivi -= 1;
      }
    },
  };
}

const radice = (figli: Voce[]) => cartella("radice", figli) as unknown as FileSystemDirectoryHandle;

describe("scansionaCartella", () => {
  it("trova i file con tutte le parole nel nome, in tutte le sottocartelle, e conta cartelle e file", async () => {
    const r = radice([
      file("Marcotti Alessandra preposto.pdf"),
      file("altro.pdf"),
      cartella("2024", [file("MARCOTTI_antincendio.PDF"), file("Rossi.pdf"), cartella("sotto", [file("marcotti-privacy.jpg"), file("note.txt")])]),
      cartella(".nascosta", [file("marcotti.pdf")]),
    ]);
    const esito = await scansionaCartella(r, "marcotti");
    expect(esito.risultati.map((x) => x.percorsoRelativo).sort()).toEqual([
      "2024/MARCOTTI_antincendio.PDF",
      "2024/sotto/marcotti-privacy.jpg",
      "Marcotti Alessandra preposto.pdf",
    ]);
    expect(esito.interrotta).toBeNull();
    expect(esito.avanzamento).toEqual({ cartelle: 3, file: 6, trovati: 3 }); // la cartella nascosta «.nascosta» non si legge
  });

  it("legge più cartelle contemporaneamente (ma non più della concorrenza indicata)", async () => {
    const contatore = { attivi: 0, max: 0 };
    const sotto = Array.from({ length: 12 }, (_, i) => cartella(`c${i}`, [file(`m${i}.pdf`)], { ritardoMs: 20, contatore }));
    const esito = await scansionaCartella(radice(sotto), "", { concorrenza: 4 });
    expect(esito.risultati).toHaveLength(12);
    expect(contatore.max).toBeGreaterThan(1);
    expect(contatore.max).toBeLessThanOrEqual(4);
  });

  it("si ferma ai risultati massimi", async () => {
    const r = radice(Array.from({ length: 30 }, (_, i) => file(`corso${i}.pdf`)));
    const esito = await scansionaCartella(r, "corso", { maxRisultati: 5 });
    expect(esito.risultati).toHaveLength(5);
    expect(esito.interrotta).toBeNull();
  });

  it("rispetta la profondità massima", async () => {
    const r = radice([cartella("a", [cartella("b", [file("x.pdf")])])]);
    expect((await scansionaCartella(r, "x", { maxProfondita: 1 })).risultati).toHaveLength(0);
    expect((await scansionaCartella(r, "x", { maxProfondita: 2 })).risultati).toHaveLength(1);
  });

  it("una cartella non leggibile viene saltata, la ricerca prosegue sulle altre", async () => {
    const r = radice([cartella("bloccata", [file("m.pdf")], { errore: true }), cartella("ok", [file("m2.pdf")])]);
    const esito = await scansionaCartella(r, "m");
    expect(esito.risultati.map((x) => x.nome)).toEqual(["m2.pdf"]);
  });

  it("riferisce l'avanzamento durante la ricerca", async () => {
    const visti: AvanzamentoRicerca[] = [];
    const sotto = Array.from({ length: 5 }, (_, i) => cartella(`c${i}`, [file(`m${i}.pdf`)], { ritardoMs: 40 }));
    await scansionaCartella(radice(sotto), "", { onAvanzamento: (a) => visti.push(a) });
    expect(visti.length).toBeGreaterThanOrEqual(2);
    expect(visti[0]).toEqual({ cartelle: 0, file: 0, trovati: 0 });
    expect(visti.at(-1)).toEqual({ cartelle: 6, file: 5, trovati: 5 });
  });

  it("annullamento: restituisce subito quanto trovato, anche se una cartella non risponde", async () => {
    const bloccata = cartella("lenta", [file("m.pdf")], { ritardoMs: 60_000 });
    const r = radice([file("subito.pdf"), bloccata]);
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 30);
    const t0 = Date.now();
    const esito = await scansionaCartella(r, "", { segnale: ctrl.signal });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(esito.interrotta).toBe("annullata");
    expect(esito.risultati.map((x) => x.nome)).toEqual(["subito.pdf"]);
  });

  it("limite di tempo: dopo il limite si ferma e lo segnala, anche con una lettura che non risponde", async () => {
    const r = radice([file("uno.pdf"), cartella("lenta", [file("m.pdf")], { ritardoMs: 60_000 })]);
    const t0 = Date.now();
    const esito = await scansionaCartella(r, "", { limiteMs: 80 });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(esito.interrotta).toBe("tempo");
    expect(esito.risultati.map((x) => x.nome)).toEqual(["uno.pdf"]);
  });

  it("già annullata prima di partire: nessuna lettura", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const esito = await scansionaCartella(radice([file("a.pdf")]), "", { segnale: ctrl.signal });
    expect(esito.interrotta).toBe("annullata");
    expect(esito.risultati).toHaveLength(0);
  });
});

describe("cercaFileRicorsivo (compatibilità)", () => {
  it("aggiunge i file all'elenco passato e lo restituisce, come prima", async () => {
    const elenco: Awaited<ReturnType<typeof cercaFileRicorsivo>> = [];
    const r = radice([file("a.pdf"), cartella("s", [file("b.pdf")])]);
    const out = await cercaFileRicorsivo(r, "", "", elenco, 0, 6, 150);
    expect(out).toBe(elenco);
    expect(elenco.map((x) => x.percorsoRelativo).sort()).toEqual(["a.pdf", "s/b.pdf"]);
  });

  it("con l'elenco già pieno non legge nulla", async () => {
    const pieno = Array.from({ length: 60 }, (_, i) => ({ nome: `${i}` })) as never[];
    const out = await cercaFileRicorsivo(radice([file("a.pdf")]), "", "", pieno);
    expect(out).toHaveLength(60);
  });
});

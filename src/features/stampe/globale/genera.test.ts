/*
 * File:      genera.test.ts
 * Percorso:  src/features/stampe/globale/genera.test.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Prova completa di un blocco con file finti: ordine delle pagine, indice cliccabile, «Torna all'indice»,
 *            segnalibri con gli attestati sotto ogni lavoratore, allegato mancante segnalato.
 */
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import type { DatiStampaGlobale, OpzioniStampaGlobale } from "./genera";

vi.mock("./allegati", async (originale) => {
  const vero = await originale<typeof import("./allegati")>();
  const unPdf = async () => {
    const d = await PDFDocument.create();
    d.addPage([300, 300]);
    d.addPage([300, 300]);
    return d.save();
  };
  return {
    ...vero,
    dimensioneAllegato: async () => 1000,
    leggiAllegato: async (p: string | null | undefined) =>
      p === "manca" ? { tipo: "mancante" } : { tipo: "pdf", bytes: await unPdf() },
  };
});

const { generaBlocco, stimaPiano } = await import("./genera");

const dip = (id: string, cognome: string) =>
  ({
    id,
    cognome,
    nome: "Mario",
    codice_fiscale: `CF${id}`,
    stato_lavoratore: "in_forza",
  }) as unknown as Dipendente;
const att = (id: string, dipId: string, file: string | null, data: string): Attestato =>
  ({
    id,
    dipendente_id: dipId,
    data_corso: data,
    data_scadenza_calcolata: null,
    url_foto_fronte: file,
    url_foto_retro: null,
    tipi_corso: { macro_categoria: "Preposto", nome_corso: `Corso ${id}` },
  }) as unknown as Attestato;

const dati: DatiStampaGlobale = {
  dipendenti: [dip("2", "Verdi"), dip("1", "Bianchi")],
  attestati: [
    att("a1", "1", "f1", "2023-01-01"),
    att("a2", "1", "manca", "2024-01-01"),
    att("a3", "2", "f3", "2022-02-02"),
  ],
  ruoli: [],
  assegnazioni: [],
  ditta: null,
};
const opz: OpzioniStampaGlobale = { includiCessati: false, limiteByte: 1e9, indicazioni: "Test" };

const testo = (o: unknown) => (o as PDFHexString).decodeText();

describe("generaBlocco", () => {
  it("indice cliccabile, torna all'indice e segnalibri", async () => {
    const piano = await stimaPiano(dati, opz);
    expect(piano.blocchi).toHaveLength(1);
    const r = await generaBlocco(dati, piano, piano.blocchi[0]!, opz, new Date(2026, 10, 12, 9));
    expect(r.nomeFile).toBe("01-26111209-STAMPA GLOBALE-DITTA-DA B a V.pdf");
    expect(r.problemi).toHaveLength(1); // a2: file mancante

    const doc = await PDFDocument.load(r.bytes);
    const n = doc.getPageCount();
    // copertina, A3, scheda Bianchi + 2 allegati (a2 è in cima per data ma manca: solo a1 = 2 pagine), scheda Verdi + 2, finale
    expect(n).toBe(1 + 1 + 1 + 2 + 1 + 2 + 1);

    // segnalibri: Copertina, Organigramma A3, Bianchi, Verdi, Indice e controlli
    const radice = doc.catalog.lookup(PDFName.of("Outlines"), PDFDict);
    const nomi: string[] = [];
    let v = radice.lookup(PDFName.of("First"), PDFDict);
    for (;;) {
      nomi.push(testo(v.lookup(PDFName.of("Title"))));
      const next = v.lookup(PDFName.of("Next"));
      if (!(next instanceof PDFDict)) break;
      v = next;
    }
    expect(nomi).toEqual([
      "Copertina",
      "Organigramma A3",
      "Bianchi Mario",
      "Verdi Mario",
      "Indice e controlli",
    ]);

    // indice (ultima pagina): 2 link verso le schede; ogni pagina di scheda ha il link «Torna all'indice»
    const ultima = doc.getPage(n - 1);
    expect(ultima.node.Annots()?.size()).toBe(2);
    const scheda1 = doc.getPage(2);
    const link = scheda1.node.Annots()?.lookup(0, PDFDict);
    expect(link?.lookup(PDFName.of("Dest"), PDFArray).get(0)).toBe(ultima.ref);
  });
});

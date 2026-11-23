/*
 * File:      pagine-fisse.test.ts
 * Percorso:  src/features/stampe/globale/pagine-fisse.test.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Prova di disegno di copertina, scheda, pagina finale e piè di pagina: il PDF si crea, ha le pagine attese e
 *            regge testi lunghi e caratteri fuori dal set standard.
 *   rev 2 — 23/11/2026 — Copertina della «Stampa selezione»: pochi nomi stanno sulla copertina, tanti nomi continuano su una pagina in più.
 */
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import { raggruppaPerFunzione } from "./ordine-attestati";
import {
  applicaPiedeDiPagina,
  caricaCaratteri,
  disegnaCopertina,
  disegnaPaginaFinale,
  disegnaScheda,
} from "./pagine-fisse";

const dip = {
  id: "d1",
  codice_fiscale: "RSSMRA80A01F205X",
  cognome: "Rossi",
  nome: "Maria Łucja",
  reparto: "Docente",
  sottoreparto: null,
  classe_concorso: "A-26",
  materia: "Matematica",
  luogo_nascita: "Milano",
  data_nascita: "1980-01-01",
  data_assunzione: "2015-09-01",
  stato_lavoratore: "in_forza",
} as unknown as Dipendente;

const att = (
  id: string,
  macro: string,
  nome: string,
  data: string,
  scad: string | null,
): Attestato =>
  ({
    id,
    data_corso: data,
    data_scadenza_calcolata: scad,
    tipi_corso: { macro_categoria: macro, nome_corso: nome },
  }) as unknown as Attestato;

describe("pagine fisse della stampa globale", () => {
  it("disegna copertina, scheda, pagina finale e piè di pagina", async () => {
    const doc = await PDFDocument.create();
    const c = await caricaCaratteri(doc);
    await disegnaCopertina(doc, c, {
      ditta: "Istituto Superiore Esempio “Leonardo” S.r.l.",
      logo: null,
      numero: 1,
      totale: 3,
      intervallo: "DA A a D",
      lavoratori: 42,
      dataStampa: new Date(2026, 10, 11, 14, 5),
      indicazioni: "Fascicolo di tutti i lavoratori.\nSeconda riga di indicazioni.",
      riferimenti: "Via Roma 1 20100 Milano",
    });
    const gruppi = raggruppaPerFunzione([
      att("1", "Sicurezza Lavoratori", "Formazione generale lavoratori", "2022-03-01", null),
      att(
        "2",
        "Sicurezza Lavoratori",
        "Aggiornamento lavoratori con un nome molto lungo che deve essere tagliato",
        "2024-05-01",
        "2029-05-01",
      ),
      att("3", "Preposto", "Preposto", "2020-01-01", "2020-12-31"),
    ]);
    const pagine = await disegnaScheda(doc, c, {
      dip,
      funzioni: ["Preposto", "Primo soccorso"],
      gruppi,
      esitoPerAttestato: new Map([
        ["1", "allegato (2 pag.)"],
        ["2", "file mancante"],
      ]),
    });
    expect(pagine).toBe(1);
    disegnaPaginaFinale(
      doc,
      c,
      [{ nome: "Rossi Maria", pagina: 2 }],
      [{ lavoratore: "Rossi Maria", corso: "Aggiornamento", motivo: "file mancante" }],
    );
    applicaPiedeDiPagina(doc, c.n, 1, 3);
    expect(doc.getPageCount()).toBe(3);
    const bytes = await doc.save();
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe("copertina della Stampa selezione", () => {
  const base = {
    ditta: "Istituto Esempio",
    logo: null,
    numero: 1,
    totale: 1,
    intervallo: "DA B a V",
    dataStampa: new Date(2026, 10, 23, 9, 0),
    indicazioni: "Fascicolo dei lavoratori scelti.\nSeconda riga.",
    titolo: "STAMPA SELEZIONE",
  };
  const nomi = (n: number) =>
    Array.from({ length: n }, (_, i) => `Cognome${String(i).padStart(2, "0")} Nome${i}`);

  it("pochi nomi: tutto su una sola pagina", async () => {
    const doc = await PDFDocument.create();
    const c = await caricaCaratteri(doc);
    await disegnaCopertina(doc, c, { ...base, lavoratori: 3, elencoNomi: nomi(3) });
    expect(doc.getPageCount()).toBe(1);
  });

  it("tanti nomi: la copertina continua su una o più pagine in più", async () => {
    const doc = await PDFDocument.create();
    const c = await caricaCaratteri(doc);
    await disegnaCopertina(doc, c, { ...base, lavoratori: 60, elencoNomi: nomi(60) });
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
    expect(doc.getPageCount()).toBeLessThanOrEqual(3);
    const bytes = await doc.save();
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(doc.getPageCount());
  });

  it("senza elenco nomi la copertina della globale resta di una pagina", async () => {
    const doc = await PDFDocument.create();
    const c = await caricaCaratteri(doc);
    const { titolo: _t, ...senza } = base;
    await disegnaCopertina(doc, c, { ...senza, lavoratori: 42 });
    expect(doc.getPageCount()).toBe(1);
  });
});

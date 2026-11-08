/*
 * File:      esporta-pdf.test.ts
 * Percorso:  src/features/stampe/esporta-pdf.test.ts
 * Data creaz: 08/11/2026
 * Verifica il PDF generato: sezioni, testo, impaginazione e file valido.
 */
import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

// Il download non serve ai test (e esporta-file carica la libreria Excel, qui inutile).
vi.mock("./esporta-file", () => ({ scarica: vi.fn(), nomeFileEsportazione: vi.fn(() => "file.pdf") }));
import { creaPdf, pesiColonne, righeLegenda, sezioniPerPdf, spezzaTesto, testoPdf } from "./esporta-pdf";
import type { RigaStampa } from "./stampa-tipi";

const riga = (extra: Partial<RigaStampa> = {}): RigaStampa => ({
  id: "1", dipendenteId: "1", cognome: "Rossi", nome: "Mario", cf: "RSSMRA80A01F205X", reparto: "Docente", sottoreparto: "", materia: "", mansione: "",
  ruoli: "", assunzione: null, luogoNascita: "Milano", dataNascita: "1980-01-01", formazione: {}, mancanti: [], fineContratto: null, cessazione: null,
  corso: "", codice: "", gruppo: "", gruppoTitolo: "", ore: null, numero: "", dataCorso: "", scadenza: null, stato: "senza_scadenza",
  giorniAllaScadenza: null, ...extra,
});

describe("testo del PDF", () => {
  it("tiene accenti e trattini, sostituisce i caratteri non supportati", () => {
    expect(testoPdf("Perù – città  ")).toBe("Perù – città");
    expect(testoPdf("ok ✓")).toBe("ok ?");
  });

  it("va a capo sugli spazi e spezza le parole più larghe della colonna", () => {
    const misura = (s: string) => s.length * 5;
    expect(spezzaTesto("uno due tre", 50, misura)).toEqual(["uno due", "tre"]);
    const lunga = spezzaTesto("AAAAAAAAAAAAAAAA", 40, misura);
    expect(lunga.length).toBeGreaterThan(1);
    expect(lunga.every((r) => misura(r) <= 40)).toBe(true);
    expect(spezzaTesto("", 40, misura)).toEqual([""]);
  });

  it("le larghezze scelte diventano pesi; le altre si stimano dal contenuto", () => {
    const sezioni = [{ righe: [riga()], nuovaPagina: false }];
    const [cf, rep] = pesiColonne(["cf", "reparto"], sezioni, { cf: 200 });
    expect(cf).toBe(200);
    expect(rep).toBeGreaterThan(40);
  });

  it("la legenda compare solo per le colonne a cui serve", () => {
    expect(righeLegenda(["lavoratore", "cf"])).toEqual([]);
    expect(righeLegenda(["corsoBase"]).length).toBe(1);
    expect(righeLegenda(["preposto"]).length).toBe(2); // come l'anteprima: corsi + ruoli di sicurezza
    expect(righeLegenda(["corsoBase", "preposto", "mancano"]).length).toBe(3);
  });
});

describe("sezioni del PDF", () => {
  const righe = [
    riga({ id: "1", dipendenteId: "1", cognome: "Bianchi", reparto: "Docente", ruoliElenco: ["Preposto"] }),
    riga({ id: "2", dipendenteId: "2", cognome: "Rossi", reparto: "ATA", ruoliElenco: ["Addetto antincendio"] }),
  ];

  it("per reparto: una sezione per reparto, ognuna su pagina nuova tranne la prima", () => {
    const s = sezioniPerPdf({ modello: "lavoratori" }, righe, null, [], "reparto");
    expect(s.map((x) => x.titolo)).toEqual(["Reparto: ATA – 1 lavoratori", "Reparto: Docente – 1 lavoratori"]);
    expect(s.map((x) => x.nuovaPagina)).toEqual([false, true]);
  });

  it("con un gruppo scelto resta solo quel gruppo", () => {
    const s = sezioniPerPdf({ modello: "lavoratori" }, righe, null, [], "funzione", "Antincendio");
    expect(s).toHaveLength(1);
    expect(s[0]!.righe.map((r) => r.cognome)).toEqual(["Rossi"]);
  });

  it("scadenze: dal più urgente se l'utente non ha scelto un ordine", () => {
    const s = sezioniPerPdf({ modello: "scadenze" }, [riga({ id: "a", scadenza: "2027-05-01" }), riga({ id: "b", scadenza: "2026-01-01" })], null);
    expect(s[0]!.righe.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("file PDF", () => {
  it("è un PDF valido, con più pagine quando le righe sono tante, e un salto pagina per ogni sezione", async () => {
    const tante = Array.from({ length: 120 }, (_, i) => riga({ id: String(i), dipendenteId: String(i), cognome: `Cognome${i}`, reparto: i < 60 ? "Docente" : "ATA" }));
    const byte = await creaPdf({
      titolo: "Anagrafica per settori",
      sottotitolo: "Lavoratori in servizio · 120 lavoratori",
      ditta: undefined,
      orizzontale: true,
      colonne: ["lavoratore", "cf", "luogoNascita", "dataNascita", "reparto"],
      sezioni: sezioniPerPdf({ modello: "lavoratori" }, tante, null, [], "reparto"),
      totale: "120 lavoratori",
      legenda: [],
      dataStampa: new Date(2026, 10, 8, 10, 30),
    });
    expect(new TextDecoder().decode(byte.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(byte);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4); // 2 reparti × almeno 2 pagine
    expect(doc.getTitle()).toBe("Anagrafica per settori");
  });

  it("senza righe produce comunque una pagina con l'intestazione", async () => {
    const byte = await creaPdf({ titolo: "Vuoto", ditta: undefined, orizzontale: false, colonne: ["lavoratore"], sezioni: [] });
    expect((await PDFDocument.load(byte)).getPageCount()).toBe(1);
  });
});

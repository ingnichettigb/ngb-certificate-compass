/*
 * File:      stampa-organigramma.test.ts
 * Percorso:  src/features/stampe/stampa-organigramma.test.ts
 * Data creaz: 09/11/2026
 * Verifica l'Organigramma squadre di sicurezza (regole di Corso base / Aggiornamento, righe per squadra, filtri Docenti/ATA e squadra)
 * e i colori delle celle (anteprima e PDF).
 */
import { describe, expect, it, vi } from "vitest";
import { inflateSync } from "node:zlib";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

vi.mock("./esporta-file", () => ({ scarica: vi.fn(), nomeFileEsportazione: vi.fn(() => "file.pdf") }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Attestato, Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { cella, FILTRI_INIZIALI } from "./dati-stampa";
import { calcolaRigheOrganigramma } from "./stampa-organigramma";
import { celleSquadra, esitoPerScadenza } from "./stampa-squadre";
import { righeCella } from "./stampa-stile";
import { elencoGruppi, gruppiLavoratori } from "./stampa-gruppi";
import { contaPubblico, filtraPerPubblico } from "./stampa-pubblico";
import { creaPdf, righeLegenda } from "./esporta-pdf";
import { testoTotale } from "./stampa-testo";

const OGGI = "2026-11-09";
const OGGI_DATA = new Date("2026-11-09T10:00:00");

type Corso = { codice: string; livello: "Base" | "Aggiornamento"; macro: string; anni?: number };
const ANT_B: Corso = { codice: "VFF-FOR1-4", livello: "Base", macro: "Antincendio", anni: 5 };
const ANT_A: Corso = { codice: "VFF-FOR1A2", livello: "Aggiornamento", macro: "Antincendio", anni: 5 };
const PSO_B: Corso = { codice: "PSO-BCB-12", livello: "Base", macro: "Primo Soccorso", anni: 3 };

function att(dip: string, c: Corso, data: string): Attestato {
  return {
    id: `${dip}-${c.codice}-${data}`, dipendente_id: dip, codice_fiscale: "", tipo_corso_id: c.codice, data_corso: data,
    data_scadenza_calcolata: null, ore_dichiarate: 4, stato_validazione: "Approvato", numero_attestato: null, created_at: data,
    tipi_corso: { id: c.codice, nome_corso: c.codice, codice: c.codice, macro_categoria: c.macro, livello_specifico: c.livello, durata_validita_anni: c.anni ?? null },
  } as unknown as Attestato;
}
const cellaDi = (attestati: Attestato[]) => celleSquadra(attestati, OGGI);

describe("regole delle celle Corso base / Aggiornamento", () => {
  it("corso base recente e nessun aggiornamento: solo la data; aggiornamento «Non necessario»", () => {
    const { base, aggiornamento } = cellaDi([att("a", ANT_B, "2024-03-10")]);
    expect(base).toEqual({ data: "2024-03-10", etichetta: "valido" });
    expect(aggiornamento).toEqual({ data: null, etichetta: "non_necessario" });
  });

  it("corso base in prossimità della scadenza, senza aggiornamento: «In scadenza» e aggiornamento «Da formare»", () => {
    // scade il 10/05/2026: oggi si è ancora nel 2026 (tolleranza anno solare)
    const { base, aggiornamento } = cellaDi([att("a", ANT_B, "2021-05-10")]);
    expect(base.etichetta).toBe("in_scadenza");
    expect(aggiornamento.etichetta).toBe("da_formare");
  });

  it("corso base scaduto (anno solare di scadenza finito), senza aggiornamento: «Scaduto» e «Da formare»", () => {
    const { base, aggiornamento } = cellaDi([att("a", ANT_B, "2020-03-01")]);
    expect(base).toEqual({ data: "2020-03-01", etichetta: "scaduto" });
    expect(aggiornamento.etichetta).toBe("da_formare");
  });

  it("nessun attestato: «Da formare» in entrambe", () => {
    const { base, aggiornamento } = cellaDi([]);
    expect(base).toEqual({ data: null, etichetta: "da_formare" });
    expect(aggiornamento.etichetta).toBe("da_formare");
  });

  it("aggiornamento fatto in tempo (entro il 31/12 dell'anno di scadenza): non scaduto, conta l'aggiornamento", () => {
    // base 01/03/2020 → scade 01/03/2025; aggiornamento 20/11/2025: in tempo per la tolleranza
    const { base, aggiornamento } = cellaDi([att("a", ANT_B, "2020-03-01"), att("a", ANT_A, "2025-11-20")]);
    expect(base).toEqual({ data: "2020-03-01", etichetta: "valido" });
    expect(aggiornamento).toEqual({ data: "2025-11-20", etichetta: "valido" });
  });

  it("l'aggiornamento in tempo ma vicino alla sua scadenza mostra «In scadenza» (il base solo la data)", () => {
    const { base, aggiornamento } = cellaDi([att("a", ANT_B, "2016-01-10"), att("a", ANT_A, "2021-12-01")]);
    expect(base.etichetta).toBe("valido");
    expect(aggiornamento).toEqual({ data: "2021-12-01", etichetta: "in_scadenza" });
  });

  it("aggiornamento fatto dopo il termine: «Fuori termine»; il corso base resta scaduto", () => {
    // base 01/03/2018 → scade 01/03/2023; termine 31/12/2023; aggiornamento 01/09/2024
    const { base, aggiornamento } = cellaDi([att("a", ANT_B, "2018-03-01"), att("a", ANT_A, "2024-09-01")]);
    expect(base.etichetta).toBe("scaduto");
    expect(aggiornamento).toEqual({ data: "2024-09-01", etichetta: "fuori_termine" });
  });

  it("catena di aggiornamenti: conta l'ultimo, controllato rispetto al precedente", () => {
    const { aggiornamento } = cellaDi([
      att("a", ANT_B, "2012-03-01"), att("a", ANT_A, "2017-06-01"), att("a", ANT_A, "2022-10-01"),
    ]);
    expect(aggiornamento).toEqual({ data: "2022-10-01", etichetta: "valido" });
  });

  it("un nuovo corso base successivo all'aggiornamento riparte da capo", () => {
    const { base, aggiornamento } = cellaDi([att("a", ANT_B, "2012-03-01"), att("a", ANT_A, "2017-06-01"), att("a", ANT_B, "2025-02-01")]);
    expect(base).toEqual({ data: "2025-02-01", etichetta: "valido" });
    expect(aggiornamento.etichetta).toBe("non_necessario");
  });

  it("tolleranza: scaduto solo dopo il 31/12 dell'anno di scadenza; «In scadenza» da 90 giorni prima", () => {
    expect(esitoPerScadenza("2026-12-15", "2026-11-09")).toBe("in_scadenza");
    expect(esitoPerScadenza("2027-03-01", "2026-11-09")).toBe("valido");
    expect(esitoPerScadenza("2026-03-01", "2026-12-31")).toBe("in_scadenza");
    expect(esitoPerScadenza("2026-03-01", "2027-01-01")).toBe("scaduto");
    expect(esitoPerScadenza(null, "2027-01-01")).toBe("valido");
  });
});

/* ------------------------------------------------------------------------------------------------ */

const dip = (id: string, cognome: string, reparto: string): Dipendente =>
  ({ id, cognome, nome: "N", codice_fiscale: `CF${id}`, reparto, sottoreparto: null, classe_concorso: null, materia: null, stato_lavoratore: "in_forza" }) as unknown as Dipendente;
const ruolo = (id: string, nome: string, macro: string, tutti = false): RuoloSicurezza =>
  ({ id, nome, macro_categoria: macro, obbligatorio_tutti: tutti, attivo: true, ordine: 0 }) as unknown as RuoloSicurezza;
const ass = (d: string, r: string): AssegnazioneRuolo => ({ dipendente_id: d, ruolo_id: r }) as unknown as AssegnazioneRuolo;

const RUOLI = [
  ruolo("r-lav", "Lavoratore", "Sicurezza Lavoratori", true),
  ruolo("r-ant", "Addetto Antincendio", "Antincendio"),
  ruolo("r-pso", "Addetto Primo Soccorso", "Primo Soccorso"),
];
const DIPENDENTI = [dip("1", "BIANCHI", "Docente"), dip("2", "ROSSI", "ATA"), dip("3", "VERDI", "Docente"), dip("4", "NERI", "ATA")];
const ASSEGNAZIONI = [ass("1", "r-ant"), ass("1", "r-pso"), ass("2", "r-ant"), ass("3", "r-lav")];
const ATTESTATI = [att("1", ANT_B, "2024-03-10"), att("1", PSO_B, "2020-03-01"), att("2", ANT_B, "2020-03-01"), att("4", ANT_B, "2024-01-01")];
const righe = () => calcolaRigheOrganigramma(DIPENDENTI, ATTESTATI, RUOLI, ASSEGNAZIONI, FILTRI_INIZIALI, null, OGGI_DATA);

describe("righe dell'Organigramma", () => {
  it("solo chi ha un incarico di squadra; chi è in due squadre compare in entrambe", () => {
    const r = righe();
    expect(r.map((x) => `${x.cognome}/${x.squadra}`)).toEqual(["BIANCHI/Antincendio", "BIANCHI/Primo soccorso", "ROSSI/Antincendio"]);
    // VERDI ha solo il ruolo «Lavoratore» (obbligatorio per tutti) e NERI nessun ruolo: esclusi
    expect(r.some((x) => x.cognome === "VERDI" || x.cognome === "NERI")).toBe(false);
  });

  it("il testo delle celle: data, e tra parentesi lo stato quando serve", () => {
    const [bAnt, bPso, rAnt] = righe();
    expect(cella(bAnt!, "corsoBaseSquadra")).toBe("10/03/2024");
    expect(cella(bAnt!, "aggiornamentoSquadra")).toBe("Non necessario");
    expect(cella(bPso!, "corsoBaseSquadra")).toBe("01/03/2020 (Scaduto)");
    expect(cella(bPso!, "aggiornamentoSquadra")).toBe("Da formare");
    expect(cella(rAnt!, "corsoBaseSquadra")).toBe("01/03/2020 (Scaduto)");
    expect(cella(bAnt!, "squadra")).toBe("Antincendio");
  });

  it("senza ruoli collegati a una squadra (es. Privacy) quella squadra non compare", () => {
    expect(righe().some((x) => x.squadra === "Privacy")).toBe(false);
    const conPrivacy = calcolaRigheOrganigramma(
      DIPENDENTI, ATTESTATI, [...RUOLI, ruolo("r-pri", "Incaricato Privacy", "Privacy")], [...ASSEGNAZIONI, ass("3", "r-pri")], FILTRI_INIZIALI, null, OGGI_DATA,
    );
    expect(conPrivacy.find((x) => x.squadra === "Privacy")?.cognome).toBe("VERDI");
    expect(cella(conPrivacy.find((x) => x.squadra === "Privacy")!, "corsoBaseSquadra")).toBe("Da formare");
  });

  it("i cessati non compaiono, salvo richiesta", () => {
    const cessato = [{ ...DIPENDENTI[1]!, stato_lavoratore: "cessato" } as Dipendente, DIPENDENTI[0]!];
    expect(calcolaRigheOrganigramma(cessato, ATTESTATI, RUOLI, ASSEGNAZIONI, FILTRI_INIZIALI, null, OGGI_DATA).some((x) => x.cognome === "ROSSI")).toBe(false);
    expect(calcolaRigheOrganigramma(cessato, ATTESTATI, RUOLI, ASSEGNAZIONI, { ...FILTRI_INIZIALI, includiCessati: true }, null, OGGI_DATA).some((x) => x.cognome === "ROSSI")).toBe(true);
  });

  it("Docenti/ATA e squadra lavorano insieme", () => {
    const r = righe();
    expect(contaPubblico(r)).toEqual({ tutti: 2, docenti: 1, ata: 1 });
    const soloAta = filtraPerPubblico(r, "ata");
    expect(elencoGruppi(soloAta)).toEqual([{ nome: "Antincendio", conteggio: 1 }]);
    const tutte = elencoGruppi(r);
    expect(tutte).toEqual([{ nome: "Antincendio", conteggio: 2 }, { nome: "Primo soccorso", conteggio: 1 }]);
    expect(gruppiLavoratori(r, "funzione").map((g) => g.titolo)).toEqual(["Gruppo: Antincendio – 2 lavoratori", "Gruppo: Primo soccorso – 1 lavoratori"]);
    expect(gruppiLavoratori(r, "funzione", "Primo soccorso")[0]!.righe.map((x) => x.cognome)).toEqual(["BIANCHI"]);
  });

  it("totale: nominativi e lavoratori distinti", () => {
    expect(testoTotale("lavoratori", righe())).toBe("3 nominativi · 2 lavoratori");
    expect(testoTotale("lavoratori", [righe()[0]!])).toBe("1 lavoratori");
  });
});

describe("colori delle celle", () => {
  it("anteprima: data sopra, avviso colorato sotto", () => {
    const [bAnt, bPso] = righe();
    expect(righeCella(bAnt!, "corsoBaseSquadra")).toEqual([{ testo: "10/03/2024" }]);
    expect(righeCella(bPso!, "corsoBaseSquadra")).toEqual([
      { testo: "01/03/2020" }, { testo: "Scaduto", colore: "rosso", grassetto: true },
    ]);
    expect(righeCella(bPso!, "aggiornamentoSquadra")).toEqual([{ testo: "Da formare", colore: "rosso", grassetto: true }]);
    expect(righeCella(bAnt!, "aggiornamentoSquadra")).toEqual([{ testo: "Non necessario" }]);
  });

  it("stesse regole di prima per le altre celle: rosso e grassetto per Scaduto / Manca / dati mancanti", () => {
    const { cellaBase: _b, cellaAggiornamento: _a, ...base } = righe()[0]!;
    expect(righeCella({ ...base, stato: "scaduto" }, "stato")).toEqual([{ testo: "Scaduto", colore: "rosso", grassetto: true }]);
    expect(righeCella({ ...base, stato: "in_scadenza" }, "stato")).toEqual([{ testo: "In scadenza", grassetto: true }]);
    expect(righeCella({ ...base, stato: "manca" }, "scadenza")).toEqual([{ testo: "Manca", colore: "rosso", grassetto: true }]);
    expect(righeCella({ ...base, stato: "valido" }, "stato")).toEqual([{ testo: "Valido" }]);
  });
});

/** Tutto il contenuto grafico delle pagine del PDF, come testo (le istruzioni di colore sono operatori «r g b rg»). */
async function contenutoPdf(byte: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(byte);
  let out = "";
  for (const [, oggetto] of doc.context.enumerateIndirectObjects()) {
    if (!(oggetto instanceof PDFRawStream)) continue;
    const filtro = oggetto.dict.get(PDFName.of("Filter"));
    const dati = oggetto.contents;
    out += filtro ? inflateSync(Buffer.from(dati)).toString("latin1") : Buffer.from(dati).toString("latin1");
  }
  return out;
}

describe("PDF a colori come l'anteprima", () => {
  const opzioni = (rr: ReturnType<typeof righe>) => ({
    titolo: "Organigramma squadre di sicurezza",
    ditta: undefined,
    orizzontale: true,
    colonne: ["lavoratore", "reparto", "squadra", "corsoBaseSquadra", "aggiornamentoSquadra"] as never[],
    sezioni: [{ titolo: "Gruppo: Antincendio", righe: rr, nuovaPagina: false }],
    dataStampa: OGGI_DATA,
  });

  it("rosso per Scaduto / Da formare, grassetto e righe alternate", async () => {
    const byte = await creaPdf(opzioni(righe()));
    const c = await contenutoPdf(byte);
    expect(c).toContain("0.78 0.1 0.1 rg");      // rosso
    expect(c).toContain("0.955 0.955 0.955 rg"); // righe alternate
    expect(c).toContain("/Helvetica-Bold");
  });

  it("arancione per «In scadenza»", async () => {
    const inScadenza = calcolaRigheOrganigramma(
      [DIPENDENTI[0]!], [att("1", ANT_B, "2021-05-10")], RUOLI, [ass("1", "r-ant")], FILTRI_INIZIALI, null, OGGI_DATA,
    );
    const c = await contenutoPdf(await creaPdf(opzioni(inScadenza)));
    expect(c).toContain("0.85 0.42 0.02 rg");
  });

  it("la legenda dell'Organigramma compare solo per le sue colonne", () => {
    expect(righeLegenda(["lavoratore", "cf"])).toEqual([]);
    expect(righeLegenda(["corsoBaseSquadra"]).join(" ")).toContain("Non necessario");
  });
});

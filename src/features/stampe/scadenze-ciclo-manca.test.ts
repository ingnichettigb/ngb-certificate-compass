/*
 * File:      scadenze-ciclo-manca.test.ts
 * Percorso:  src/features/stampe/scadenze-ciclo-manca.test.ts
 * Data creaz: 08/11/2026
 * Verifica: scadenze calcolate con il ciclo per tutti i corsi, filtro Corso base / specifico, righe «Manca»,
 * scelta del pubblico (Tutti / Solo docenti / Solo ATA) e sezioni per reparto (Docenti poi ATA).
 * Rev 14/11/2026: la formazione generale (SIC-GEN) è permanente (nessuna scadenza, mai «scaduto»); un corso senza durata configurata
 * non è permanente; l'esonero RSPP/ASPP dall'aggiornamento Preposto è indicato nella colonna Stato.
 */
import { describe, expect, it } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import { applicaScadenzaCicli } from "@/features/scadenze/preposti";
import { calcolaRighe, cella, FILTRI_INIZIALI, type RigaStampa } from "./dati-stampa";
import { sezioniPerPdf } from "./esporta-pdf";
import { sezioniPerReparto } from "./stampa-gruppi";
import { contaPubblico, filtraPerPubblico } from "./stampa-pubblico";
import { trovaPredefinita } from "./stampe-predefinite";

const OGGI = new Date("2026-11-08T10:00:00");

function dip(id: string, reparto: string, extra: Partial<Dipendente> = {}): Dipendente {
  return {
    id, cognome: id, nome: "X", codice_fiscale: `CF${id}`, email: null, reparto, sottoreparto: null, classe_concorso: "A027", materia: null,
    luogo_nascita: "Roma", data_nascita: "1980-01-01", data_assunzione: "2020-09-01", stato_lavoratore: "in_forza", ...extra,
  } as unknown as Dipendente;
}

function att(id: string, d: Dipendente, codice: string, macro: string, livello: string, data: string, scad: string | null, ore = 4): Attestato {
  return {
    id, dipendente_id: d.id, codice_fiscale: d.codice_fiscale, tipo_corso_id: `t-${codice}`, data_corso: data, data_scadenza_calcolata: scad,
    ore_dichiarate: ore, stato_validazione: "Approvato", created_at: data,
    dipendenti: { id: d.id, cognome: d.cognome, nome: d.nome, codice_fiscale: d.codice_fiscale, reparto: d.reparto, sottoreparto: null, classe_concorso: d.classe_concorso, stato_lavoratore: d.stato_lavoratore },
    tipi_corso: { id: `t-${codice}`, nome_corso: codice, codice, macro_categoria: macro, livello_specifico: livello, durata_validita_anni: 5, ore_aggiornamento: 6, ore_minime_legge: ore },
  } as unknown as Attestato;
}

const scadenze = trovaPredefinita("scadenze-tutte")!.filtri;

describe("scadenze con il ciclo per tutti i corsi", () => {
  const rossi = dip("Rossi", "Docente");
  // Antincendio: base del 2018 (data salvata 2023-09-15) + aggiornamento di 6 ore nel 2022: il ciclo arriva al 2028.
  const base = att("a", rossi, "VFF-FOR1-4", "Antincendio", "Base", "2018-09-15", "2023-09-15");
  const agg = att("b", rossi, "VFF-AGG-5", "Antincendio", "Aggiornamento", "2022-05-10", "2027-05-10", 6);

  it("la data salvata sull'attestato viene sostituita da quella del ciclo", () => {
    const r = applicaScadenzaCicli([base, agg], OGGI);
    expect(r.map((a) => a.data_scadenza_calcolata)).toEqual(["2028-09-15", "2028-09-15"]);
  });
  it("chi ha fatto l'aggiornamento non risulta scaduto (con la sola data salvata lo sarebbe)", () => {
    const righe = calcolaRighe([base, agg], { ...scadenze, finestra: "scaduti" }, OGGI);
    expect(righe).toHaveLength(0);
  });
  it("senza aggiornamento il ciclo è scaduto e la riga compare", () => {
    const righe = calcolaRighe([base], { ...scadenze, finestra: "scaduti" }, OGGI);
    expect(righe.map((r) => r.stato)).toEqual(["scaduto"]);
  });
  it("un corso senza durata mantiene la data salvata", () => {
    const senza = { ...base, tipi_corso: { ...base.tipi_corso!, durata_validita_anni: null } } as Attestato;
    expect(applicaScadenzaCicli([senza], OGGI)[0]!.data_scadenza_calcolata).toBe("2023-09-15");
  });
});

describe("Corso base e Corso specifico con la voce «Manca»", () => {
  const docente = dip("Bianchi", "Docente");
  const ata = dip("Verdi", "ATA");
  const nuovo = dip("Neri", "ATA");
  const cessato = dip("Gialli", "ATA", { stato_lavoratore: "cessato" } as Partial<Dipendente>);
  const tutti = [docente, ata, nuovo, cessato];
  const gen = att("g1", docente, "SIC-GEN-04", "Sicurezza generale", "Base", "2015-03-01", "2020-03-01");
  const spe = att("s1", ata, "SIC-SPE-08", "Sicurezza specifica", "Base", "2015-03-01", "2020-03-01");
  const atts = [gen, spe];
  const base = trovaPredefinita("scadenze-corso-base")!.filtri;
  const specifico = trovaPredefinita("scadenze-corso-specifico")!.filtri;

  it("Corso base: la formazione generale non scade, quindi Bianchi (che ce l'ha) non compare; gli altri lavoratori in servizio compaiono con «Manca»", () => {
    const r = calcolaRighe(atts, base, OGGI, [], null, [], tutti);
    const perStato = Object.fromEntries(r.map((x) => [x.cognome, x.stato]));
    expect(perStato).toEqual({ Verdi: "manca", Neri: "manca" });
  });
  it("Corso specifico: l'inverso, e solo gli attestati del Corso specifico", () => {
    const r = calcolaRighe(atts, specifico, OGGI, [], null, [], tutti);
    expect(Object.fromEntries(r.map((x) => [x.cognome, x.stato]))).toEqual({ Verdi: "scaduto", Bianchi: "manca", Neri: "manca" });
  });
  it("le righe «Manca» non hanno data e dicono «Manca» in Scadenza e Stato", () => {
    const m = calcolaRighe(atts, base, OGGI, [], null, [], tutti).find((x) => x.cognome === "Verdi")!;
    expect(cella(m, "scadenza")).toBe("Manca");
    expect(cella(m, "stato")).toBe("Manca");
    expect(cella(m, "data")).toBe("—");
    expect(m.corso).toContain("Corso base");
  });
  it("i cessati non compaiono, salvo «Includi cessati»", () => {
    expect(calcolaRighe(atts, base, OGGI, [], null, [], tutti).some((x) => x.cognome === "Gialli")).toBe(false);
    expect(calcolaRighe(atts, { ...base, includiCessati: true }, OGGI, [], null, [], tutti).some((x) => x.cognome === "Gialli")).toBe(true);
  });
  it("chi non ha il corso sta in cima all'elenco di scadenza", () => {
    const r = calcolaRighe(atts, base, OGGI, [], null, [], tutti);
    const sez = sezioniPerPdf({ modello: "scadenze" }, r, null, [], undefined);
    expect(sez[0]!.righe[0]!.stato).toBe("manca");
  });
  it("senza l'elenco lavoratori non si inventano righe «Manca»", () => {
    expect(calcolaRighe(atts, base, OGGI).every((x) => x.stato !== "manca")).toBe(true);
  });
});

describe("incarico senza attestato: «Manca» per preposti, antincendio, primo soccorso e privacy", () => {
  const a = dip("Bianchi", "Docente");
  const b = dip("Rossi", "ATA");
  const ruoli = [{ id: "r1", nome: "Preposto", descrizione: null, macro_categoria: "Preposto", obbligatorio_tutti: false, attivo: true, ordine: 0 }] as never[];
  const ass = [{ id: "x", dipendente_id: "Bianchi", ruolo_id: "r1" }, { id: "y", dipendente_id: "Rossi", ruolo_id: "r1" }];
  const prep = att("p", b, "PRP-BAS-12", "Preposto", "Base", "2026-05-20", null, 12);

  it("il preposto con incarico ma senza attestato compare con «Manca»", () => {
    const f = trovaPredefinita("scadenze-preposti")!.filtri;
    const r = calcolaRighe([prep], { ...f, finestra: "tutti" }, OGGI, ass, null, ruoli, [a, b]);
    expect(r.filter((x) => x.stato === "manca").map((x) => x.cognome)).toEqual(["Bianchi"]);
  });
  it("Privacy senza un ruolo collegato: nessuna riga «Manca»", () => {
    const f = trovaPredefinita("scadenze-privacy")!.filtri;
    const r = calcolaRighe([], { ...f, finestra: "tutti" }, OGGI, ass, null, ruoli, [a, b]);
    expect(r).toHaveLength(0);
  });
  it("Scadenze – tutte non aggiunge righe «Manca»", () => {
    expect(calcolaRighe([], { ...FILTRI_INIZIALI, modello: "scadenze" }, OGGI, ass, null, ruoli, [a, b])).toHaveLength(0);
  });
});

describe("Tutti / Solo docenti / Solo ATA e sezioni per reparto", () => {
  const r = (id: string, dip: string, reparto: string): RigaStampa => ({ id, dipendenteId: dip, cognome: dip, reparto, scadenza: "2026-01-01" }) as unknown as RigaStampa;
  const righe = [r("1", "A", "ATA"), r("2", "B", "Docente"), r("3", "C", "Docente"), r("4", "D", "Segreteria")];

  it("filtra per reparto e conta i lavoratori di ogni scelta", () => {
    expect(filtraPerPubblico(righe, "docenti").map((x) => x.cognome)).toEqual(["B", "C"]);
    expect(filtraPerPubblico(righe, "ata").map((x) => x.cognome)).toEqual(["A"]);
    expect(filtraPerPubblico(righe, "tutti")).toHaveLength(4);
    expect(contaPubblico(righe)).toEqual({ tutti: 4, docenti: 2, ata: 1 });
  });
  it("sezioni: prima i Docenti, poi gli ATA, poi gli altri reparti", () => {
    expect(sezioniPerReparto(righe).map((s) => s.titolo)).toEqual(["Docenti – 2 lavoratori", "ATA – 1 lavoratori", "Segreteria – 1 lavoratori"]);
  });
  it("PDF: ogni reparto su una pagina nuova, tranne il primo", () => {
    const s = sezioniPerPdf({ modello: "scadenze" }, righe, null, [], "reparto");
    expect(s.map((x) => x.nuovaPagina)).toEqual([false, true, true]);
    expect(s[0]!.titolo).toBe("Docenti – 2 lavoratori");
  });
  it("PDF senza raggruppamento: una sola sezione", () => {
    expect(sezioniPerPdf({ modello: "scadenze" }, righe, null, [], undefined)).toHaveLength(1);
  });
});

describe("Formazione generale (SIC-GEN) permanente", () => {
  const rossi = dip("Rossi", "Docente");
  it("SIC-GEN non scade mai e non è mai «superata», anche con un corso specifico dello stesso lavoratore", () => {
    const gen = att("g", rossi, "SIC-GEN-04", "Sicurezza lavoratori", "Base", "2015-03-01", "2020-03-01");
    const spe = att("s", rossi, "SIC-SPE-08", "Sicurezza lavoratori", "Base", "2016-03-01", "2021-03-01", 8);
    const r = applicaScadenzaCicli([gen, spe], OGGI);
    expect(r[0]!.data_scadenza_calcolata).toBeNull();
    expect(r[0]!.superato).toBeUndefined();
    expect(r[0]!.daRifareBase).toBeUndefined();
    expect(r[1]!.data_scadenza_calcolata).not.toBeNull();
  });
  it("un corso senza durata configurata NON diventa permanente: eredita la scadenza del suo ciclo", () => {
    const base = att("b", rossi, "VFF-FOR1-4", "Antincendio", "Base", "2018-09-15", null);
    const senzaDurata = { ...base, tipi_corso: { ...base.tipi_corso!, durata_validita_anni: null } } as Attestato;
    const agg = att("c", rossi, "VFF-AGG-5", "Antincendio", "Aggiornamento", "2022-05-10", null, 6);
    const r = applicaScadenzaCicli([senzaDurata, agg], OGGI);
    expect(r[0]!.data_scadenza_calcolata).toBe("2028-09-15");
  });
});

describe("Preposto esonerato dall'aggiornamento per RSPP/ASPP valido", () => {
  const rossi = dip("Rossi", "ATA");
  const prep = att("p", rossi, "PRP-BAS-12", "Preposto", "Base", "2022-03-10", null, 8);
  const rspp = att("r", rossi, "SIC-RSPP-AGG", "RSPP", "Aggiornamento", "2025-01-10", "2030-01-10", 40);

  it("la colonna Stato indica l'esonero e la data dell'RSPP, non solo «Valido»", () => {
    const righe = calcolaRighe([prep, rspp], FILTRI_INIZIALI, OGGI);
    const riga = righe.find((x) => x.codice === "PRP-BAS-12")!;
    expect(riga.stato).toBe("valido");
    expect(riga.scadenza).toBe("2030-01-10");
    expect(cella(riga, "stato")).toContain("Esente dall'aggiornamento Preposto");
    expect(cella(riga, "stato")).toContain("10/01/2030");
  });
  it("senza RSPP valido la colonna Stato resta quella di sempre", () => {
    const riga = calcolaRighe([prep], FILTRI_INIZIALI, OGGI).find((x) => x.codice === "PRP-BAS-12")!;
    expect(riga.esenzioneRspp).toBeUndefined();
    expect(cella(riga, "stato")).toBe("Scaduto");
  });
});

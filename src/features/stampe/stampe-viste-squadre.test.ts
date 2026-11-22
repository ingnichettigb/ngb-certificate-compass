/*
 * File:      stampe-viste-squadre.test.ts
 * Percorso:  src/features/stampe/stampe-viste-squadre.test.ts
 * Data creaz: 22/11/2026
 * Revisioni:
 *   rev 1 — 22/11/2026 — Le due viste «Tutti gli addetti» / «Richiedono formazione» anche su Scadenze – preposti, antincendio e primo soccorso;
 *            la colonna «Data assunzione» compare nelle righe per attestato (scelta dal «+»).
 */
import { describe, expect, it } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import { calcolaRighe, cella, colonneDisponibili } from "./dati-stampa";
import { contaVistaAddetti, righePerVistaAddetti } from "./stampa-addetti";
import { trovaPredefinita } from "./stampe-predefinite";

const OGGI = new Date("2026-11-22T10:00:00");

function dip(id: string): Dipendente {
  return {
    id, cognome: id, nome: "X", codice_fiscale: `CF${id}`, email: null, reparto: "ATA", sottoreparto: null, classe_concorso: null, materia: null,
    luogo_nascita: "Roma", data_nascita: "1980-01-01", data_assunzione: "2020-09-01", stato_lavoratore: "in_forza",
  } as unknown as Dipendente;
}

function att(id: string, d: Dipendente, codice: string, macro: string, livello: string, data: string, scad: string | null): Attestato {
  return {
    id, dipendente_id: d.id, codice_fiscale: d.codice_fiscale, tipo_corso_id: `t-${codice}`, data_corso: data, data_scadenza_calcolata: scad,
    ore_dichiarate: 5, stato_validazione: "Approvato", created_at: data,
    dipendenti: { ...d },
    tipi_corso: { id: `t-${codice}`, nome_corso: codice, codice, macro_categoria: macro, livello_specifico: livello, durata_validita_anni: null, ore_aggiornamento: 3, ore_minime_legge: 5 },
  } as unknown as Attestato;
}

type Caso = { carta: string; macro: string; nomeRuolo: string; base: string; agg: string; dataValido: string; dataInScadenza: string };
const CASI: Caso[] = [
  { carta: "scadenze-antincendio", macro: "Antincendio", nomeRuolo: "Addetto antincendio", base: "VFF-FOR1-4", agg: "VFF-FOR1A2", dataValido: "2025-06-01", dataInScadenza: "2021-12-20" },
  { carta: "scadenze-primo-soccorso", macro: "Primo Soccorso", nomeRuolo: "Addetto primo soccorso", base: "PSO-GAB-12", agg: "PSO-AgB-04", dataValido: "2025-06-01", dataInScadenza: "2021-12-20" },
  { carta: "scadenze-preposti", macro: "Preposto", nomeRuolo: "Preposto", base: "PRP-BAS-12", agg: "PRP-AGG-06", dataValido: "2026-09-01", dataInScadenza: "2025-02-01" } // il preposto dura 2 anni,
];

describe.each(CASI)("$carta: due viste come il defibrillatore", ({ carta, macro, nomeRuolo, base, agg, dataValido, dataInScadenza }) => {
  const predefinita = trovaPredefinita(carta)!;
  const ruolo = { id: "r1", nome: nomeRuolo, descrizione: null, macro_categoria: macro, obbligatorio_tutti: false, attivo: true, ordine: 0, codice: "X" } as never;
  const valido = dip("Valido"), inScad = dip("InScadenza"), scaduto = dip("Scaduto"), senza = dip("Senza"), soloAgg = dip("SoloAgg");
  const tutti = [valido, inScad, scaduto, senza, soloAgg];
  const attestati = [
    att("1", valido, base, macro, "Base", dataValido, "2030-06-01"),
    att("2", inScad, base, macro, "Base", dataInScadenza, "2027-03-20"),
    att("3", scaduto, base, macro, "Base", "2019-01-10", "2024-01-10"),
    att("4", soloAgg, agg, macro, "Aggiornamento", "2025-02-10", "2030-02-10"),
  ];
  const assegnazioni = tutti.map((d) => ({ id: `x-${d.id}`, dipendente_id: d.id, ruolo_id: "r1" }));
  const righe = () => calcolaRighe(attestati, { ...predefinita.filtri, senzaFinestra: true }, OGGI, assegnazioni, null, [ruolo], tutti);

  it("la carta ha la barra delle viste e conserva i filtri", () => {
    expect(predefinita.vistaAddetti).toBe(true);
    expect(predefinita.filtri).toMatchObject({ soloIncarichi: true, conMancanti: true, finestra: "365" });
  });

  it("«Tutti gli addetti»: tutta la squadra, anche chi scade tra più di 12 mesi", () => {
    const r = righePerVistaAddetti(righe(), "tutti");
    expect([...new Set(r.map((x) => x.dipendenteId))].sort()).toEqual(["InScadenza", "Scaduto", "Senza", "SoloAgg", "Valido"]);
    expect(r.filter((x) => x.dipendenteId === "SoloAgg").map((x) => x.stato)).toEqual(["manca", "senza_scadenza"]);
  });

  it("«Richiedono formazione»: scaduti e chi non ha il corso (anche «Manca corso base»); non gli «In scadenza»", () => {
    const r = righePerVistaAddetti(righe(), "formazione");
    expect([...new Set(r.map((x) => x.dipendenteId))].sort()).toEqual(["Scaduto", "Senza", "SoloAgg"]);
    expect(contaVistaAddetti(righe())).toEqual({ tutti: 5, formazione: 3 });
  });

  it("l'«In scadenza» a 9 mesi non richiede formazione ed è arancione con la data", () => {
    const r = righe().find((x) => x.dipendenteId === "InScadenza")!;
    expect(r.stato).toBe("in_scadenza");
    expect(cella(r, "stato")).toMatch(/^In scadenza – \d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("Data assunzione nelle stampe per attestato", () => {
  const rossi = dip("Rossi");
  const a = att("a", rossi, "VFF-FOR1-4", "Antincendio", "Base", "2025-06-01", "2030-06-01");

  it("si può scegliere dal «+» in tutti i documenti per attestato", () => {
    for (const m of ["registro", "gruppo", "scadenze", "scheda", "reparto"] as const) expect(colonneDisponibili(m)).toContain("assunzione");
  });

  it("la riga per attestato porta la data dall'anagrafica", () => {
    const f = { ...trovaPredefinita("scadenze-tutte")!.filtri, senzaFinestra: true };
    const [r] = calcolaRighe([a], f, OGGI, [], null, [], [rossi]);
    expect(cella(r!, "assunzione")).toBe("01/09/2020");
  });

  it("anche la riga «Manca» (corso non svolto) ha la data di assunzione", () => {
    const f = trovaPredefinita("scadenze-antincendio")!.filtri;
    const ruolo = { id: "r1", nome: "Addetto antincendio", descrizione: null, macro_categoria: "Antincendio", obbligatorio_tutti: false, attivo: true, ordine: 0, codice: "X" } as never;
    const senza = dip("Senza");
    const r = calcolaRighe([], f, OGGI, [{ id: "x", dipendente_id: "Senza", ruolo_id: "r1" }], null, [ruolo], [senza]);
    expect(r).toHaveLength(1);
    expect(cella(r[0]!, "assunzione")).toBe("01/09/2020");
  });
});

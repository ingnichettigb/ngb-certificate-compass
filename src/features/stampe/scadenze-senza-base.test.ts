/*
 * File:      scadenze-senza-base.test.ts
 * Percorso:  src/features/stampe/scadenze-senza-base.test.ts
 * Data creaz: 22/11/2026
 * Revisioni:
 *   rev 1 — 22/11/2026 — Aggiornamento senza corso base: niente «Scaduto», riga «Manca corso base» sopra l'aggiornamento
 *            (defibrillatore, antincendio, primo soccorso, preposti); nessun effetto con il base presente, fuori dalle scadenze e sugli altri gruppi.
 *   rev 2 — 22/11/2026 — Solo gli attestati «Approvato» contano: un corso base in attesa o respinto non cancella «Manca corso base».
 */
import { describe, expect, it } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import { calcolaRighe, cella } from "./dati-stampa";
import { aggiornamentiSenzaBase, eAggiornamento } from "./stampa-senza-base";
import { trovaPredefinita } from "./stampe-predefinite";

const OGGI = new Date("2026-11-22T10:00:00");

function dip(id: string, reparto = "ATA"): Dipendente {
  return {
    id, cognome: id, nome: "X", codice_fiscale: `CF${id}`, email: null, reparto, sottoreparto: null, classe_concorso: "A027", materia: null,
    luogo_nascita: "Roma", data_nascita: "1980-01-01", data_assunzione: "2020-09-01", stato_lavoratore: "in_forza",
  } as unknown as Dipendente;
}

function att(id: string, d: Dipendente, codice: string, macro: string, livello: string, data: string, scad: string | null, ore = 3): Attestato {
  return {
    id, dipendente_id: d.id, codice_fiscale: d.codice_fiscale, tipo_corso_id: `t-${codice}`, data_corso: data, data_scadenza_calcolata: scad,
    ore_dichiarate: ore, url_foto_fronte: "x.pdf", stato_validazione: "Approvato", created_at: data,
    dipendenti: { id: d.id, cognome: d.cognome, nome: d.nome, codice_fiscale: d.codice_fiscale, reparto: d.reparto, sottoreparto: null, classe_concorso: d.classe_concorso, stato_lavoratore: d.stato_lavoratore },
    tipi_corso: { id: `t-${codice}`, nome_corso: codice, codice, macro_categoria: macro, livello_specifico: livello, durata_validita_anni: 2, ore_aggiornamento: 3, ore_minime_legge: ore },
  } as unknown as Attestato;
}

const defib = trovaPredefinita("scadenze-defibrillatore")!.filtri;
const tutte = trovaPredefinita("scadenze-tutte")!.filtri;

const ruoloDae = { id: "r-dae", nome: "Addetto BLSD / Defibrillatore", descrizione: null, macro_categoria: "Defibrillatore", obbligatorio_tutti: false, attivo: true, ordine: 0, codice: "ADD_DAE" } as never;

describe("riconoscimento dell'aggiornamento", () => {
  it("«AGG» nel codice oppure livello «Aggiornamento»", () => {
    expect(eAggiornamento({ codice: "BLS-AGG-02", livello_specifico: "Aggiornamento" })).toBe(true);
    expect(eAggiornamento({ codice: "VFF-FOR2A5", livello_specifico: "Aggiornamento" })).toBe(true);
    expect(eAggiornamento({ codice: "PSO-AgB-04", livello_specifico: "Aggiornamento" })).toBe(true);
    expect(eAggiornamento({ codice: "PRP-AGG-06", livello_specifico: "Aggiornamento" })).toBe(true);
    expect(eAggiornamento({ codice: "BLS-BAS-05", livello_specifico: "Base" })).toBe(false);
    expect(eAggiornamento({ codice: "PRP-BAS-12", livello_specifico: "Specifico" })).toBe(false);
  });
});

describe("defibrillatore: aggiornamento senza corso base", () => {
  const villa = dip("Villa");
  const agg = att("a1", villa, "BLS-AGG-02", "Defibrillatore", "Aggiornamento", "2022-03-10", "2024-03-10");
  const ass = [{ id: "x", dipendente_id: "Villa", ruolo_id: "r-dae" }];
  const f = { ...defib, finestra: "365" as const };

  it("non risulta «Scaduto»: la riga del base «Manca corso base» sta sopra l'aggiornamento", () => {
    const r = calcolaRighe([agg], f, OGGI, ass, null, [ruoloDae], [villa]).sort((a, b) => a.dataCorso.localeCompare(b.dataCorso));
    expect(r).toHaveLength(2);
    expect(r[0]!.stato).toBe("manca");
    expect(cella(r[0]!, "scadenza")).toBe("MANCA");
    expect(cella(r[0]!, "stato")).toBe("MANCA");
    expect(r[0]!.corso).toBe("Corso base – Defibrillatore");
    expect(r[1]!.stato).not.toBe("scaduto");
    expect(cella(r[1]!, "stato")).toBe("Aggiornamento svolto");
    expect(cella(r[1]!, "scadenza")).toBe("—");
    expect(r.some((x) => x.stato === "scaduto")).toBe(false);
  });

  it("l'ordinamento standard (cognome, nome, data) mette il «Manca» prima dell'aggiornamento", () => {
    const r = calcolaRighe([agg], f, OGGI, ass, null, [ruoloDae], [villa]);
    expect(r.map((x) => x.stato)).toEqual(["manca", "senza_scadenza"]);
  });

  it("con più aggiornamenti la riga «Manca corso base» è una sola (resta l'ultimo aggiornamento, come nelle altre scadenze)", () => {
    const agg2 = att("a2", villa, "BLS-AGG-02", "Defibrillatore", "Aggiornamento", "2024-05-10", "2026-05-10");
    const r = calcolaRighe([agg, agg2], f, OGGI, ass, null, [ruoloDae], [villa]);
    expect(r.filter((x) => x.stato === "manca")).toHaveLength(1);
    expect(r.filter((x) => x.aggiornamentoSenzaBase).map((x) => x.dataCorso)).toEqual(["2024-05-10"]);
  });

  it("con il corso base presente nessuna riga «Manca corso base» e nessuna modifica", () => {
    const base = att("b1", villa, "BLS-BAS-05", "Defibrillatore", "Base", "2020-03-10", "2022-03-10");
    const r = calcolaRighe([base, agg], { ...f, finestra: "tutti" }, OGGI, ass, null, [ruoloDae], [villa]);
    expect(r.some((x) => x.stato === "manca")).toBe(false);
    expect(r.some((x) => x.aggiornamentoSenzaBase)).toBe(false);
  });

  it("la riga resta anche con la finestra «scaduti» e «tutti»", () => {
    for (const finestra of ["scaduti", "tutti"] as const) {
      const r = calcolaRighe([agg], { ...f, finestra }, OGGI, ass, null, [ruoloDae], [villa]);
      expect(r.map((x) => x.stato)).toEqual(["manca", "senza_scadenza"]);
    }
  });

  it("chi non ha l'incarico di addetto defibrillatore non compare nella carta per ruolo", () => {
    const r = calcolaRighe([agg], f, OGGI, [], null, [ruoloDae], [villa]);
    expect(r).toHaveLength(0);
  });
});

describe("altri gruppi e altri modelli", () => {
  it("antincendio: l'aggiornamento senza «AGG» nel codice (VFF-FOR2A5) è riconosciuto dal livello", () => {
    const rossi = dip("Rossi");
    const a = att("a", rossi, "VFF-FOR2A5", "Antincendio", "Aggiornamento", "2022-01-10", "2027-01-10", 5);
    const r = calcolaRighe([a], { ...tutte, finestra: "365" }, OGGI, [], null, [], [rossi]);
    expect(r.map((x) => x.stato)).toEqual(["manca", "senza_scadenza"]);
    expect(r[0]!.corso).toBe("Corso base – Antincendio");
  });

  it("primo soccorso (PSO-AgB-04) e preposti (PRP-AGG-06) sono coperti", () => {
    const bianchi = dip("Bianchi");
    const ps = att("p", bianchi, "PSO-AgB-04", "Primo Soccorso", "Aggiornamento", "2023-01-10", "2026-01-10", 4);
    const pr = att("q", bianchi, "PRP-AGG-06", "Preposto", "Aggiornamento", "2025-02-10", "2027-02-10", 6);
    const r = calcolaRighe([ps, pr], { ...tutte, finestra: "tutti" }, OGGI, [], null, [], [bianchi]);
    expect(r.filter((x) => x.stato === "manca").map((x) => x.gruppo).sort()).toEqual(["preposti", "primo-soccorso"]);
  });

  it("fuori dalle scadenze (es. abilitati completati) non si aggiunge nulla", () => {
    const villa = dip("Villa");
    const agg = att("a1", villa, "BLS-AGG-02", "Defibrillatore", "Aggiornamento", "2022-03-10", "2024-03-10");
    const f = trovaPredefinita("completati-defibrillatore")!.filtri;
    const r = calcolaRighe([agg], f, OGGI, [], null, [], [villa]);
    expect(r.some((x) => x.stato === "manca" || x.aggiornamentoSenzaBase)).toBe(false);
  });

  it("Privacy e corsi attrezzature «-AGG» non sono toccati", () => {
    const neri = dip("Neri");
    const pr = att("x", neri, "PRIVACY-A01", "PRIVACY", "Base", "2024-01-10", null, 1);
    const ple = att("y", neri, "LAV-PLE-II-831-AGG", "Sicurezza Lavoratori", "Specifico", "2020-01-10", "2025-01-10", 4);
    const r = calcolaRighe([pr, ple], { ...tutte, finestra: "tutti" }, OGGI, [], null, [], [neri]);
    expect(r.some((x) => x.stato === "manca" || x.aggiornamentoSenzaBase)).toBe(false);
  });

  it("aggiornamentiSenzaBase: un corso base non approvato non conta come base presente", () => {
    const villa = dip("Villa");
    const agg = att("a1", villa, "BLS-AGG-02", "Defibrillatore", "Aggiornamento", "2022-03-10", "2024-03-10");
    const baseInAttesa = { ...att("b1", villa, "BLS-BAS-05", "Defibrillatore", "Base", "2020-03-10", "2022-03-10"), stato_validazione: "In attesa" } as Attestato;
    const baseRespinto = { ...baseInAttesa, stato_validazione: "Respinto" } as Attestato;
    expect(aggiornamentiSenzaBase([agg, baseInAttesa]).has("Villa|defibrillatore")).toBe(true);
    expect(aggiornamentiSenzaBase([agg, baseRespinto]).has("Villa|defibrillatore")).toBe(true);
    expect(aggiornamentiSenzaBase([agg, att("b2", villa, "BLS-BAS-05", "Defibrillatore", "Base", "2020-03-10", "2022-03-10")]).size).toBe(0);
  });

  it("aggiornamentiSenzaBase: gli attestati dei gruppi senza base e aggiornamento non producono chiavi", () => {
    const neri = dip("Neri");
    expect(aggiornamentiSenzaBase([att("x", neri, "PRIVACY-A01", "PRIVACY", "Base", "2024-01-10", null, 1)]).size).toBe(0);
  });
});

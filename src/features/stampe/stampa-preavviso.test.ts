/*
 * File:      stampa-preavviso.test.ts
 * Percorso:  src/features/stampe/stampa-preavviso.test.ts
 * Data creaz: 22/11/2026
 * Revisioni:
 *   rev 1 — 22/11/2026 — «In scadenza» da 9 mesi (270 giorni) prima della scadenza, con la data nella casella Stato, in arancione;
 *            «Scaduto» solo a data passata; oltre i 9 mesi «Valido».
 */
import { describe, expect, it } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import { calcolaRighe, cella } from "./dati-stampa";
import { GIORNI_PREAVVISO_STAMPE } from "./stampa-formati";
import { statoValidita } from "./stampa-selezioni";
import { righeCella } from "./stampa-stile";
import { trovaPredefinita } from "./stampe-predefinite";

const OGGI = new Date("2026-11-22T10:00:00");

function dip(id: string): Dipendente {
  return {
    id, cognome: id, nome: "X", codice_fiscale: `CF${id}`, email: null, reparto: "ATA", sottoreparto: null, classe_concorso: "A027", materia: null,
    luogo_nascita: "Roma", data_nascita: "1980-01-01", data_assunzione: "2020-09-01", stato_lavoratore: "in_forza",
  } as unknown as Dipendente;
}

function attConScadenza(id: string, d: Dipendente, scad: string): Attestato {
  return {
    id, dipendente_id: d.id, codice_fiscale: d.codice_fiscale, tipo_corso_id: `t-${id}`, data_corso: "2024-01-10", data_scadenza_calcolata: scad,
    ore_dichiarate: 4, url_foto_fronte: "x.pdf", stato_validazione: "Approvato", created_at: "2024-01-10",
    dipendenti: { id: d.id, cognome: d.cognome, nome: d.nome, codice_fiscale: d.codice_fiscale, reparto: d.reparto, sottoreparto: null, classe_concorso: d.classe_concorso, stato_lavoratore: d.stato_lavoratore },
    // senza durata: il motore dei cicli lascia la data salvata
    tipi_corso: { id: `t-${id}`, nome_corso: "Corso X", codice: `ALT-${id}`, macro_categoria: "Altro", livello_specifico: "Base", durata_validita_anni: null, ore_aggiornamento: null, ore_minime_legge: 4 },
  } as unknown as Attestato;
}

describe("preavviso di 9 mesi", () => {
  it("la soglia è 270 giorni", () => expect(GIORNI_PREAVVISO_STAMPE).toBe(270));

  it("scaduto solo a data passata; entro 270 giorni «In scadenza»; oltre «Valido»", () => {
    expect(statoValidita("2026-11-21", OGGI).stato).toBe("scaduto");
    expect(statoValidita("2026-11-22", OGGI).stato).toBe("in_scadenza");
    expect(statoValidita("2027-05-22", OGGI).stato).toBe("in_scadenza"); // 6 mesi
    expect(statoValidita("2027-08-19", OGGI).stato).toBe("in_scadenza"); // 270 giorni
    expect(statoValidita("2027-08-20", OGGI).stato).toBe("valido");
    expect(statoValidita(null, OGGI).stato).toBe("senza_scadenza");
  });

  it("un corso che scade tra 6 mesi non è «Scaduto»: «In scadenza – data», arancione", () => {
    const rossi = dip("Rossi");
    const f = { ...trovaPredefinita("scadenze-tutte")!.filtri, finestra: "365" as const };
    const [r] = calcolaRighe([attConScadenza("a", rossi, "2027-05-22")], f, OGGI, [], null, [], [rossi]);
    expect(r!.stato).toBe("in_scadenza");
    expect(cella(r!, "stato")).toBe("In scadenza – 22/05/2027");
    expect(cella(r!, "scadenza")).toBe("22/05/2027");
    expect(righeCella(r!, "stato")).toEqual([{ testo: "In scadenza – 22/05/2027", colore: "arancione", grassetto: true }]);
  });

  it("scaduto davvero: «Scaduto» in rosso, senza data nella casella Stato", () => {
    const rossi = dip("Rossi");
    const f = { ...trovaPredefinita("scadenze-tutte")!.filtri, finestra: "365" as const };
    const [r] = calcolaRighe([attConScadenza("a", rossi, "2026-10-01")], f, OGGI, [], null, [], [rossi]);
    expect(cella(r!, "stato")).toBe("Scaduto");
    expect(righeCella(r!, "stato")[0]).toMatchObject({ colore: "rosso" });
  });

  it("tra 9 e 12 mesi la riga è in elenco (finestra 12 mesi) ma resta «Valido»", () => {
    const rossi = dip("Rossi");
    const f = { ...trovaPredefinita("scadenze-tutte")!.filtri, finestra: "365" as const };
    const [r] = calcolaRighe([attConScadenza("a", rossi, "2027-10-01")], f, OGGI, [], null, [], [rossi]);
    expect(cella(r!, "stato")).toBe("Valido");
  });
});

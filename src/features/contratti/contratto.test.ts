/*
 * File:      contratto.test.ts
 * Percorso:  src/features/contratti/contratto.test.ts
 * Revisioni:
 *   rev 1 — 28/10/2026 — Test delle regole contrattuali (nessuna intestazione originale).
 *   rev 2 — 05/11/2026 21:30 — Intestazione; test «Nuovi arrivati» dal 1 settembre e filtro «Da completare».
 *   rev 3 — 27/11/2026 — Filtro «Senza PDF»: solo in forza, solo attestati registrati, include chi non ha alcun attestato;
 *            test di contaPdfMancanti, lavoratoriSenzaPdf e parseFiltroStato.
 */
import { describe, expect, it } from "vitest";
import { type AttestatoPerPdf, contaPdfMancanti, filtraPerStato, isNuovoArrivato, lavoratoriSenzaPdf, parseFiltroStato, richiedeDecisione } from "./contratto";
import { type Dipendente } from "@/lib/api";

const base = { id: "x", codice_fiscale: "", cognome: "", nome: "", email: null, reparto: null, sottoreparto: null, classe_concorso: null, materia: null, luogo_nascita: null, data_nascita: null } as Dipendente;
const oggi = new Date(2026, 9, 28);

describe("gestione contrattuale", () => {
  it("avvisa un determinato che scade entro 30 giorni", () => {
    expect(richiedeDecisione({ ...base, tipo_contratto: "determinato", data_fine_contratto: "2026-11-20" }, oggi)).toBe(true);
  });
  it("non avvisa un determinato che scade fra più di 30 giorni", () => {
    expect(richiedeDecisione({ ...base, tipo_contratto: "determinato", data_fine_contratto: "2027-01-31" }, oggi)).toBe(false);
  });
  it("non avvisa gli indeterminati", () => {
    expect(richiedeDecisione({ ...base, tipo_contratto: "indeterminato", data_fine_contratto: "2026-10-30" }, oggi)).toBe(false);
  });
  it("i terminati restano in archivio come cessati e non spariscono", () => {
    const lista = [{ ...base, id: "a" }, { ...base, id: "b", stato_lavoratore: "cessato" }] as Dipendente[];
    expect(filtraPerStato(lista, "in_forza").map((d) => d.id)).toEqual(["a"]);
    expect(filtraPerStato(lista, "cessati").map((d) => d.id)).toEqual(["b"]);
    expect(filtraPerStato(lista, "tutti")).toHaveLength(2);
  });
});

describe("filtro Senza PDF", () => {
  const lav = (id: string, cessato = false) => ({ id, stato_lavoratore: cessato ? "cessato" : null }) as never;
  const att = (dip: string, url: string | null, stato = "File Attestato mancante"): AttestatoPerPdf => ({ dipendente_id: dip, url_foto_fronte: url, stato_validazione: stato as AttestatoPerPdf["stato_validazione"] });

  it("mostra i lavoratori in forza con almeno un attestato registrato senza file", () => {
    const lista = [lav("a"), lav("b")];
    const a = [att("a", null), att("b", "x.pdf", "Approvato")];
    expect(filtraPerStato(lista as never[], "senza_pdf", new Date(), a).map((d: { id: string }) => d.id)).toEqual(["a"]);
  });
  it("include i lavoratori in forza senza alcun attestato", () => {
    const lista = [lav("a"), lav("b")];
    const a = [att("b", "x.pdf", "Approvato")];
    expect(lavoratoriSenzaPdf(lista, a).map((d: { id: string }) => d.id)).toEqual(["a"]);
  });
  it("esclude i cessati, anche se non hanno file o attestati", () => {
    const lista = [lav("a", true), lav("b", true)];
    expect(lavoratoriSenzaPdf(lista, [att("a", null)])).toEqual([]);
  });
  it("ignora gli attestati «In attesa» e «Respinto» senza file: restano alla validazione HR", () => {
    const lista = [lav("a"), lav("b")];
    const a = [att("a", null, "In attesa"), att("b", null, "Respinto")];
    expect(lavoratoriSenzaPdf(lista, a)).toEqual([]);
  });
  it("conta i PDF mancanti di un lavoratore, solo tra gli attestati registrati", () => {
    expect(contaPdfMancanti([att("a", null), att("a", "", "Approvato"), att("a", "x.pdf", "Approvato"), att("a", null, "In attesa")])).toBe(2);
  });
  it("legge il filtro dall'indirizzo solo se è un valore valido", () => {
    expect(parseFiltroStato("senza_pdf")).toBe("senza_pdf");
    expect(parseFiltroStato("altro")).toBeUndefined();
    expect(parseFiltroStato(undefined)).toBeUndefined();
  });
});

describe("nuovi arrivati e da completare", () => {
  const adesso = new Date(2026, 10, 5);
  const nuovo = { ...base, id: "n", data_assunzione: "2026-09-01", reparto: "Docente", cognome: "ROSSI", nome: "MARIO", codice_fiscale: "X" } as Dipendente;
  it("«Nuovi arrivati» sono gli assunti dal 1 settembre dell'anno scolastico, non quelli degli ultimi 60 giorni", () => {
    expect(isNuovoArrivato(nuovo, adesso)).toBe(true);
    expect(isNuovoArrivato({ ...nuovo, data_assunzione: "2026-08-31" }, adesso)).toBe(false);
    expect(isNuovoArrivato({ ...nuovo, stato_lavoratore: "cessato" }, adesso)).toBe(false);
  });
  it("il filtro «da_completare» mostra solo i nuovi incompleti e i riabilitati", () => {
    const tornato = { ...base, id: "t", stato_lavoratore: "in_forza", data_cessazione: "2026-08-31" } as Dipendente;
    const vecchio = { ...base, id: "v", data_assunzione: "2015-09-01" } as Dipendente;
    const lista = [nuovo, tornato, vecchio];
    expect(filtraPerStato(lista, "da_completare", adesso).map((d) => d.id)).toEqual(["n", "t"]);
  });
});

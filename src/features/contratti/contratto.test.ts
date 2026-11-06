/*
 * File:      contratto.test.ts
 * Percorso:  src/features/contratti/contratto.test.ts
 * Revisioni:
 *   rev 1 — 28/10/2026 — Test delle regole contrattuali (nessuna intestazione originale).
 *   rev 2 — 05/11/2026 21:30 — Intestazione; test «Nuovi arrivati» dal 1 settembre e filtro «Da completare».
 */
import { describe, expect, it } from "vitest";
import { filtraPerStato, isNuovoArrivato, richiedeDecisione } from "./contratto";
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
  it("mostra solo i lavoratori con almeno un attestato senza file", () => {
    const lista = [{ id: "a" }, { id: "b" }] as never[];
    const att = [
      { dipendente_id: "a", url_foto_fronte: null },
      { dipendente_id: "b", url_foto_fronte: "x.pdf" },
    ];
    expect(filtraPerStato(lista, "senza_pdf", new Date(), att).map((d: { id: string }) => d.id)).toEqual(["a"]);
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

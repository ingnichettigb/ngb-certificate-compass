/*
 * File:          formazione-lavoratore.test.ts
 * Percorso:      src/features/dipendenti/formazione-lavoratore.test.ts
 * Data creazione: 2026-11-21
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 *   - Rev 2 (2026-11-21): Fase 5 — esiti con le decisioni dell'operatore.
 *   - Rev 3 (2026-11-22): Fase 6 — valutaFormazioneDelDipendente e motivoInAttesaFormazione.
 */
import { describe, expect, it } from "vitest";
import type { Attestato } from "@/lib/api/attestati";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import type { DecisioneSpecifica, EsitoEquivalenza } from "@/features/formazione-valutazione/decisioni";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { corsiSvoltiDa, motivoInAttesaFormazione, valutaFormazioneDelDipendente, valutaFormazioneLavoratore } from "./formazione-lavoratore";

let n = 0;
const reg = (ruolo_codice: string, parametro: string, valore: string, corso_base: string | null, corso_aggiornamento: string | null): RegolaRuoloCorso => ({
  id: `g${++n}`, ruolo_codice, parametro, valore, corso_base, corso_aggiornamento, ordine: n,
});
const regole = [
  reg("LAVORATORE", "nessuno", "—", "SIC-GEN-04", null),
  reg("LAVORATORE", "rischio ATECO", "basso", "SIC-SPE-04", "SIC-AGG-06"),
  reg("LAVORATORE", "rischio ATECO", "medio", "SIC-SPE-08", "SIC-AGG-06"),
  reg("LAVORATORE", "rischio ATECO", "alto", "SIC-SPE-12", "SIC-AGG-06"),
  reg("ADD_DAE", "nessuno", "—", "BLS-BAS-05", "BLS-AGG-05"),
];
const valuta = (rischio: "basso" | "medio" | "alto" | null, ...svolti: string[]) =>
  valutaFormazioneLavoratore({ regole, contesto: { rischioDitta: rischio }, corsiSvolti: new Set(svolti) });

describe("valutaFormazioneLavoratore", () => {
  it("completa: corso base e specifica del rischio della ditta", () => {
    const e = valuta("medio", "SIC-GEN-04", "SIC-SPE-08");
    expect(e.completa).toBe(true);
    expect(e.specifica).toEqual({ attesa: "SIC-SPE-08", stato: "presente", trovata: "SIC-SPE-08" });
    expect(e.motivo).toBe("Formazione lavoratore completa");
  });

  it("il corso base viene dalla Tabella 02, senza codici scritti nel programma", () => {
    expect(valuta("medio").base.attesi).toEqual(["SIC-GEN-04"]);
  });

  it("manca il corso base", () => {
    const e = valuta("medio", "SIC-SPE-08");
    expect(e.completa).toBe(false);
    expect(e.base.mancanti).toEqual(["SIC-GEN-04"]);
    expect(e.motivo).toContain("manca il corso base");
  });

  it("manca la formazione specifica", () => {
    const e = valuta("alto", "SIC-GEN-04");
    expect(e.completa).toBe(false);
    expect(e.specifica.stato).toBe("mancante");
    expect(e.specifica.attesa).toBe("SIC-SPE-12");
  });

  it("specifica di un altro grado: non si accetta da sola, decide l'operatore", () => {
    const e = valuta("medio", "SIC-GEN-04", "SIC-SPE-12");
    expect(e.completa).toBe(false);
    expect(e.specifica).toEqual({ attesa: "SIC-SPE-08", stato: "diversa", trovata: "SIC-SPE-12" });
    expect(e.motivo).toContain("decide l'operatore");
  });

  it("anche con una specifica più bassa è «diversa»", () => {
    expect(valuta("alto", "SIC-GEN-04", "SIC-SPE-04").specifica.stato).toBe("diversa");
  });

  it("se c'è quella giusta, un altro corso specifico in più non cambia l'esito", () => {
    expect(valuta("medio", "SIC-GEN-04", "SIC-SPE-08", "SIC-SPE-12").specifica.stato).toBe("presente");
  });

  it("rischio non impostato: la specifica non è valutabile e il prerequisito non è soddisfatto", () => {
    const e = valuta(null, "SIC-GEN-04", "SIC-SPE-08");
    expect(e.specifica.stato).toBe("non-valutabile");
    expect(e.completa).toBe(false);
    expect(e.motivo).toContain("non impostato");
  });

  it("senza regole del Lavoratore nella tabella non si può dire completa", () => {
    const e = valutaFormazioneLavoratore({ regole: [], contesto: { rischioDitta: "medio" }, corsiSvolti: new Set(["SIC-GEN-04"]) });
    expect(e.completa).toBe(false);
  });
});

describe("corsiSvoltiDa", () => {
  const att = (dipendente_id: string, codice: string | null, stato: string) =>
    ({ id: `${dipendente_id}${codice}${stato}`, dipendente_id, stato_validazione: stato, tipi_corso: codice ? { codice } : null }) as unknown as Attestato;
  it("solo attestati approvati del lavoratore, con codice in maiuscolo", () => {
    const s = corsiSvoltiDa(
      [att("d1", "sic-gen-04", "Approvato"), att("d1", "SIC-SPE-08", "Respinto"), att("d1", "BLS-BAS-05", "In attesa"), att("d2", "SIC-AGG-06", "Approvato"), att("d1", null, "Approvato")],
      "d1",
    );
    expect([...s]).toEqual(["SIC-GEN-04"]);
  });
});

describe("valutaFormazioneLavoratore con le decisioni dell'operatore", () => {
  const dec = (esito: EsitoEquivalenza, extra: Partial<DecisioneSpecifica> = {}): DecisioneSpecifica => ({
    attestatoId: "a1", esito, corsoSvolto: "SIC-SPE-12", corsoAtteso: "SIC-SPE-08", rischio: "medio", nota: "Valutato", data: "2026-11-21T10:00:00.000Z", ...extra,
  });
  const con = (decisioni: DecisioneSpecifica[], rischio: "basso" | "medio" | "alto" = "medio", ...svolti: string[]) =>
    valutaFormazioneLavoratore({ regole, contesto: { rischioDitta: rischio }, corsiSvolti: new Set(["SIC-GEN-04", ...svolti]), decisioni });

  it("accettata: vale come completa e lo dice", () => {
    const e = con([dec("accettata")], "medio", "SIC-SPE-12");
    expect(e.completa).toBe(true);
    expect(e.specifica).toEqual({ attesa: "SIC-SPE-08", stato: "accettata", trovata: "SIC-SPE-12" });
    expect(e.motivo).toContain("accettata dall'operatore");
  });

  it("serve integrazione: non completa", () => {
    const e = con([dec("integrazione")], "medio", "SIC-SPE-12");
    expect(e.completa).toBe(false);
    expect(e.specifica.stato).toBe("integrazione");
    expect(e.motivo).toContain("serve integrazione");
  });

  it("non valida: non completa, e non si ripropone da valutare", () => {
    const e = con([dec("non_valida")], "medio", "SIC-SPE-12");
    expect(e.completa).toBe(false);
    expect(e.specifica.stato).toBe("non-valida");
  });

  it("senza decisione resta «diversa»", () => {
    expect(con([], "medio", "SIC-SPE-12").specifica.stato).toBe("diversa");
  });

  it("una decisione presa con un altro rischio non vale più", () => {
    expect(con([dec("accettata", { rischio: "basso", corsoAtteso: "SIC-SPE-04" })], "medio", "SIC-SPE-12").specifica.stato).toBe("diversa");
  });

  it("una decisione su un altro corso non vale per questo", () => {
    expect(con([dec("accettata", { corsoSvolto: "SIC-SPE-04" })], "medio", "SIC-SPE-12").specifica.stato).toBe("diversa");
  });

  it("con due corsi diversi, uno accettato basta; se uno è senza decisione resta da valutare", () => {
    const due = ["SIC-SPE-04", "SIC-SPE-12"];
    expect(con([dec("accettata")], "medio", ...due).specifica.stato).toBe("accettata");
    expect(con([dec("non_valida")], "medio", ...due).specifica).toMatchObject({ stato: "diversa", trovata: "SIC-SPE-04" });
  });

  it("se c'è la specifica giusta le decisioni non servono", () => {
    expect(con([dec("non_valida")], "medio", "SIC-SPE-08", "SIC-SPE-12").specifica.stato).toBe("presente");
  });

  it("la decisione non sostituisce il corso base", () => {
    const e = valutaFormazioneLavoratore({ regole, contesto: { rischioDitta: "medio" }, corsiSvolti: new Set(["SIC-SPE-12"]), decisioni: [dec("accettata")] });
    expect(e.completa).toBe(false);
    expect(e.base.mancanti).toEqual(["SIC-GEN-04"]);
  });
});

describe("valutaFormazioneDelDipendente", () => {
  const a = (id: string, dipendente_id: string, codice: string, extra: Record<string, unknown> = {}) =>
    ({ id, dipendente_id, stato_validazione: "Approvato", data_corso: "2024-01-10", tipi_corso: { codice }, ...extra }) as unknown as Attestato;
  const vai = (attestati: Attestato[], dipendenteId = "d1") => valutaFormazioneDelDipendente({ attestati, dipendenteId, regole, contesto: { rischioDitta: "medio" } });

  it("legge gli attestati del lavoratore, non quelli degli altri", () => {
    expect(vai([a("1", "d1", "SIC-GEN-04"), a("2", "d1", "SIC-SPE-08")]).completa).toBe(true);
    expect(vai([a("1", "d2", "SIC-GEN-04"), a("2", "d2", "SIC-SPE-08")]).completa).toBe(false);
  });

  it("tiene conto della decisione registrata sull'attestato", () => {
    const decisa = a("2", "d1", "SIC-SPE-12", {
      equivalenza_esito: "accettata", equivalenza_corso_svolto: "SIC-SPE-12", equivalenza_corso_atteso: "SIC-SPE-08",
      equivalenza_rischio: "medio", equivalenza_nota: "Stesso settore", equivalenza_data: "2026-11-21T10:00:00.000Z",
    });
    expect(vai([a("1", "d1", "SIC-GEN-04"), decisa]).specifica.stato).toBe("accettata");
    expect(vai([a("1", "d1", "SIC-GEN-04"), a("2", "d1", "SIC-SPE-12")]).specifica.stato).toBe("diversa");
  });
});

describe("motivoInAttesaFormazione", () => {
  const ruolo = (richiede: string | null) => ({ richiede }) as unknown as RuoloSicurezza;
  const incompleta = valuta("medio", "SIC-SPE-08");
  const completa = valuta("medio", "SIC-GEN-04", "SIC-SPE-08");

  it("un ruolo che richiede LAVORATORE è in attesa finché la formazione non è completa", () => {
    expect(motivoInAttesaFormazione(ruolo("LAVORATORE"), incompleta)).toContain("manca il corso base");
    expect(motivoInAttesaFormazione(ruolo("lavoratore"), incompleta)).not.toBeNull();
  });
  it("completa: nessuna attesa", () => {
    expect(motivoInAttesaFormazione(ruolo("LAVORATORE"), completa)).toBeNull();
  });
  it("un ruolo che non richiede LAVORATORE, o nessuna valutazione: nessuna attesa", () => {
    expect(motivoInAttesaFormazione(ruolo(null), incompleta)).toBeNull();
    expect(motivoInAttesaFormazione(ruolo("PREPOSTO"), incompleta)).toBeNull();
    expect(motivoInAttesaFormazione(ruolo("LAVORATORE"), null)).toBeNull();
    expect(motivoInAttesaFormazione(null, incompleta)).toBeNull();
  });
});

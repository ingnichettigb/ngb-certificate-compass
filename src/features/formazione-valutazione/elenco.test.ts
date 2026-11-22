/*
 * File:          elenco.test.ts
 * Percorso:      src/features/formazione-valutazione/elenco.test.ts
 * Data creazione: 2026-11-21
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { Attestato } from "@/lib/api/attestati";
import type { Dipendente } from "@/lib/api/dipendenti";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { elencoFormazioneDaValutare } from "./elenco";

let n = 0;
const reg = (parametro: string, valore: string, corso_base: string): RegolaRuoloCorso => ({
  id: `g${++n}`, ruolo_codice: "LAVORATORE", parametro, valore, corso_base, corso_aggiornamento: null, ordine: n,
});
const regole = [reg("nessuno", "—", "SIC-GEN-04"), reg("rischio ATECO", "basso", "SIC-SPE-04"), reg("rischio ATECO", "medio", "SIC-SPE-08"), reg("rischio ATECO", "alto", "SIC-SPE-12")];
const dip = (id: string, cognome: string, extra: Partial<Dipendente> = {}) => ({ id, cognome, nome: "X", stato_lavoratore: "in_forza", ...extra }) as unknown as Dipendente;
const att = (id: string, dipendente_id: string, codice: string, extra: Partial<Attestato> = {}) =>
  ({ id, dipendente_id, stato_validazione: "Approvato", data_corso: "2024-01-10", tipi_corso: { codice }, ...extra }) as unknown as Attestato;
const decisa = (esito: "accettata" | "integrazione" | "non_valida", rischio: "basso" | "medio" | "alto" = "medio"): Partial<Attestato> => ({
  equivalenza_esito: esito, equivalenza_corso_svolto: "SIC-SPE-12", equivalenza_corso_atteso: "SIC-SPE-08", equivalenza_rischio: rischio,
  equivalenza_nota: "Valutato", equivalenza_data: "2026-11-21T10:00:00.000Z",
});
const elenco = (dipendenti: Dipendente[], attestati: Attestato[], rischio: "basso" | "medio" | "alto" | null = "medio") =>
  elencoFormazioneDaValutare({ dipendenti, attestati, regole, contesto: { rischioDitta: rischio } });

describe("elencoFormazioneDaValutare", () => {
  it("una specifica diversa senza decisione è «da valutare», con l'attestato che porterà la decisione", () => {
    const e = elenco([dip("d1", "Rossi")], [att("a1", "d1", "SIC-GEN-04"), att("a2", "d1", "SIC-SPE-12")]);
    expect(e.pendenti).toHaveLength(1);
    expect(e.pendenti[0]).toMatchObject({ corsoSvolto: "SIC-SPE-12", corsoAtteso: "SIC-SPE-08", stato: "diversa", decisione: null });
    expect(e.pendenti[0]!.attestato.id).toBe("a2");
    expect(e.decise).toHaveLength(0);
  });

  it("chi ha la specifica giusta, o nessuna specifica, non compare", () => {
    const e = elenco([dip("d1", "Rossi"), dip("d2", "Bianchi")], [att("a1", "d1", "SIC-SPE-08")]);
    expect(e.pendenti).toHaveLength(0);
    expect(e.decise).toHaveLength(0);
  });

  it("le decisioni valide passano tra le «decise», una per esito", () => {
    for (const [esito, stato] of [["accettata", "accettata"], ["integrazione", "integrazione"], ["non_valida", "non-valida"]] as const) {
      const e = elenco([dip("d1", "Rossi")], [att("a2", "d1", "SIC-SPE-12", decisa(esito))]);
      expect(e.pendenti, esito).toHaveLength(0);
      expect(e.decise[0], esito).toMatchObject({ stato, decisione: { esito, nota: "Valutato" } });
    }
  });

  it("se la ditta cambia rischio, la decisione decade e torna «da valutare»", () => {
    const e = elenco([dip("d1", "Rossi")], [att("a2", "d1", "SIC-SPE-12", decisa("accettata"))], "basso");
    expect(e.decise).toHaveLength(0);
    expect(e.pendenti[0]).toMatchObject({ corsoAtteso: "SIC-SPE-04", stato: "diversa" });
  });

  it("i lavoratori cessati e gli attestati non approvati non contano", () => {
    const e = elenco(
      [dip("d1", "Rossi", { stato_lavoratore: "cessato" }), dip("d2", "Bianchi")],
      [att("a1", "d1", "SIC-SPE-12"), att("a2", "d2", "SIC-SPE-12", { stato_validazione: "In attesa" })],
    );
    expect(e.pendenti).toHaveLength(0);
  });

  it("senza grado di rischio non si valuta nessuno e lo segnala", () => {
    const e = elenco([dip("d1", "Rossi")], [att("a1", "d1", "SIC-SPE-12")], null);
    expect(e.pendenti).toHaveLength(0);
    expect(e.rischioNonImpostato).toBe(true);
  });

  it("ordina per cognome e nome", () => {
    const e = elenco([dip("d1", "Verdi"), dip("d2", "Anselmi")], [att("a1", "d1", "SIC-SPE-12"), att("a2", "d2", "SIC-SPE-04")]);
    expect(e.pendenti.map((v) => v.dipendente.cognome)).toEqual(["Anselmi", "Verdi"]);
  });
});

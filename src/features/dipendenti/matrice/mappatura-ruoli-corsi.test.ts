/*
 * File:          mappatura-ruoli-corsi.test.ts
 * Percorso:      src/features/dipendenti/matrice/mappatura-ruoli-corsi.test.ts
 * Data creazione: 2026-11-21
 * Verifica che il ruolo di un corso si trovi per CODICE: un ruolo rinominato continua ad agganciarsi, e i corsi delle
 * attrezzature non finiscono mai sul ruolo Lavoratore (obbligatorio per tutti).
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { RuoloSicurezza, TipoCorso } from "@/lib/api";
import { isCorsoObbligatorioPerDipendente, trovaRuoloPerCorso } from "./mappatura-ruoli-corsi";

let n = 0;
const ruolo = (codice: string, nome: string, extra: Partial<RuoloSicurezza> = {}): RuoloSicurezza => ({
  id: `r-${codice}`,
  nome,
  codice,
  descrizione: null,
  macro_categoria: null,
  obbligatorio_tutti: false,
  attivo: true,
  ordine: ++n,
  ...extra,
});
const corso = (codice: string, nome: string, macro = "Sicurezza Lavoratori") =>
  ({ id: `c-${codice}`, codice, nome_corso: nome, macro_categoria: macro }) as unknown as TipoCorso;

const lavoratore = ruolo("LAVORATORE", "Lavoratore", { obbligatorio_tutti: true, macro_categoria: "Sicurezza Lavoratori" });
const catalogo = [
  lavoratore,
  ruolo("ADD_DAE", "Nome cambiato che non somiglia a niente"),
  ruolo("PREPOSTO", "Preposto"),
  ruolo("OPER_CAR_CP_II_8311", "OPERATORE CARRIPONTE CP"),
];

describe("trovaRuoloPerCorso: per codice", () => {
  it("un ruolo rinominato si aggancia ancora al suo corso", () => {
    expect(trovaRuoloPerCorso(corso("BLS-BAS-05", "Corso BLSD"), catalogo)?.codice).toBe("ADD_DAE");
  });

  it("il corso dell'attrezzatura va al suo ruolo OPER_, base e aggiornamento", () => {
    expect(trovaRuoloPerCorso(corso("LAV-CAR-CP-II-8311", "Carriponte (CP)"), catalogo)?.codice).toBe("OPER_CAR_CP_II_8311");
    expect(trovaRuoloPerCorso(corso("LAV-CAR-CP-II-8311-AGG", "Carriponte (CP)"), catalogo)?.codice).toBe("OPER_CAR_CP_II_8311");
  });

  it("il codice del corso in minuscolo o misto non cambia l'esito", () => {
    expect(trovaRuoloPerCorso(corso("lav-car-cp-ii-8311", "Carriponte (CP)"), catalogo)?.codice).toBe("OPER_CAR_CP_II_8311");
  });

  it("un'attrezzatura senza ruolo non va al Lavoratore: nessun ruolo", () => {
    expect(trovaRuoloPerCorso(corso("LAV-PLE-II-831", "PLE con stabilizzatori"), catalogo)).toBeNull();
  });

  it("un ruolo disattivato non viene agganciato", () => {
    const disattivo = catalogo.map((r) => (r.codice === "OPER_CAR_CP_II_8311" ? { ...r, attivo: false } : r));
    expect(trovaRuoloPerCorso(corso("LAV-CAR-CP-II-8311", "Carriponte (CP)"), disattivo)).toBeNull();
  });

  it("i corsi del Lavoratore (SIC-GEN) continuano ad andare al Lavoratore", () => {
    expect(trovaRuoloPerCorso(corso("SIC-GEN-04", "Formazione generale"), catalogo)?.codice).toBe("LAVORATORE");
  });
});

describe("isCorsoObbligatorioPerDipendente: attrezzature", () => {
  const ass = (...ids: string[]) => new Set(ids.map((i) => `d1_${i}`));

  it("senza il ruolo OPER_ assegnato il corso attrezzatura non è obbligatorio", () => {
    expect(isCorsoObbligatorioPerDipendente("d1", corso("LAV-CAR-CP-II-8311", "Carriponte"), catalogo, ass())).toBe(false);
  });

  it("con il ruolo OPER_ assegnato lo diventa", () => {
    expect(
      isCorsoObbligatorioPerDipendente("d1", corso("LAV-CAR-CP-II-8311", "Carriponte"), catalogo, ass("r-OPER_CAR_CP_II_8311")),
    ).toBe(true);
  });

  it("un'attrezzatura senza ruolo non è mai obbligatoria, nemmeno per il Lavoratore", () => {
    expect(isCorsoObbligatorioPerDipendente("d1", corso("LAV-PLE-II-831", "PLE"), catalogo, ass("r-LAVORATORE"))).toBe(false);
  });
});

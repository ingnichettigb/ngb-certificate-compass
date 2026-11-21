/*
 * File:          mappatura-ruoli-corsi.test.ts
 * Percorso:      src/features/dipendenti/matrice/mappatura-ruoli-corsi.test.ts
 * Data creazione: 2026-11-21
 * Verifica che il ruolo di un corso si trovi per CODICE: un ruolo rinominato continua ad agganciarsi, e i corsi delle
 * attrezzature non finiscono mai sul ruolo Lavoratore (obbligatorio per tutti).
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 *   - Rev 2 (2026-11-21): Fase 2 — con la Tabella 02 il ruolo del corso lo decide solo lei; ruolo di gruppo per codice.
 */
import { describe, expect, it } from "vitest";
import type { RuoloSicurezza, TipoCorso } from "@/lib/api";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { isCorsoObbligatorioPerDipendente, trovaRuoloPerChiaveGruppo, trovaRuoloPerCorso } from "./mappatura-ruoli-corsi";

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

// ---- Fase 2: la Tabella 02 decide ----
const regola = (ruolo_codice: string, corso_base: string | null, corso_aggiornamento: string | null): RegolaRuoloCorso => ({
  id: `g-${ruolo_codice}-${corso_base}`, ruolo_codice, parametro: "nessuno", valore: "—", corso_base, corso_aggiornamento, ordine: ++n,
});
const tabella02 = [
  regola("LAVORATORE", "SIC-GEN-04", "SIC-AGG-06"),
  regola("ADD_DAE", "BLS-BAS-05", "BLS-AGG-05"),
  regola("OPER_CAR_CP_II_8311", "LAV-CAR-CP-II-8311", "LAV-CAR-CP-II-8311-AGG"),
];

describe("trovaRuoloPerCorso: con la Tabella 02", () => {
  it("il ruolo è quello indicato dalla tabella, anche per un corso senza prefisso noto", () => {
    expect(trovaRuoloPerCorso(corso("XYZ-99", "Corso qualsiasi"), catalogo, [regola("PREPOSTO", "XYZ-99", null)])?.codice).toBe("PREPOSTO");
  });

  it("un corso che la tabella non cita non ha ruolo: niente ripiego sul Lavoratore o sul nome", () => {
    expect(trovaRuoloPerCorso(corso("SIC-SPI-04", "Integrazione specifica"), catalogo, tabella02)).toBeNull();
    expect(trovaRuoloPerCorso(corso("COVID19-02", "Covid"), catalogo, tabella02)).toBeNull();
  });

  it("i corsi della tabella vanno al loro ruolo, base e aggiornamento", () => {
    expect(trovaRuoloPerCorso(corso("BLS-AGG-05", "Aggiornamento BLSD"), catalogo, tabella02)?.codice).toBe("ADD_DAE");
    expect(trovaRuoloPerCorso(corso("SIC-GEN-04", "Formazione generale"), catalogo, tabella02)?.codice).toBe("LAVORATORE");
  });

  it("se il ruolo indicato dalla tabella è disattivato o non esiste: nessun ruolo", () => {
    const spento = catalogo.map((r) => (r.codice === "ADD_DAE" ? { ...r, attivo: false } : r));
    expect(trovaRuoloPerCorso(corso("BLS-BAS-05", "BLSD"), spento, tabella02)).toBeNull();
    expect(trovaRuoloPerCorso(corso("X-1", "X"), catalogo, [regola("NON_ESISTE", "X-1", null)])).toBeNull();
  });

  it("con la tabella vuota o non caricata vale il riconoscimento di prima", () => {
    expect(trovaRuoloPerCorso(corso("BLS-BAS-05", "BLSD"), catalogo, [])?.codice).toBe("ADD_DAE");
    expect(trovaRuoloPerCorso(corso("BLS-BAS-05", "BLSD"), catalogo, undefined)?.codice).toBe("ADD_DAE");
  });

  it("obbligatorietà: un corso fuori tabella non è dovuto da nessuno, nemmeno dal Lavoratore", () => {
    const ass = new Set(["d1_r-LAVORATORE"]);
    expect(isCorsoObbligatorioPerDipendente("d1", corso("SIC-SPI-04", "Integrazione"), catalogo, ass, null, tabella02)).toBe(false);
    expect(isCorsoObbligatorioPerDipendente("d1", corso("SIC-GEN-04", "Generale"), catalogo, ass, null, tabella02)).toBe(true);
  });
});

describe("trovaRuoloPerChiaveGruppo: per codice", () => {
  it("trova il ruolo del gruppo anche se rinominato", () => {
    expect(trovaRuoloPerChiaveGruppo("defibrillatore", catalogo)?.codice).toBe("ADD_DAE");
    expect(trovaRuoloPerChiaveGruppo("preposti", catalogo)?.codice).toBe("PREPOSTO");
    expect(trovaRuoloPerChiaveGruppo("sicurezza-lavoratori", catalogo)?.codice).toBe("LAVORATORE");
  });
});

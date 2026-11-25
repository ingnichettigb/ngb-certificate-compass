/*
 * File:          proposta-corso.test.ts
 * Percorso:      src/features/dipendenti/aggancia-allegato/proposta-corso.test.ts
 * Data creazione: 2026-11-22
 * Revisioni:
 *   - Rev 1 (2026-11-22): Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { Attestato } from "@/lib/api/attestati";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import type { TipoCorso } from "@/lib/api/tipi-corso";
import { corsiProposti, corsoDalNomeFile, etichettaCorso, ruoliDelLavoratore } from "./proposta-corso";

const corso = (codice: string | null, nome_corso: string) => ({ id: `c-${codice ?? nome_corso}`, codice, nome_corso }) as unknown as TipoCorso;
const corsi = [
  corso("SIC-GEN-04", "Formazione generale"),
  corso("SIC-SPE-04", "Specifica rischio basso"),
  corso("SIC-SPE-08", "Specifica rischio medio"),
  corso("SIC-SPE-12", "Specifica rischio alto"),
  corso("BLS-BAS-05", "Uso del DAE (BLSD)"),
  corso("BLS-AGG-05", "Aggiornamento uso del DAE (BLSD)"),
  corso("LAV-CAR-CP-II-8311", "Carriponte (CP) CABINA - Parte II – 8.3.11"),
  corso("LAV-CAR-CP-II-8311-AGG", "Carriponte (CP) CABINA - Parte II – 8.3.11"),
  corso("SIC-ASPP-A", "ASPP modulo A"),
];

describe("etichettaCorso", () => {
  it("nome normale se il nome è unico", () => {
    expect(etichettaCorso(corsi[0]!, corsi)).toBe("Formazione generale");
  });
  it("con il codice se più corsi hanno lo stesso nome (base e aggiornamento)", () => {
    expect(etichettaCorso(corsi[6]!, corsi)).toBe("Carriponte (CP) CABINA - Parte II – 8.3.11 [LAV-CAR-CP-II-8311]");
    expect(etichettaCorso(corsi[7]!, corsi)).toBe("Carriponte (CP) CABINA - Parte II – 8.3.11 [LAV-CAR-CP-II-8311-AGG]");
  });
});

describe("corsoDalNomeFile", () => {
  it("riconosce il codice nel nome del file", () => {
    expect(corsoDalNomeFile("2026-03_ROSSI_MARIO_RSSMRA80A01_SIC_SPE_08.pdf", corsi)).toMatchObject({ corso: { codice: "SIC-SPE-08" }, via: "codice" });
    expect(corsoDalNomeFile("attestato sic-spe-04 rossi.pdf", corsi)?.corso.codice).toBe("SIC-SPE-04");
  });
  it("il codice più lungo vince: l'aggiornamento non si scambia con il corso base", () => {
    expect(corsoDalNomeFile("2026-03_ROSSI_LAV-CAR-CP-II-8311-AGG.pdf", corsi)?.corso.codice).toBe("LAV-CAR-CP-II-8311-AGG");
    expect(corsoDalNomeFile("2026-03_ROSSI_LAV-CAR-CP-II-8311.pdf", corsi)?.corso.codice).toBe("LAV-CAR-CP-II-8311");
  });
  it("il nome del file creato dall'app contiene il nome del corso: lo riconosce se è unico", () => {
    expect(corsoDalNomeFile("2026-03_ROSSI_MARIO_RSSMRA80A01_FORMAZIONE_GENERALE.pdf", corsi)).toMatchObject({ corso: { codice: "SIC-GEN-04" }, via: "nome" });
  });
  it("un nome condiviso da più corsi non si sceglie da solo", () => {
    expect(corsoDalNomeFile("2026-03_ROSSI_CARRIPONTE_CP_CABINA_PARTE_II_8_3_11.pdf", corsi)).toBeNull();
  });
  it("etichetta con codice (nome condiviso) → torna al corso giusto", () => {
    const f = `2026-03_ROSSI_${etichettaCorso(corsi[7]!, corsi).replace(/[^A-Za-z0-9]+/g, "_")}.pdf`;
    expect(corsoDalNomeFile(f, corsi)?.corso.codice).toBe("LAV-CAR-CP-II-8311-AGG");
  });
  it("nessun corso riconoscibile, o un nome troppo generico: null", () => {
    expect(corsoDalNomeFile("scansione_0001.pdf", corsi)).toBeNull();
    expect(corsoDalNomeFile("documento.pdf", [])).toBeNull();
  });
  it("il codice non si trova a metà di un'altra parola", () => {
    expect(corsoDalNomeFile("XSIC_SPE_08X.pdf", corsi)).toBeNull();
  });
});

// ---- corsiProposti ----
let n = 0;
const ruolo = (codice: string, nome: string, extra: Partial<RuoloSicurezza> = {}) =>
  ({ id: `r-${codice}`, nome, codice, attivo: true, obbligatorio_tutti: false, ordine: ++n, ...extra }) as unknown as RuoloSicurezza;
const ruoli = [
  ruolo("LAVORATORE", "Lavoratore", { obbligatorio_tutti: true }),
  ruolo("ADD-DAE", "Addetto DAE"),
  ruolo("OPER-CAR-CP-II-8311", "OPERATORE CARRIPONTE CP"),
  ruolo("ADD-ANTINCENDIO", "Addetto Antincendio"),
  ruolo("ASPP", "ASPP"),
];
const reg = (ruolo_codice: string, parametro: string, valore: string, corso_base: string | null, corso_aggiornamento: string | null): RegolaRuoloCorso => ({
  id: `g${++n}`, ruolo_codice, parametro, valore, corso_base, corso_aggiornamento, ordine: n,
});
const regole = [
  reg("LAVORATORE", "nessuno", "—", "SIC-GEN-04", null),
  reg("LAVORATORE", "rischio ATECO", "basso", "SIC-SPE-04", null),
  reg("LAVORATORE", "rischio ATECO", "medio", "SIC-SPE-08", null),
  reg("LAVORATORE", "rischio ATECO", "alto", "SIC-SPE-12", null),
  reg("ADD-DAE", "nessuno", "—", "BLS-BAS-05", "BLS-AGG-05"),
  reg("OPER-CAR-CP-II-8311", "nessuno", "—", "LAV-CAR-CP-II-8311", "LAV-CAR-CP-II-8311-AGG"),
  reg("ADD-ANTINCENDIO", "nessuno", "—", "SIC-GEN-04", null),
  reg("ASPP", "modulo", "A", "SIC-ASPP-A", null),
];
const assegna = (...r: string[]): AssegnazioneRuolo[] => r.map((x) => ({ id: `as-${x}`, dipendente_id: "d1", ruolo_id: `r-${x}` }));
const att = (codice: string, data_corso: string, extra: Partial<Attestato> = {}) =>
  ({ id: `${codice}${data_corso}`, dipendente_id: "d1", stato_validazione: "Approvato", data_corso, data_scadenza_calcolata: null, tipi_corso: { codice }, ...extra }) as unknown as Attestato;
const proponi = (assegnazioni: AssegnazioneRuolo[], attestati: Attestato[], rischio: "basso" | "medio" | "alto" | null = "medio") =>
  corsiProposti({ ruoli, assegnazioni, dipendenteId: "d1", regole, contesto: { rischioDitta: rischio }, corsi, attestati, oggi: "2026-11-22" });
const codici = (p: ReturnType<typeof proponi>) => p.map((x) => x.corso.codice);

describe("ruoliDelLavoratore", () => {
  it("il ruolo per tutti più quelli assegnati, solo se attivi", () => {
    const attivi = ruoliDelLavoratore(ruoli.map((r) => (r.codice === "ADD-DAE" ? { ...r, attivo: false } : r)), assegna("ADD-DAE", "OPER-CAR-CP-II-8311"), "d1");
    expect(attivi.map((r) => r.codice)).toEqual(["LAVORATORE", "OPER-CAR-CP-II-8311"]);
  });
});

describe("corsiProposti", () => {
  it("a un lavoratore nuovo propone il corso base e la specifica del rischio della ditta, non le altre", () => {
    expect(codici(proponi([], []))).toEqual(["SIC-GEN-04", "SIC-SPE-08"]);
    expect(codici(proponi([], [], "alto"))).toEqual(["SIC-GEN-04", "SIC-SPE-12"]);
  });

  it("senza grado di rischio si propongono tutte e tre le specifiche, come fa la Matrice (non si sceglie un livello)", () => {
    expect(codici(proponi([], [], null))).toEqual(["SIC-GEN-04", "SIC-SPE-04", "SIC-SPE-08", "SIC-SPE-12"]);
  });

  it("non propone ciò che il lavoratore ha già svolto (permanente o ancora valido)", () => {
    const p = proponi([], [att("SIC-GEN-04", "2020-01-10"), att("SIC-SPE-08", "2024-01-10", { data_scadenza_calcolata: "2029-01-10" })]);
    expect(p).toEqual([]);
  });

  it("propone solo i ruoli del lavoratore: l'antincendio non assegnato non compare", () => {
    expect(codici(proponi(assegna("ADD-DAE"), [att("SIC-GEN-04", "2020-01-10"), att("SIC-SPE-08", "2024-01-10")]))).toEqual(["BLS-BAS-05"]);
  });

  it("un'attrezzatura del ruolo assegnato: base da svolgere", () => {
    const p = proponi(assegna("OPER-CAR-CP-II-8311"), [att("SIC-GEN-04", "2020-01-10"), att("SIC-SPE-08", "2024-01-10")]);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ motivo: "da-svolgere", dettaglio: "OPERATORE CARRIPONTE CP: da svolgere" });
    expect(p[0]!.corso.codice).toBe("LAV-CAR-CP-II-8311");
  });

  it("evidenza scaduta: propone l'aggiornamento (se c'è), prima dei corsi da svolgere", () => {
    const p = proponi(assegna("OPER-CAR-CP-II-8311", "ADD-DAE"), [
      att("SIC-GEN-04", "2020-01-10"),
      att("SIC-SPE-08", "2024-01-10"),
      att("LAV-CAR-CP-II-8311", "2019-05-02", { data_scadenza_calcolata: "2024-05-02" }),
    ]);
    expect(codici(p)).toEqual(["LAV-CAR-CP-II-8311-AGG", "BLS-BAS-05"]);
    expect(p[0]).toMatchObject({ motivo: "scaduto", dettaglio: "OPERATORE CARRIPONTE CP: scaduto il 2024-05-02" });
  });

  it("conta l'attestato più recente tra base e aggiornamento: base scaduto ma aggiornamento valido = a posto", () => {
    const p = proponi(assegna("OPER-CAR-CP-II-8311"), [
      att("SIC-GEN-04", "2020-01-10"),
      att("SIC-SPE-08", "2024-01-10"),
      att("LAV-CAR-CP-II-8311", "2015-05-02", { data_scadenza_calcolata: "2020-05-02" }),
      att("LAV-CAR-CP-II-8311-AGG", "2024-09-01", { data_scadenza_calcolata: "2029-09-01" }),
    ]);
    expect(p).toEqual([]);
  });

  it("ignora attestati non approvati e di altri lavoratori", () => {
    const p = proponi([], [att("SIC-GEN-04", "2020-01-10", { stato_validazione: "In attesa" }), att("SIC-SPE-08", "2024-01-10", { dipendente_id: "d2" })]);
    expect(codici(p)).toEqual(["SIC-GEN-04", "SIC-SPE-08"]);
  });

  it("dove la regola non è decisa (modulo, settore, livello…) non propone nulla", () => {
    expect(codici(proponi(assegna("ASPP"), [att("SIC-GEN-04", "2020-01-10"), att("SIC-SPE-08", "2024-01-10")]))).toEqual([]);
  });

  it("un corso previsto da più ruoli si propone una volta sola", () => {
    expect(codici(proponi(assegna("ADD-ANTINCENDIO"), [att("SIC-SPE-08", "2024-01-10")])).filter((c) => c === "SIC-GEN-04")).toHaveLength(1);
  });
});

/*
 * File:      calcolo-ciclo.test.ts
 * Percorso:  src/features/scadenze/calcolo-ciclo.test.ts
 * Data creazione: 2026-11-06
 * Revisioni:
 * - Rev 1 (2026-11-06 12:00): Test del motore di calcolo dei cicli formativi.
 * - Rev 2 (2026-11-07): Colore dei cicli con ore parziali, ore stimate negli eventi, annoMese.
 * - Rev 3 (2026-11-12): Tolleranza sul ritardo (Primo Soccorso: 4 mesi) e aggiungiMesi.
 */
import { describe, expect, it } from "vitest";
import {
  aggiungiAnni,
  aggiungiMesi,
  anniCompleti,
  annoMese,
  valutaCicloFormativo,
  type AttestatoCiclo,
} from "./calcolo-ciclo";

const base = (data: string, id = "base"): AttestatoCiclo => ({
  id,
  dataCorso: data,
  ore: 12,
  eBase: true,
});
const agg = (data: string, ore: number | null, id = data): AttestatoCiclo => ({
  id,
  dataCorso: data,
  ore,
  eBase: false,
});
const giorno = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const calcola = (attestati: AttestatoCiclo[], oggi: Date, extra = {}) =>
  valutaCicloFormativo({
    attestati,
    durataCicloAnni: 5,
    oreRichiesteAggiornamento: 6,
    oggi,
    ...extra,
  });

describe("esempio di riferimento (lavoratore, 6 ore ogni 5 anni)", () => {
  const att = [base("2018-09-15"), agg("2022-05-10", 4), agg("2023-01-20", 2)];

  it("dopo la prima tranche è incompleto e la scadenza non si sposta", () => {
    const r = calcola(att.slice(0, 2), giorno(2022, 6, 1));
    expect(r.stato).toBe("incompleto_ore");
    expect(r.oreAccumulate).toBe(4);
    expect(r.scadenzaEffettiva).toBe("2023-09-15");
  });

  it("dopo la seconda tranche è completo e la scadenza è il 15/09/2028", () => {
    const r = calcola(att, giorno(2023, 2, 1));
    expect(r.stato).toBe("valido");
    expect(r.oreAccumulate).toBe(0);
    expect(r.scadenzaEffettiva).toBe("2028-09-15");
    expect(r.dataUltimaEvidenza).toBe("2023-01-20");
  });

  it("oggi resta valido fino al 2028", () => {
    const r = calcola(att, giorno(2026, 11, 6));
    expect(r.stato).toBe("valido");
    expect(r.giorniAllaScadenza).toBeGreaterThan(90);
  });
});

describe("scadenze e stati", () => {
  it("senza aggiornamenti il ciclo passato risulta scaduto, non 'in regola'", () => {
    const r = calcola([base("2018-09-15")], giorno(2026, 11, 6));
    expect(r.stato).toBe("scaduto_sanabile");
    expect(r.scadenzaEffettiva).toBe("2023-09-15");
    expect(r.giorniAllaScadenza).toBeLessThan(0);
  });

  it("entro 90 giorni dalla scadenza è in scadenza", () => {
    const r = calcola([base("2018-09-15")], giorno(2023, 8, 1));
    expect(r.stato).toBe("in_scadenza");
    expect(r.giorniAllaScadenza).toBe(45);
  });

  it("il giorno stesso della scadenza non è ancora scaduto", () => {
    const r = calcola([base("2018-09-15")], giorno(2023, 9, 15));
    expect(r.stato).toBe("in_scadenza");
    expect(r.giorniAllaScadenza).toBe(0);
  });

  it("corso senza scadenza", () => {
    const r = valutaCicloFormativo({
      attestati: [base("2020-01-10")],
      durataCicloAnni: 0,
      oreRichiesteAggiornamento: 0,
      oggi: giorno(2026, 11, 6),
    });
    expect(r.stato).toBe("senza_scadenza");
    expect(r.scadenzaEffettiva).toBeNull();
  });

  it("con ore richieste = 0 basta un aggiornamento", () => {
    const r = calcola([base("2018-09-15"), agg("2022-01-10", null)], giorno(2023, 1, 1), {
      oreRichiesteAggiornamento: 0,
    });
    expect(r.scadenzaEffettiva).toBe("2028-09-15");
  });
});

describe("sanatoria tardiva", () => {
  const att = [base("2018-09-15"), agg("2024-01-10", 6)];

  it("un aggiornamento fatto dopo la scadenza sana lo scaduto", () => {
    const r = calcola(att, giorno(2026, 11, 6));
    expect(r.stato).toBe("valido");
    expect(r.scadenzaEffettiva).toBe("2033-09-15");
    expect(r.dataUltimaEvidenza).toBe("2024-01-10");
  });

  it("la seconda tranche tardiva completa il ciclo iniziato in tempo", () => {
    const r = calcola(
      [base("2018-09-15"), agg("2022-05-10", 4), agg("2024-01-10", 2)],
      giorno(2026, 11, 6),
    );
    expect(r.stato).toBe("valido");
    expect(r.scadenzaEffettiva).toBe("2033-09-15");
  });

  it("con consentiSanatoriaTardiva = false resta scaduto", () => {
    const r = calcola(att, giorno(2026, 11, 6), { consentiSanatoriaTardiva: false });
    expect(r.stato).toBe("scaduto_sanabile");
    expect(r.aggiornamentiIgnorati).toBe(1);
  });
});

describe("decadenza", () => {
  it("dopo 10 anni dal Base senza aggiornamenti è decaduto", () => {
    const r = calcola([base("2010-09-15")], giorno(2026, 11, 6));
    expect(r.stato).toBe("decaduto");
    expect(r.richiedeNuovoCorsoBase).toBe(true);
  });

  it("un aggiornamento dopo la decadenza non la sana", () => {
    const r = calcola([base("2010-09-15"), agg("2021-03-01", 6)], giorno(2026, 11, 6));
    expect(r.stato).toBe("decaduto");
    expect(r.aggiornamentiIgnorati).toBe(1);
  });

  it("il Base rifatto dopo la decadenza riparte da zero", () => {
    const r = calcola(
      [base("2010-09-15"), base("2022-06-01", "base2"), agg("2021-03-01", 6)],
      giorno(2026, 11, 6),
    );
    expect(r.stato).toBe("valido");
    expect(r.dataAncora).toBe("2022-06-01");
    expect(r.scadenzaEffettiva).toBe("2027-06-01");
  });

  it("senza decadenza (null) resta solo scaduto", () => {
    const r = calcola([base("2010-09-15")], giorno(2026, 11, 6), { decadenzaAnni: null });
    expect(r.stato).toBe("scaduto_sanabile");
  });
});

describe("ore", () => {
  it("le ore in eccesso non si riportano al ciclo successivo", () => {
    const r = calcola(
      [base("2018-09-15"), agg("2019-01-10", 8), agg("2024-05-01", 4)],
      giorno(2024, 6, 1),
    );
    // 8h completano il ciclo 1 (6 richieste): 2h in eccesso perse. Nel ciclo 2: solo 4h.
    expect(r.oreAccumulate).toBe(4);
    expect(r.stato).toBe("incompleto_ore");
    expect(r.scadenzaEffettiva).toBe("2028-09-15");
  });

  it("un aggiornamento in più nello stesso ciclo già coperto è ignorato", () => {
    const r = calcola(
      [base("2018-09-15"), agg("2019-01-10", 6), agg("2020-01-10", 6)],
      giorno(2021, 1, 1),
    );
    expect(r.aggiornamentiIgnorati).toBe(1);
    expect(r.scadenzaEffettiva).toBe("2028-09-15");
  });

  it("ore mancanti vengono segnalate da verificare e non contate", () => {
    const r = calcola([base("2018-09-15"), agg("2022-05-10", null)], giorno(2023, 1, 1));
    expect(r.oreDaVerificare).toBe(true);
    expect(r.oreAccumulate).toBe(0);
    expect(r.scadenzaEffettiva).toBe("2023-09-15");
  });

  it("aggiornamenti con data futura non contano", () => {
    const r = calcola([base("2018-09-15"), agg("2030-01-01", 6)], giorno(2026, 11, 6));
    expect(r.aggiornamentiIgnorati).toBe(1);
    expect(r.stato).toBe("scaduto_sanabile");
  });
});

describe("date", () => {
  it("29 febbraio in anno non bisestile diventa 28 febbraio", () => {
    expect(aggiungiAnni("2020-02-29", 5)).toBe("2025-02-28");
    expect(aggiungiAnni("2024-02-29", 4)).toBe("2028-02-29");
  });

  it("i cicli sono calcolati dall'ancora, senza errore cumulato", () => {
    const r = calcola([base("2020-02-29")], giorno(2031, 1, 1));
    expect(r.scadenzaEffettiva).toBe("2025-02-28");
    const r2 = calcola(
      [base("2020-02-29"), agg("2024-06-01", 6), agg("2029-06-01", 6)],
      giorno(2030, 1, 1),
    );
    expect(r2.scadenzaEffettiva).toBe("2035-02-28");
  });

  it("anniCompleti", () => {
    expect(anniCompleti("2018-09-15", "2026-09-14")).toBe(7);
    expect(anniCompleti("2018-09-15", "2026-09-15")).toBe(8);
  });
});

describe("cicli ed eventi per la linea temporale", () => {
  const stati = (r: ReturnType<typeof calcola>) => r.cicli.map((c) => c.stato);
  const tipi = (r: ReturnType<typeof calcola>) => r.eventi.map((e) => e.tipo);

  it("prima tranche: ciclo 1 da completare (4/6) e ciclo 2 non attivo", () => {
    const r = calcola([base("2018-09-15"), agg("2022-05-10", 4)], giorno(2022, 6, 1));
    expect(stati(r)).toEqual(["da_completare", "futuro"]);
    expect(r.cicli[0]!.oreAccumulate).toBe(4);
    expect(r.cicli[0]!.attivo).toBe(true);
    expect(tipi(r)).toEqual(["base", "parziale"]);
  });

  it("somma raggiunta: ciclo 1 verde e ciclo successivo nero", () => {
    const r = calcola(
      [base("2018-09-15"), agg("2022-05-10", 4), agg("2023-01-20", 2)],
      giorno(2023, 2, 1),
    );
    expect(stati(r)).toEqual(["completato", "futuro"]);
    expect(tipi(r)).toEqual(["base", "parziale", "completo"]);
    expect(r.cicli[1]!.inizio).toBe("2023-09-15");
    expect(r.cicli[1]!.fine).toBe("2028-09-15");
  });

  it("anche più ore del necessario rendono il ciclo verde", () => {
    const r = calcola([base("2018-09-15"), agg("2020-03-01", 10)], giorno(2021, 1, 1));
    expect(stati(r)).toEqual(["completato", "futuro"]);
  });

  it("nel ciclo successivo arancione (0/6), poi il ciclo dopo nero", () => {
    const r = calcola(
      [base("2018-09-15"), agg("2022-05-10", 4), agg("2023-01-20", 2)],
      giorno(2026, 11, 6),
    );
    expect(stati(r)).toEqual(["completato", "da_completare", "futuro"]);
    expect(r.cicli[1]!.attivo).toBe(true);
    expect(r.cicli[1]!.oreAccumulate).toBe(0);
    expect(r.cicli[2]!.inizio).toBe("2028-09-15");
  });

  it("ciclo scaduto senza aggiornamenti: rosso, poi arancione e nero", () => {
    const r = calcola([base("2018-09-15")], giorno(2026, 11, 6));
    expect(stati(r)).toEqual(["scaduto", "da_completare", "futuro"]);
    expect(r.cicli[0]!.attivo).toBe(true);
    expect(r.cicli[1]!.attivo).toBe(false);
  });

  it("arancione con ore parziali anche a ciclo concluso: mostra le ore già fatte", () => {
    const r = calcola([base("2018-09-15"), agg("2022-05-10", 4)], giorno(2024, 6, 1));
    expect(stati(r)).toEqual(["da_completare", "da_completare", "futuro"]);
    expect(r.cicli[0]!.oreAccumulate).toBe(4);
  });

  it("sanatoria tardiva: da rosso a verde, il ciclo dopo è nero", () => {
    const r = calcola([base("2018-09-15"), agg("2024-01-10", 6)], giorno(2026, 11, 6));
    expect(stati(r)).toEqual(["completato", "completato", "futuro"]);
    expect(r.cicli[2]!.inizio).toBe("2028-09-15");
    expect(r.cicli[2]!.attivo).toBe(true);
  });

  it("secondo ciclo: un aggiornamento parziale non è 'completo' per le ore del ciclo precedente", () => {
    const r = calcola(
      [base("2018-09-15"), agg("2019-01-10", 6), agg("2024-05-01", 4)],
      giorno(2024, 6, 1),
    );
    expect(tipi(r)).toEqual(["base", "completo", "parziale"]);
    expect(stati(r)).toEqual(["completato", "da_completare", "futuro"]);
    expect(r.cicli[1]!.oreAccumulate).toBe(4);
  });

  it("aggiornamenti non contati sono eventi 'ignorato' con il motivo", () => {
    const inEccesso = calcola(
      [base("2018-09-15"), agg("2019-01-10", 6), agg("2020-01-10", 6)],
      giorno(2021, 1, 1),
    );
    expect(inEccesso.eventi[2]).toMatchObject({ tipo: "ignorato", motivo: "in_eccesso" });

    const futuro = calcola([base("2018-09-15"), agg("2030-01-01", 6)], giorno(2026, 11, 6));
    expect(futuro.eventi[1]).toMatchObject({ tipo: "ignorato", motivo: "futuro" });

    const tardivo = calcola([base("2018-09-15"), agg("2024-01-10", 6)], giorno(2026, 11, 6), {
      consentiSanatoriaTardiva: false,
    });
    expect(tardivo.eventi[1]).toMatchObject({ tipo: "ignorato", motivo: "tardivo_non_ammesso" });
  });

  it("decadenza: i cicli dopo la data di decadenza sono bordeaux e non c'è ciclo futuro", () => {
    const r = calcola([base("2010-09-15"), agg("2021-03-01", 6)], giorno(2026, 11, 6));
    expect(stati(r)).toEqual(["scaduto", "scaduto", "decaduto", "decaduto"]);
    expect(r.eventi[1]).toMatchObject({ tipo: "ignorato", motivo: "decaduto" });
  });

  it("espone durata, data di valutazione e continuità tra i cicli", () => {
    const r = calcola([base("2020-02-29")], giorno(2031, 1, 1));
    expect(r.durataCicloAnni).toBe(5);
    expect(r.dataValutazione).toBe("2031-01-01");
    for (let i = 1; i < r.cicli.length; i++) {
      expect(r.cicli[i]!.inizio).toBe(r.cicli[i - 1]!.fine);
    }
  });

  it("corso senza scadenza: nessuna linea", () => {
    const r = valutaCicloFormativo({
      attestati: [base("2020-01-10")],
      durataCicloAnni: 0,
      oreRichiesteAggiornamento: 0,
      oggi: giorno(2026, 11, 6),
    });
    expect(r.cicli).toEqual([]);
    expect(r.eventi).toEqual([]);
  });
});

describe("regime transitorio Preposti (taglio 19/05/2026, ciclo biennale)", () => {
  const REGIME = { dataTaglio: "2026-05-19", dataSogliaEvidenza: "2023-05-19", cicloVecchioAnni: 5 };
  const prep = (attestati: AttestatoCiclo[], oggi: Date) =>
    calcola(attestati, oggi, { durataCicloAnni: 2, oreRichiesteAggiornamento: 6, regimeTransitorio: REGIME });

  it("Base pre-2023 senza aggiornamento: scadenza tassativa 19/05/2026, scaduto oggi", () => {
    const r = prep([base("2022-03-10")], giorno(2026, 11, 6));
    expect(r.scadenzaEffettiva).toBe("2026-05-19");
    expect(r.scadenzaPortataAlTaglio).toBe(true);
    expect(r.motivoScadenza).toContain("19/05/2026");
    expect(r.stato).toBe("scaduto_sanabile");
    expect(r.regolaPreposti).toBe(true);
  });

  it("prima del taglio lo stesso preposto è ancora in regola (fino al 19/05/2026)", () => {
    const r = prep([base("2022-03-10")], giorno(2026, 1, 15));
    expect(r.scadenzaEffettiva).toBe("2026-05-19");
    expect(r.stato).toBe("valido");
  });

  it("la scadenza naturale quinquennale più lontana viene anticipata al taglio", () => {
    // 2022-03-10 + 5 anni = 2027-03-10, ma il ciclo è troncato al 19/05/2026
    const r = prep([base("2022-03-10")], giorno(2025, 6, 1));
    expect(r.scadenzaEffettiva).toBe("2026-05-19");
  });

  it("ciclo vecchio troncato e cicli successivi biennali dal taglio", () => {
    const r = prep([base("2022-03-10")], giorno(2026, 11, 6));
    const [c1, c2, c3] = r.cicli;
    expect(c1?.fine).toBe("2026-05-19");
    expect(c1?.troncato).toBe(true);
    expect(c1?.stato).toBe("scaduto");
    expect(c2?.inizio).toBe("2026-05-19");
    expect(c2?.fine).toBe("2028-05-19");
    expect(c3?.fine).toBe("2030-05-19");
    expect(c3?.stato).toBe("futuro");
  });

  it("aggiornamento entro il taglio: nuovo ciclo biennale, scadenza 19/05/2028", () => {
    const r = prep([base("2022-03-10"), agg("2026-02-01", 6)], giorno(2026, 11, 6));
    expect(r.scadenzaEffettiva).toBe("2028-05-19");
    expect(r.scadenzaPortataAlTaglio).toBe(false);
    expect(r.motivoScadenza).toBeNull();
    expect(r.stato).toBe("valido");
  });

  it("vecchio regime con più cicli: Base 2018 + aggiornamento 2020 copre il ciclo 1, il ciclo 2 è troncato al taglio", () => {
    const r = prep([base("2018-01-10"), agg("2020-06-01", 6)], giorno(2026, 11, 6));
    expect(r.cicli[0]?.fine).toBe("2023-01-10");
    expect(r.cicli[0]?.stato).toBe("completato");
    expect(r.cicli[1]?.fine).toBe("2026-05-19");
    expect(r.cicli[1]?.troncato).toBe(true);
    expect(r.scadenzaEffettiva).toBe("2026-05-19");
    expect(r.stato).toBe("scaduto_sanabile");
  });

  it("sanatoria tardiva dopo il taglio: l'aggiornamento copre il ciclo in corso", () => {
    const r = prep([base("2022-03-10"), agg("2026-08-01", 6)], giorno(2026, 11, 6));
    expect(r.cicli.find((c) => c.indice === 1)?.stato).toBe("completato");
    expect(r.scadenzaPortataAlTaglio).toBe(false);
    expect(r.stato).toBe("valido");
  });

  it("aggiornamento parziale (3 ore) entro il taglio non basta", () => {
    const r = prep([base("2022-03-10"), agg("2026-02-01", 3)], giorno(2026, 11, 6));
    expect(r.scadenzaEffettiva).toBe("2026-05-19");
    expect(r.oreAccumulate).toBe(3);
  });

  it("Base dopo la soglia (2024): nessun transitorio, cicli biennali dall'ancora", () => {
    const r = prep([base("2024-02-01")], giorno(2026, 11, 6));
    expect(r.scadenzaEffettiva).toBe("2026-02-01");
    expect(r.scadenzaPortataAlTaglio).toBe(false);
    expect(r.dataTaglio).toBeNull();
    expect(r.stato).toBe("scaduto_sanabile");
  });

  it("Base 2015 mai aggiornato: decaduto (oltre 10 anni)", () => {
    const r = prep([base("2015-01-10")], giorno(2026, 11, 6));
    expect(r.stato).toBe("decaduto");
    expect(r.richiedeNuovoCorsoBase).toBe(true);
  });

  it("senza regime il comportamento non cambia", () => {
    const r = calcola([base("2022-03-10")], giorno(2026, 11, 6), { durataCicloAnni: 2 });
    expect(r.scadenzaEffettiva).toBe("2024-03-10");
    expect(r.regolaPreposti).toBe(false);
    expect(r.motivoScadenza).toBeNull();
  });
});

describe("record storici senza data", () => {
  it("attestato con data mancante o non valida viene scartato senza errori", () => {
    const rotto = { id: "x", dataCorso: undefined as unknown as string, ore: 4, eBase: false };
    const vuoto = { id: "y", dataCorso: "", ore: 4, eBase: false };
    const r = calcola([base("2022-03-10"), rotto, vuoto], giorno(2026, 11, 6));
    expect(r.scadenzaEffettiva).toBe("2027-03-10");
  });

  it("solo attestati senza data: richiede il Corso Base, nessun errore", () => {
    const rotto = { id: "x", dataCorso: "", ore: 4, eBase: false };
    const r = calcola([rotto], giorno(2026, 11, 6));
    expect(r.stato).toBe("decaduto");
    expect(r.richiedeNuovoCorsoBase).toBe(true);
  });
});

describe("colore dei cicli sulla linea (verde / arancione / rosso)", () => {
  it("ciclo concluso senza alcun aggiornamento: scaduto (rosso)", () => {
    const r = calcola([base("2018-09-15")], giorno(2024, 6, 1));
    expect(r.cicli[0]!.stato).toBe("scaduto");
    expect(r.cicli[0]!.parzialiNelCiclo).toBe(0);
  });
  it("ciclo concluso con ore parziali: da completare (arancione), non rosso", () => {
    const r = calcola([base("2018-09-15"), agg("2022-05-10", 4)], giorno(2024, 6, 1));
    expect(r.cicli[0]!.stato).toBe("da_completare");
    expect(r.cicli[0]!.oreNelCiclo).toBe(4);
    expect(r.cicli[0]!.parzialiNelCiclo).toBe(1);
    // il calcolo della scadenza non cambia: il ciclo resta scaduto per la conformità
    expect(r.stato).toBe("scaduto_sanabile");
    expect(r.scadenzaEffettiva).toBe("2023-09-15");
  });
  it("ciclo coperto completando le ore: completato (verde)", () => {
    const r = calcola([base("2018-09-15"), agg("2022-05-10", 4), agg("2023-01-20", 2)], giorno(2024, 6, 1));
    expect(r.cicli[0]!.stato).toBe("completato");
  });
  it("ciclo in corso senza aggiornamenti: da completare (arancione); il successivo: non attivo", () => {
    const r = calcola([base("2022-03-24")], giorno(2026, 11, 7), { durataCicloAnni: 3, oreRichiesteAggiornamento: 4 });
    expect(r.cicli.map((c) => c.stato)).toEqual(["scaduto", "da_completare", "futuro"]);
  });
  it("le ore parziali contano nel ciclo in cui cade la data del corso", () => {
    const r = calcola([base("2018-09-15"), agg("2024-02-01", 2)], giorno(2026, 11, 7));
    expect(r.cicli[0]!.parzialiNelCiclo).toBe(0);
    expect(r.cicli[0]!.stato).toBe("scaduto");
    expect(r.cicli[1]!.oreNelCiclo).toBe(2);
  });
});

describe("eventi: ore stimate e formato AA-MM", () => {
  it("annoMese usa l'anno a due cifre", () => {
    expect(annoMese("2022-03-24")).toBe("22-03");
    expect(annoMese("2009-11-05")).toBe("09-11");
  });
  it("le ore stimate arrivano agli eventi (base e aggiornamenti)", () => {
    const r = calcola(
      [{ ...base("2018-09-15"), oreStimate: true }, { ...agg("2022-05-10", 4), oreStimate: true }, agg("2023-01-20", 2)],
      giorno(2024, 6, 1),
    );
    expect(r.eventi.map((e) => e.oreStimate === true)).toEqual([true, true, false]);
  });
});

describe("tolleranza sul ritardo (Primo Soccorso: ciclo 3 anni, 4 ore, 4 mesi)", () => {
  const ps = (attestati: AttestatoCiclo[], oggi: Date) =>
    calcola(attestati, oggi, { durataCicloAnni: 3, oreRichiesteAggiornamento: 4, tolleranzaRitardoMesi: 4 });
  const b = base("2020-01-10");

  it("aggiungiMesi riduce il giorno all'ultimo del mese", () => {
    expect(aggiungiMesi("2023-01-31", 1)).toBe("2023-02-28");
    expect(aggiungiMesi("2024-01-31", 1)).toBe("2024-02-29");
    expect(aggiungiMesi("2023-01-10", 4)).toBe("2023-05-10");
    expect(aggiungiMesi("2023-11-30", 4)).toBe("2024-03-30");
  });

  it("aggiornamento in tempo: la scadenza passa al ciclo dopo", () => {
    const r = ps([b, agg("2022-12-01", 4)], giorno(2024, 6, 1));
    expect(r.stato).toBe("valido");
    expect(r.scadenzaEffettiva).toBe("2026-01-10");
    expect(r.decadutoPerRitardo).toBe(false);
  });

  it("aggiornamento entro 4 mesi dalla scadenza: sana il ciclo e la scadenza resta ancorata al Base", () => {
    const r = ps([b, agg("2023-05-10", 4)], giorno(2024, 6, 1));
    expect(r.stato).toBe("valido");
    expect(r.scadenzaEffettiva).toBe("2026-01-10"); // non 2029: l'aggiornamento tardivo non sposta le scadenze successive
    expect(r.eventi[1]).toMatchObject({ tipo: "completo" });
  });

  it("aggiornamento oltre 4 mesi: non conta e decade tutto (rifare il corso base)", () => {
    const r = ps([b, agg("2023-05-11", 4)], giorno(2024, 6, 1));
    expect(r.eventi[1]).toMatchObject({ tipo: "ignorato", motivo: "oltre_tolleranza" });
    expect(r.stato).toBe("decaduto");
    expect(r.decadutoPerRitardo).toBe(true);
    expect(r.richiedeNuovoCorsoBase).toBe(true);
    expect(r.limiteRecupero).toBe("2023-05-10");
  });

  it("scaduto ma ancora recuperabile fino al limite, poi decaduto", () => {
    const dentro = ps([b], giorno(2023, 3, 1));
    expect(dentro.stato).toBe("scaduto_sanabile");
    expect(dentro.limiteRecupero).toBe("2023-05-10");
    expect(dentro.richiedeNuovoCorsoBase).toBe(false);
    expect(ps([b], giorno(2023, 5, 10)).stato).toBe("scaduto_sanabile"); // l'ultimo giorno utile
    const fuori = ps([b], giorno(2023, 5, 11));
    expect(fuori.stato).toBe("decaduto");
    expect(fuori.decadutoPerRitardo).toBe(true);
  });

  it("un nuovo Base dopo la decadenza riparte da zero", () => {
    const r = ps([b, agg("2023-09-01", 4), base("2023-10-02", "base2")], giorno(2024, 6, 1));
    expect(r.stato).toBe("valido");
    expect(r.dataAncora).toBe("2023-10-02");
    expect(r.scadenzaEffettiva).toBe("2026-10-02");
    expect(r.decadutoPerRitardo).toBe(false);
  });

  it("senza tolleranza resta la sanatoria illimitata (comportamento degli altri corsi)", () => {
    const r = calcola([base("2020-01-10"), agg("2024-02-01", 6)], giorno(2024, 6, 1), { durataCicloAnni: 5 });
    expect(r.decadutoPerRitardo).toBe(false);
    expect(r.eventi[1]).toMatchObject({ tipo: "completo" });
  });
});

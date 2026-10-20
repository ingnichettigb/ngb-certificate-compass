/*
 * Test di "fotografia" delle funzioni pure di @/lib/api.
 * Descrivono il comportamento ATTUALE: servono a verificare che la suddivisione
 * del file in più moduli non cambi nulla. Importano sempre da "@/lib/api".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  cartellaDipendente,
  etichettaSottoreparto,
  etichettaStato,
  formatData,
  INCARICHI,
  nomeFilePdf,
  normalizzaNome,
  pulisciCF,
  repartoLeggibile,
  riepilogoIncarichi,
  scadenzaBadgeClass,
  scaduto,
  statoBadgeClass,
  statoScadenza,
  type Attestato,
  type Dipendente,
} from "@/lib/api";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("formattazione", () => {
  it("formatData: null/vuoto -> trattino", () => {
    expect(formatData(null)).toBe("—");
    expect(formatData(undefined)).toBe("—");
    expect(formatData("")).toBe("—");
  });
  it("formatData: converte AAAA-MM-GG in GG/MM/AAAA, ignorando l'ora", () => {
    expect(formatData("2026-03-15")).toBe("15/03/2026");
    expect(formatData("2026-03-15T10:30:00Z")).toBe("15/03/2026");
  });
  it("statoBadgeClass: una classe per stato, default = in attesa", () => {
    expect(statoBadgeClass("Approvato")).toContain("text-success");
    expect(statoBadgeClass("Respinto")).toContain("text-destructive");
    expect(statoBadgeClass("In attesa")).toContain("text-warning");
    expect(statoBadgeClass("qualunque")).toContain("text-warning");
  });
});

describe("scadenze", () => {
  it("scaduto", () => {
    expect(scaduto(null)).toBe(false);
    expect(scaduto("2026-10-19")).toBe(true);
    expect(scaduto("2026-10-21")).toBe(false);
  });
  it("statoScadenza: senza data = valido", () => {
    expect(statoScadenza(null)).toBe("valido");
    expect(statoScadenza(undefined)).toBe("valido");
  });
  it("statoScadenza: passata = scaduto", () => {
    expect(statoScadenza("2026-10-19")).toBe("scaduto");
  });
  it("statoScadenza: entro 90 giorni = in-scadenza", () => {
    expect(statoScadenza("2026-10-21")).toBe("in-scadenza");
    expect(statoScadenza("2027-01-18")).toBe("in-scadenza");
  });
  it("statoScadenza: oltre 90 giorni = valido", () => {
    expect(statoScadenza("2027-01-25")).toBe("valido");
    expect(statoScadenza("2030-01-01")).toBe("valido");
  });
  it("etichette e classi dello stato scadenza", () => {
    expect(etichettaStato("scaduto")).toBe("Scaduto");
    expect(etichettaStato("in-scadenza")).toBe("In scadenza");
    expect(etichettaStato("valido")).toBe("Valido");
    expect(etichettaStato("mancante")).toBe("Mancante");
    expect(scadenzaBadgeClass("scaduto")).toContain("text-destructive");
    expect(scadenzaBadgeClass("in-scadenza")).toContain("text-warning");
    expect(scadenzaBadgeClass("valido")).toContain("text-success");
    expect(scadenzaBadgeClass("mancante")).toContain("text-muted-foreground");
  });
});

describe("normalizzazione testi e nomi file", () => {
  it("normalizzaNome: maiuscolo, senza accenti, underscore", () => {
    expect(normalizzaNome("Dell'Orto Àngelo")).toBe("DELL_ORTO_ANGELO");
    expect(normalizzaNome("  de  Rossi  ")).toBe("DE_ROSSI");
    expect(normalizzaNome("Primo Soccorso")).toBe("PRIMO_SOCCORSO");
  });
  it("pulisciCF: solo lettere e numeri, maiuscolo", () => {
    expect(pulisciCF(" rssmra80a01 h501u ")).toBe("RSSMRA80A01H501U");
    expect(pulisciCF("")).toBe("");
    expect(pulisciCF(undefined as unknown as string)).toBe("");
  });
  it("nomeFilePdf: con codice fiscale", () => {
    expect(nomeFilePdf("Rossi", "Mario", "Antincendio", "2026-03-15", "rssmra80a01h501u")).toBe(
      "2026-03_ROSSI_MARIO_RSSMRA80A01H501U_ANTINCENDIO.pdf",
    );
  });
  it("nomeFilePdf: senza codice fiscale e senza data", () => {
    expect(nomeFilePdf("Rossi", "Mario", "Preposto", "")).toBe(
      "ANNO-MANCANTE_ROSSI_MARIO_PREPOSTO.pdf",
    );
    expect(nomeFilePdf("Rossi", "Mario", "Preposto", "2026")).toBe(
      "ANNO-MANCANTE_ROSSI_MARIO_PREPOSTO.pdf",
    );
  });
  it("cartellaDipendente", () => {
    const d = { cognome: "Dell'Orto", nome: "Anna Maria", codice_fiscale: "dllnmr80a41h501x" };
    expect(cartellaDipendente(d as Dipendente)).toBe("DELL_ORTO_ANNA_MARIA_DLLNMR80A41H501X");
  });
});

describe("reparti", () => {
  it("etichettaSottoreparto", () => {
    expect(etichettaSottoreparto({ codice: "AA", nome: "Assistente amministrativo" })).toBe(
      "AA — Assistente amministrativo",
    );
    expect(etichettaSottoreparto({ codice: null, nome: "Altro" })).toBe("Altro");
  });
  it("repartoLeggibile: scarta vuoti, date da Excel e testi troppo lunghi", () => {
    expect(repartoLeggibile("Docente")).toBe(true);
    expect(repartoLeggibile("  ATA ")).toBe(true);
    expect(repartoLeggibile("")).toBe(false);
    expect(repartoLeggibile("   ")).toBe(false);
    expect(repartoLeggibile(null)).toBe(false);
    expect(repartoLeggibile(undefined)).toBe(false);
    expect(repartoLeggibile("45123")).toBe(false);
    expect(repartoLeggibile("x".repeat(41))).toBe(false);
    expect(repartoLeggibile("x".repeat(40))).toBe(true);
  });
});

function att(categoria: string, livello: string, dataCorso: string, scadenza: string | null) {
  return {
    id: `${categoria}-${livello}-${dataCorso}`,
    data_corso: dataCorso,
    data_scadenza_calcolata: scadenza,
    tipi_corso: { macro_categoria: categoria, livello_specifico: livello },
  } as unknown as Attestato;
}

describe("riepilogoIncarichi", () => {
  it("senza attestati: tutti gli incarichi sono mancanti e non ricoperti", () => {
    const r = riepilogoIncarichi([]);
    expect(r).toHaveLength(INCARICHI.length);
    for (const x of r) {
      expect(x.ricoperto).toBe(false);
      expect(x.peggiore).toBe("mancante");
      expect(x.voci.every((v) => v.stato === "mancante" && v.attestato === null)).toBe(true);
    }
  });
  it("una voce valida: incarico ricoperto, peggiore = valido, le altre voci restano mancanti", () => {
    const r = riepilogoIncarichi([att("Antincendio", "Base", "2025-01-10", "2030-01-10")]);
    const antincendio = r.find((x) => x.incarico.key === "antincendio")!;
    expect(antincendio.ricoperto).toBe(true);
    expect(antincendio.peggiore).toBe("valido");
    expect(antincendio.voci.map((v) => v.stato)).toEqual(["valido", "mancante"]);
  });
  it("il peggiore tra le voci presenti vince (scaduto > in-scadenza > valido)", () => {
    const r = riepilogoIncarichi([
      att("Primo Soccorso", "Base", "2020-01-01", "2030-01-01"),
      att("Primo Soccorso", "Aggiornamento", "2023-01-01", "2026-01-01"),
    ]);
    const ps = r.find((x) => x.incarico.key === "primo-soccorso")!;
    expect(ps.peggiore).toBe("scaduto");
  });
  it("a parità di livello sceglie l'attestato col corso più recente", () => {
    const r = riepilogoIncarichi([
      att("Preposto", "Specifico", "2021-05-01", "2026-05-01"),
      att("Preposto", "Specifico", "2025-05-01", "2030-05-01"),
    ]);
    const preposto = r.find((x) => x.incarico.key === "preposto")!;
    expect(preposto.voci[0]!.attestato?.data_corso).toBe("2025-05-01");
    expect(preposto.voci[0]!.stato).toBe("valido");
  });
});

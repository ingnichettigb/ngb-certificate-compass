/*
 * File:          ditta.test.ts
 * Percorso:      src/lib/api/ditta.test.ts
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 14:00): Dati per le email dal database, importazione una tantum dei dati del browser (senza mai
 *     sovrascrivere dati già personalizzati), conteggio dei lavoratori in forza e chiavi di cache condivise.
 *   rev 2 — 12/11/2026 06:53 — Verifica persistenza e cancellazione del logo aziendale.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { stato } = vi.hoisted(() => ({
  stato: {
    riga: null as Record<string, unknown> | null,
    scritture: [] as Record<string, unknown>[],
    errore: null as string | null,
    conteggio: 0,
    filtriConteggio: [] as unknown[],
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (tabella: string) => ({
      select: (_c?: string, opzioni?: { count?: string; head?: boolean }) => ({
        eq: (colonna: string, valore: unknown) => {
          if (opzioni?.head) {
            stato.filtriConteggio.push([tabella, colonna, valore]);
            return Promise.resolve({ count: stato.conteggio, error: null });
          }
          return {
            maybeSingle: async () =>
              stato.errore
                ? { data: null, error: { message: stato.errore } }
                : { data: stato.riga, error: null },
          };
        },
      }),
      upsert: (valori: Record<string, unknown>) => {
        stato.scritture.push(valori);
        return {
          select: () => ({
            single: async () => ({ data: { ...(stato.riga ?? {}), ...valori }, error: null }),
          }),
        };
      },
    }),
  },
}));

import {
  CHIAVE_DITTA,
  CHIAVE_LAVORATORI_IN_FORZA,
  CHIAVE_SOGLIE_DITTA,
  DITTA_DEFAULT,
  calcolaImportazione,
  contaLavoratoriInForza,
  dittaADatiAzienda,
  getDatiAzienda,
  importaDatiDalBrowserUnaVolta,
  salvaDitta,
  getDitta,
} from "./ditta";
import { DATI_AZIENDA_DEFAULT, STORAGE_KEY } from "@/lib/dati-azienda";

beforeEach(() => {
  stato.riga = null;
  stato.scritture = [];
  stato.errore = null;
  stato.conteggio = 0;
  stato.filtriConteggio = [];
  localStorage.clear();
});

describe("chiavi di cache", () => {
  it("salva e rilegge il logo insieme all'anagrafica", async () => {
    const logo = "data:image/png;base64,iVBORw==";
    const salvata = await salvaDitta({ ragione_sociale: "Istituto prova", logo_data_url: logo });
    stato.riga = salvata;
    expect((await getDitta()).logo_data_url).toBe(logo);
    expect(stato.scritture[0]).toMatchObject({ logo_data_url: logo });
  });
  it("la cancellazione salva null senza toccare il nome aziendale", async () => {
    stato.riga = { ...DITTA_DEFAULT, ragione_sociale: "Istituto prova", logo_data_url: "data:image/png;base64,iVBORw==" };
    const salvata = await salvaDitta({ logo_data_url: null });
    expect(salvata.logo_data_url).toBeNull();
    expect(salvata.ragione_sociale).toBe("Istituto prova");
  });
  it("sono quelle usate dalla scheda Ditta, così gli avvisi in testata si aggiornano appena si salva", () => {
    expect(CHIAVE_DITTA).toEqual(["ditta_anagrafica"]);
    expect(CHIAVE_SOGLIE_DITTA).toEqual(["soglie_ditta"]);
    expect(CHIAVE_LAVORATORI_IN_FORZA).toEqual(["lavoratori-in-forza"]);
  });
});

describe("lavoratori in forza", () => {
  it("conta solo i lavoratori in forza (esclusi i cessati)", async () => {
    stato.conteggio = 47;
    expect(await contaLavoratoriInForza()).toBe(47);
    expect(stato.filtriConteggio).toEqual([["dipendenti", "stato_lavoratore", "in_forza"]]);
  });
});

describe("dati per le email dal database", () => {
  it("mappa le colonne del database sui campi usati dalla firma", () => {
    const d = dittaADatiAzienda({
      ragione_sociale: "Studio Rossi",
      referente: "Anna Rossi",
      email: "a@r.it",
      telefono: "0374 1",
      indirizzo: "Via Roma 1",
      cap: "26100",
      comune: "Cremona",
      provincia: "CR",
      email_mittente_resend: "n@r.it",
    });
    expect(d).toEqual({
      nomeAzienda: "Studio Rossi",
      referente: "Anna Rossi",
      email: "a@r.it",
      telefono: "0374 1",
      via: "Via Roma 1",
      cap: "26100",
      comune: "Cremona",
      provincia: "CR",
      emailMittenteResend: "n@r.it",
    });
  });
  it("senza riga nel database usa i valori predefiniti", () => {
    expect(dittaADatiAzienda(null)).toEqual(DATI_AZIENDA_DEFAULT);
  });
  it("legge dal database", async () => {
    stato.riga = { ...DITTA_DEFAULT, ragione_sociale: "Dal database", codici_ateco: [] };
    expect((await getDatiAzienda()).nomeAzienda).toBe("Dal database");
  });
  it("se il database non risponde ripiega sui dati del browser", async () => {
    stato.errore = "rete assente";
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nomeAzienda: "Dal browser" }));
    expect((await getDatiAzienda()).nomeAzienda).toBe("Dal browser");
  });
});

describe("importazione dal browser", () => {
  const db = { ...DITTA_DEFAULT, email: null, telefono: null, indirizzo: null };

  it("copia solo i campi compilati nel browser dove il database ha ancora il predefinito o niente", () => {
    const locale = {
      ...DATI_AZIENDA_DEFAULT,
      nomeAzienda: "Studio Tecnico X",
      email: "info@x.it",
      telefono: "0374 5",
      via: "Via Dante 3",
    };
    expect(calcolaImportazione(locale, db)).toEqual({
      ragione_sociale: "Studio Tecnico X",
      email: "info@x.it",
      telefono: "0374 5",
      indirizzo: "Via Dante 3",
    });
  });
  it("non sovrascrive mai un dato già personalizzato nel database", () => {
    const locale = { ...DATI_AZIENDA_DEFAULT, nomeAzienda: "Vecchio nome", email: "vecchia@x.it" };
    expect(
      calcolaImportazione(locale, { ...db, ragione_sociale: "Nome nuovo", email: "nuova@x.it" }),
    ).toEqual({});
  });
  it("se il browser ha solo i valori predefiniti non c'è nulla da copiare", () => {
    expect(calcolaImportazione(DATI_AZIENDA_DEFAULT, db)).toEqual({});
  });

  it("senza dati nel browser non tocca il database", async () => {
    expect(await importaDatiDalBrowserUnaVolta()).toBe(false);
    expect(stato.scritture).toEqual([]);
  });
  it("scrive una volta sola e poi non ripete", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DATI_AZIENDA_DEFAULT, email: "info@x.it" }),
    );
    stato.riga = { ...db, codici_ateco: [] };
    expect(await importaDatiDalBrowserUnaVolta()).toBe(true);
    expect(stato.scritture).toHaveLength(1);
    expect(stato.scritture[0]).toMatchObject({ email: "info@x.it", id: true });
    expect(await importaDatiDalBrowserUnaVolta()).toBe(false);
    expect(stato.scritture).toHaveLength(1);
  });
  it("se il database non risponde non segna l'importazione come fatta", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DATI_AZIENDA_DEFAULT, email: "info@x.it" }),
    );
    stato.errore = "rete assente";
    expect(await importaDatiDalBrowserUnaVolta()).toBe(false);
    stato.errore = null;
    stato.riga = { ...db, codici_ateco: [] };
    expect(await importaDatiDalBrowserUnaVolta()).toBe(true);
  });
});

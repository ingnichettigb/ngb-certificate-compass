/*
 * File:          ditta.test.ts
 * Percorso:      src/lib/api/ditta.test.ts
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 12:30): Dati per le email dal database, importazione una tantum dei dati del browser (senza mai
 *     sovrascrivere dati già personalizzati) e conversione del modulo in campi da salvare.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { stato } = vi.hoisted(() => ({
  stato: {
    riga: null as Record<string, unknown> | null,
    scritture: [] as unknown[],
    errore: null as string | null,
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            stato.errore
              ? { data: null, error: { message: stato.errore } }
              : { data: stato.riga, error: null },
        }),
      }),
      upsert: async (valori: unknown) => {
        stato.scritture.push(valori);
        return { error: null };
      },
    }),
  },
}));

import {
  calcolaImportazione,
  dittaADatiAzienda,
  getDatiAzienda,
  importaDatiDalBrowserUnaVolta,
} from "./ditta";
import { DATI_AZIENDA_DEFAULT, STORAGE_KEY } from "@/lib/dati-azienda";
import { formDaDitta, modificaDaForm } from "@/features/ditta/form-ditta";

beforeEach(() => {
  stato.riga = null;
  stato.scritture = [];
  stato.errore = null;
  localStorage.clear();
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
  it("se il database non risponde ripiega sui dati del browser", async () => {
    stato.errore = "rete assente";
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nomeAzienda: "Dal browser" }));
    expect((await getDatiAzienda()).nomeAzienda).toBe("Dal browser");
  });
});

describe("importazione dal browser", () => {
  const db = {
    ragione_sociale: "Nichetti Gian Battista",
    cap: "26015",
    comune: "Soresina",
    provincia: "CR",
    referente: "Gian Battista Nichetti",
    email: null,
    telefono: null,
    indirizzo: null,
    email_mittente_resend: "onboarding@resend.dev",
  };

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
    stato.riga = db;
    expect(await importaDatiDalBrowserUnaVolta()).toBe(true);
    expect(stato.scritture).toEqual([{ email: "info@x.it", id: true }]);
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
    stato.riga = db;
    expect(await importaDatiDalBrowserUnaVolta()).toBe(true);
  });
});

describe("modulo dati ditta → campi da salvare", () => {
  it("svuota i campi vuoti e converte i numeri", () => {
    const f = {
      ...formDaDitta({ ragione_sociale: "Studio" }),
      n_lavoratori_dichiarato: "85",
      telefono: "  ",
      livello_antincendio: "2" as const,
    };
    const m = modificaDaForm(f, null, "2026-11-01");
    expect(m.telefono).toBeNull();
    expect(m.n_lavoratori_dichiarato).toBe(85);
    expect(m.livello_antincendio).toBe(2);
  });
  it("aggiorna la data dei lavoratori solo se il numero è cambiato", () => {
    const prima = {
      ragione_sociale: "S",
      n_lavoratori_dichiarato: 85,
      n_lavoratori_data_aggiornamento: "2026-01-10",
    };
    expect(
      modificaDaForm(formDaDitta(prima), prima, "2026-11-01").n_lavoratori_data_aggiornamento,
    ).toBeUndefined();
    const cambiato = { ...formDaDitta(prima), n_lavoratori_dichiarato: "90" };
    expect(modificaDaForm(cambiato, prima, "2026-11-01").n_lavoratori_data_aggiornamento).toBe(
      "2026-11-01",
    );
  });
  it("aggiorna la data delle presenze solo se il numero è cambiato", () => {
    const prima = {
      ragione_sociale: "S",
      e_scuola: true,
      presenze_contemporanee_max: 800,
      presenze_data_aggiornamento: "2025-10-01",
    };
    expect(
      modificaDaForm(formDaDitta(prima), prima, "2026-11-01").presenze_data_aggiornamento,
    ).toBeUndefined();
    const cambiato = { ...formDaDitta(prima), presenze_contemporanee_max: "950" };
    expect(modificaDaForm(cambiato, prima, "2026-11-01").presenze_data_aggiornamento).toBe(
      "2026-11-01",
    );
  });
  it("conserva i codici ATECO inseriti", () => {
    const prima = {
      ragione_sociale: "S",
      codici_ateco: [{ codice: "85.31.20", principale: true }],
    };
    expect(formDaDitta(prima).codici_ateco).toEqual([{ codice: "85.31.20", principale: true }]);
  });
});

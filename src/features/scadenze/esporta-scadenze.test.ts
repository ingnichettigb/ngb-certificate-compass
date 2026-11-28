/*
 * File:      esporta-scadenze.test.ts
 * Percorso:  src/features/scadenze/esporta-scadenze.test.ts
 * Revisione: 1 — 28/11/2026 09:11
 * Data creazione: 28/11/2026 09:11
 * Test dell'esportazione dell'elenco della pagina Scadenze (colonne, ordine delle righe, nome del file).
 * Revisioni:
 * - Rev 1 (28/11/2026 09:11): Prima stesura.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Attestato } from "@/lib/api";
import { tabellaScadenze } from "./esporta-scadenze";
import { filtraScadenze } from "./filtri";
import { TUTTI } from "./types";

const att = (id: string, cognome: string, dataCorso: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    codice_fiscale: "CF" + id,
    dipendente_id: "d" + id,
    tipo_corso_id: "t" + id,
    data_corso: dataCorso,
    ore_dichiarate: 6,
    stato_validazione: "Approvato",
    url_foto_fronte: "f.pdf",
    dipendenti: { cognome, nome: "Mario", reparto: "ATA" },
    tipi_corso: { nome_corso: "Antincendio", macro_categoria: "Antincendio", livello_specifico: "Base", durata_validita_anni: 5, ore_aggiornamento: 6, ore_minime_legge: 6 },
    ...extra,
  }) as unknown as Attestato;

const righe = filtraScadenze({
  attestati: [att("1", "ROSSI", "2021-01-10"), att("2", "BIANCHI", "2021-03-01", { url_foto_fronte: null })],
  vista: "Scaduti",
  q: "",
  reparto: TUTTI,
  corsoSelezionato: TUTTI,
  sortCol: "scadenza",
  sortDir: "asc",
  oggi: new Date("2026-10-20T12:00:00"),
});

describe("tabellaScadenze", () => {
  it("una riga per riga mostrata, nello stesso ordine, con date in formato italiano", () => {
    const t = tabellaScadenze(righe, { vista: "Scaduti" });
    expect(t.intestazioni).toEqual(["N°", "Dipendente", "Codice fiscale", "Reparto", "Corso", "Data corso", "Ancora Base", "Scadenza", "Stato", "Note"]);
    expect(t.righe.map((r) => r[1])).toEqual(["ROSSI Mario", "BIANCHI Mario"]);
    expect(t.righe[0]![0]).toBe(1);
    expect(t.righe[0]![5]).toBe("10/01/2021");
    expect(t.righe[0]![7]).toBe("10/01/2026");
    expect(t.righe[0]![8]).toBe("Scaduto (sanabile con agg.)");
  });
  it("riporta «Manca attestato» tra le note", () => {
    const t = tabellaScadenze(righe, { vista: "Scaduti" });
    expect(t.righe[0]![9]).toBe("");
    expect(String(t.righe[1]![9])).toContain("Manca attestato");
  });
  it("con un ruolo aggiunge la colonna Ruolo e il nome del ruolo al file", () => {
    const t = tabellaScadenze(righe, { vista: "Scaduti o in scadenza (90 gg)", ruoloNome: "Addetto antincendio" });
    expect(t.intestazioni[4]).toBe("Ruolo");
    expect(t.righe[0]![4]).toBe("Addetto antincendio");
    expect(t.nomeBase).toBe("scadenze-addetto-antincendio-scaduti-o-in-scadenza-90-gg");
  });
  it("senza ruolo il nome del file contiene solo la vista", () => {
    expect(tabellaScadenze(righe, { vista: "Scaduti" }).nomeBase).toBe("scadenze-scaduti");
  });
});

/*
 * File:          genera.filtro-argomento.test.ts
 * Percorso:      src/features/stampe/globale/genera.filtro-argomento.test.ts
 * Data creazione: 2026-11-25
 * «Stampa selezione» con un argomento scelto (filtroArgomento): un attestato senza i dati del corso (tipi_corso assente) non appartiene a nessun
 * argomento, quindi con il filtro resta fuori. Prima faceva andare in errore la preparazione della stampa (TypeError su un corso nullo).
 * Revisioni:
 *   - Rev 1 (2026-11-25): Prima stesura.
 */
import { describe, expect, it, vi } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import type { DatiStampaGlobale } from "./genera";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";

vi.mock("./allegati", () => ({ dimensioneAllegato: async () => 0, leggiAllegato: async () => ({ tipo: "mancante" }) }));

const { preparaLavoratori } = await import("./genera");

const dip = { id: "1", cognome: "Bianchi", nome: "Mario", codice_fiscale: "CF1", stato_lavoratore: "in_forza" } as unknown as Dipendente;
const att = (id: string, corso: unknown): Attestato =>
  ({ id, dipendente_id: "1", data_corso: "2024-01-01", data_scadenza_calcolata: null, url_foto_fronte: null, url_foto_retro: null, tipi_corso: corso }) as unknown as Attestato;

const PREPOSTO = { macro_categoria: "Preposto", nome_corso: "Corso preposto", codice: "PRP-BAS-12" };
const DAE = { macro_categoria: "Defibrillatore", nome_corso: "Corso DAE", codice: "BLS-BAS-05" };
const dati: DatiStampaGlobale = {
  dipendenti: [dip],
  attestati: [att("preposto", PREPOSTO), att("dae", DAE), att("senza-undefined", undefined), att("senza-null", null)],
  ruoli: [],
} as unknown as DatiStampaGlobale;

const ordinePreposti = assegnaGruppoArgomento(PREPOSTO).ordine;
const ordineDae = assegnaGruppoArgomento(DAE).ordine;
const idDi = (filtro?: number | null) => preparaLavoratori(dati, true, undefined, filtro)[0]!.attestati.map((a) => a.id).sort();

describe("preparaLavoratori con filtroArgomento", () => {
  it("con un argomento scelto tiene solo i corsi di quell'argomento, senza errori per gli attestati senza corso", () => {
    expect(ordinePreposti).not.toBe(ordineDae);
    expect(idDi(ordinePreposti)).toEqual(["preposto"]);
    expect(idDi(ordineDae)).toEqual(["dae"]);
  });

  it("senza filtro, o con «Tutti», restano tutti gli attestati, anche quelli senza corso", () => {
    const tutti = ["dae", "preposto", "senza-null", "senza-undefined"];
    expect(idDi()).toEqual(tutti);
    expect(idDi(null)).toEqual(tutti);
  });
});

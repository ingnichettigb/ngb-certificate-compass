/*
 * File:      organigramma-a3-sedi.test.ts
 * Percorso:  src/features/stampe/organigramma-a3-sedi.test.ts
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 — Tavola A3 per sede: filtro sul plesso, senza filtro tutte le sedi, stessa persona in due sedi una volta sola.
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { calcolaBlocchiA3 } from "./organigramma-a3";

const dip = (id: string, cognome: string): Dipendente =>
  ({ id, cognome, nome: "N", reparto: "ATA", sottoreparto: null, stato_lavoratore: "in_forza" }) as unknown as Dipendente;
const ruolo = { id: "r-pre", nome: "Preposto", macro_categoria: "Preposto", obbligatorio_tutti: false, attivo: true, ordine: 0 } as unknown as RuoloSicurezza;
const ass = (d: string, sede: string | null): AssegnazioneRuolo => ({ id: `${d}-${sede}`, dipendente_id: d, ruolo_id: "r-pre", sede_id: sede });

const DIP = [dip("1", "ROSSI"), dip("2", "NERI")];
const ASS = [ass("1", "centrale"), ass("2", "plesso"), ass("1", "plesso")];
const oggi = new Date("2026-11-13T10:00:00");
const nomi = (sede?: string | null) =>
  calcolaBlocchiA3(DIP, [], [ruolo], ASS, oggi, sede).find((b) => b.chiave === "preposti")!.ata.map((n) => n.testo);

describe("Organigramma A3 per sede", () => {
  it("sede principale: solo gli incarichi della principale", () => {
    expect(nomi("centrale")).toEqual(["ROSSI N."]);
  });
  it("plesso: solo gli incarichi del plesso (ordine alfabetico)", () => {
    expect(nomi("plesso")).toEqual(["NERI N.", "ROSSI N."]);
  });
  it("senza filtro: tutte le sedi, la stessa persona compare una volta", () => {
    expect(nomi()).toEqual(["NERI N.", "ROSSI N."]);
    expect(nomi(null)).toEqual(["NERI N.", "ROSSI N."]);
  });
  it("sede senza incarichi: riquadro vuoto", () => {
    expect(nomi("altra")).toEqual([]);
  });
});

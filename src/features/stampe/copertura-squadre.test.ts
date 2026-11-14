/*
 * File:      copertura-squadre.test.ts
 * Percorso:  src/features/stampe/copertura-squadre.test.ts
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Avviso squadre scoperte di una sede.
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { calcolaBlocchiA3, type BloccoOrganigramma } from "./organigramma-a3";
import { squadreScoperte } from "./copertura-squadre";

const blocco = (chiave: string, titolo: string, nomi: boolean[]): BloccoOrganigramma => ({
  chiave,
  titolo,
  ata: nomi.map((daFormare, i) => ({ testo: `N${i}`, daFormare })),
  docenti: [],
});

describe("squadreScoperte", () => {
  it("nessun avviso se primo soccorso e antincendio hanno almeno un addetto formato", () => {
    expect(squadreScoperte([blocco("primo-soccorso", "PS", [true, false]), blocco("antincendio", "AI", [false])])).toEqual([]);
  });

  it("segnala la squadra senza addetti e quella con addetti tutti da formare", () => {
    const r = squadreScoperte([blocco("primo-soccorso", "Addetti primo soccorso", []), blocco("antincendio", "Addetti antincendio", [true, true])]);
    expect(r).toEqual([
      { chiave: "primo-soccorso", titolo: "Addetti primo soccorso", motivo: "nessun-addetto" },
      { chiave: "antincendio", titolo: "Addetti antincendio", motivo: "nessun-formato" },
    ]);
  });

  it("ignora le squadre non obbligatorie (evacuazione, defibrillatore…)", () => {
    expect(squadreScoperte([blocco("evacuazione", "Evacuazione", []), blocco("defibrillatore", "DAE", [])])).toEqual([]);
  });

  it("con calcolaBlocchiA3: un addetto antincendio nel plesso B non copre il plesso A", () => {
    const dip = { id: "1", cognome: "ROSSI", nome: "N", codice_fiscale: "CF1", reparto: "ATA", sottoreparto: null, classe_concorso: null, materia: null, stato_lavoratore: "in_forza" } as unknown as Dipendente;
    const ruolo = { id: "r-ai", nome: "Addetto antincendio", macro_categoria: "Antincendio", obbligatorio_tutti: false, attivo: true, ordine: 0 } as unknown as RuoloSicurezza;
    const ass = { id: "a1", dipendente_id: "1", ruolo_id: "r-ai", sede_id: "B" } as AssegnazioneRuolo;
    const oggi = new Date("2026-11-14T10:00:00");
    const inA = squadreScoperte(calcolaBlocchiA3([dip], [], [ruolo], [ass], oggi, "A"));
    const inB = squadreScoperte(calcolaBlocchiA3([dip], [], [ruolo], [ass], oggi, "B"));
    expect(inA.some((a) => a.chiave === "antincendio" && a.motivo === "nessun-addetto")).toBe(true);
    // in B l'addetto c'è ma non ha attestati: «nessun formato», non «nessun addetto»
    expect(inB.find((a) => a.chiave === "antincendio")?.motivo).toBe("nessun-formato");
  });
});

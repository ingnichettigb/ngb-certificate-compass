/*
 * File:      registra-funzioni.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/registra-funzioni.test.ts
 * Creato:    11/11/2026
 * Verifica che le X del file diventino ruoli: per i nuovi e per i già presenti in forza selezionati (solo aggiunta),
 * che i ruoli mancanti (Privacy) vengano creati nel catalogo e che classe e profilo ATA siano salvati.
 * Revisioni:
 *   rev 1 — 11/11/2026 — Prima stesura.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dati } = vi.hoisted(() => ({
  dati: {
    tabelle: {
      dipendenti: [{ id: "a", cognome: "ROSSI", nome: "MARIO", codice_fiscale: "RSSMRA80A01H501U", stato_lavoratore: "in_forza" }],
      ruoli_sicurezza: [
        { id: "r-prep", nome: "Preposto", descrizione: null, macro_categoria: "Preposto", obbligatorio_tutti: false, attivo: true, ordine: 2 },
        { id: "r-priv", nome: "Referente Privacy", descrizione: null, macro_categoria: "Privacy", obbligatorio_tutti: false, attivo: true, ordine: 9 },
      ],
    },
  },
}));
vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});

import { registro } from "@/test/registratore-supabase";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { analizzaSoloNuovi, type RigaGrezza } from "./analisi-elenco";
import { registraNuovi } from "./registra-nuovi";

const ruolo = (id: string, nome: string, macro: string): RuoloSicurezza => ({
  id, nome, descrizione: null, macro_categoria: macro, obbligatorio_tutti: false, attivo: true, ordine: 1,
});

const righe: RigaGrezza[] = [
  { nominativo: "DOVA GIANLUCA", cf: "DVOGLC80A01F205X", funzione: "CS", cognome: "Dova", nome: "Gianluca", luogoNascita: "Milano", dataNascita: "1980-01-01", funzioni: { preposto: true, privacy: true } },
  { nominativo: "ROSSI MARIO", cf: "RSSMRA80A01H501U", funzione: "A027", cognome: "Rossi", nome: "Mario", luogoNascita: "Roma", dataNascita: "1980-01-01", funzioni: { preposto: true } },
];

beforeEach(() => { registro.length = 0; });

describe("funzioni con la X", () => {
  it("assegna i ruoli a nuovi e già presenti in forza, salva profilo ATA, non toglie nulla", async () => {
    const analisi = analizzaSoloNuovi(righe, [{ id: "a", codice_fiscale: "RSSMRA80A01H501U", stato_lavoratore: "in_forza" }], "Docente", ["A027"]);
    const esito = await registraNuovi({
      righe: analisi,
      dataInizio: "2026-09-01",
      ruoli: [ruolo("r-prep", "Preposto", "Preposto")],
    });
    expect(esito.errori).toEqual([]);
    expect(esito.inseriti).toHaveLength(1);
    expect(esito.presentiInForza).toHaveLength(1);

    const upsertDip = registro.find((r) => String(r[1]).startsWith("from.upsert") && r[2] === "dipendenti");
    expect(String(upsertDip?.[3])).toContain('"reparto":"ATA"');
    expect(String(upsertDip?.[3])).toContain('"sottoreparto":"Collaboratore scolastico"');

    const assegnazioni = registro.filter((r) => String(r[1]).startsWith("from.upsert") && r[2] === "dipendenti_ruoli").map((r) => String(r[3]));
    expect(assegnazioni.some((a) => a.includes("r-prep") && a.includes("nuovo-1"))).toBe(true); // nuovo: Preposto
    expect(assegnazioni.some((a) => a.includes("r-priv") && a.includes("nuovo-1"))).toBe(true); // nuovo: Privacy (creato nel catalogo)
    expect(assegnazioni.some((a) => a.includes("r-prep") && a.includes('"a"'))).toBe(true); // già presente: Preposto
    expect(esito.ruoliAggiuntiAPresenti).toBe(1);
    expect(registro.some((r) => String(r[1]).includes("delete") && r[2] === "dipendenti_ruoli")).toBe(false);
    // il ruolo Privacy mancava: viene creato una sola volta
    const creati = registro.filter((r) => String(r[1]).startsWith("from.insert") && r[2] === "ruoli_sicurezza");
    expect(creati).toHaveLength(1);
    expect(esito.ruoliCreati).toEqual(["Referente Privacy"]);
  });
});

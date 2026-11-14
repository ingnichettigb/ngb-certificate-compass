/*
 * File:      nomine-sedi.test.ts
 * Percorso:  src/features/nomine/nomine-sedi.test.ts
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Nomine per sede: segnaposto {{sede}} e nominati limitati agli incarichi del plesso.
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { costruisciDocumento, sostituisciSegnaposto, testoDocumento } from "./documento";
import { MODELLI_DEFAULT } from "./modelli-default";
import { nominatiDaOrganigramma } from "./nominativi";
import { SEGNAPOSTO, voceElenco } from "./tipi";

const dip = (id: string, cognome: string) =>
  ({ id, cognome, nome: "N", codice_fiscale: `CF${id}`, reparto: "ATA", sottoreparto: null, classe_concorso: null, materia: null, stato_lavoratore: "in_forza" }) as unknown as Dipendente;
const ruolo = { id: "r-ps", nome: "Addetto primo soccorso", macro_categoria: "Primo soccorso", obbligatorio_tutti: false, attivo: true, ordine: 0 } as unknown as RuoloSicurezza;
const ass = (id: string, dip_id: string, sede: string): AssegnazioneRuolo => ({ id, dipendente_id: dip_id, ruolo_id: "r-ps", sede_id: sede });

describe("nomine per sede", () => {
  it("{{sede}} è tra i segnaposto e si sostituisce; senza sede resta vuoto", () => {
    expect(SEGNAPOSTO.some((s) => s.chiave === "sede")).toBe(true);
    expect(sostituisciSegnaposto("Plesso {{sede}}.", { sede: "Via Roma" })).toBe("Plesso Via Roma.");
    const base = { nome: "Rossi Mario", anno: "2026-2027", protocollo: "1", data: "14/11/2026" };
    const modello = { ...MODELLI_DEFAULT["primo-soccorso"], introduzione: "Presso {{sede}}." };
    const ditta = { ragione_sociale: "Liceo X", comune: "Cremona", datore_di_lavoro: "M. Rossi", e_scuola: true };
    expect(testoDocumento(costruisciDocumento(modello, ditta, { ...base, sede: "Via Roma" }))).toContain("Presso Via Roma.");
    expect(testoDocumento(costruisciDocumento(modello, ditta, base))).not.toContain("{{");
  });

  it("filtrando le assegnazioni per sede, i nominati sono solo quelli del plesso", () => {
    const dipendenti = [dip("1", "ROSSI"), dip("2", "NERI")];
    const tutte = [ass("a1", "1", "centrale"), ass("a2", "2", "plesso-b")];
    const dati = (a: AssegnazioneRuolo[]) => ({ dipendenti, ruoli: [ruolo], assegnazioni: a, voci: [] });
    const voce = voceElenco("primo-soccorso")!;
    expect(nominatiDaOrganigramma(voce, dati(tutte)).map((n) => n.nome)).toHaveLength(2);
    const soloB = nominatiDaOrganigramma(voce, dati(tutte.filter((a) => a.sede_id === "plesso-b")));
    expect(soloB.map((n) => n.nome)).toEqual(["NERI N"]);
  });
});

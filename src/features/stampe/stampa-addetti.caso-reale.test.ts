/*
 * File:      stampa-addetti.caso-reale.test.ts
 * Percorso:  src/features/stampe/stampa-addetti.caso-reale.test.ts
 * Data creaz: 22/11/2026
 * Revisioni:
 *   rev 1 — 22/11/2026 — Caso del Liceo Aselli: 19 addetti DAE, 6 da formare (5 scaduti + Bertuccioli «Manca corso base»); Bretani «In scadenza» non richiede.
 */
import { it, expect } from "vitest";
import type { Attestato, Dipendente } from "@/lib/api";
import { calcolaRighe } from "./dati-stampa";
import { contaVistaAddetti, diagnosiAddetti, righePerVistaAddetti } from "./stampa-addetti";
import { trovaPredefinita } from "./stampe-predefinite";
const OGGI = new Date("2026-11-22T14:10:00");
const dip = (id: string, reparto: string) => ({ id, cognome: id, nome: "X", codice_fiscale: `CF${id}`, reparto, sottoreparto: null, classe_concorso: null, materia: null, stato_lavoratore: "in_forza" }) as unknown as Dipendente;
const att = (d: Dipendente, codice: string, livello: string, data: string, scad: string): Attestato => ({
  id: `${d.id}-${codice}-${data}`, dipendente_id: d.id, codice_fiscale: d.codice_fiscale, tipo_corso_id: `t-${codice}`, data_corso: data, data_scadenza_calcolata: scad,
  ore_dichiarate: 5, stato_validazione: "Approvato", created_at: data,
  dipendenti: { id: d.id, cognome: d.cognome, nome: d.nome, codice_fiscale: d.codice_fiscale, reparto: d.reparto, sottoreparto: null, classe_concorso: null, stato_lavoratore: "in_forza" },
  tipi_corso: { id: `t-${codice}`, nome_corso: codice, codice, macro_categoria: "Defibrillatore", livello_specifico: livello, durata_validita_anni: 2, ore_aggiornamento: 3, ore_minime_legge: 5 },
}) as unknown as Attestato;
const ruoloDae = { id: "r-dae", nome: "Addetto BLSD / Defibrillatore", descrizione: null, macro_categoria: "Defibrillatore", obbligatorio_tutti: false, attivo: true, ordine: 0, codice: "ADD_DAE" } as never;
it("caso reale (PDF 22/11/2026 + 6 addetti già formati): 19 addetti, 6 da formare", () => {
  const D = (n: string) => dip(n, "Docente");
  const lista: [Dipendente, Attestato[]][] = [
    [D("Bertuccioli"), [att(D("Bertuccioli"), "BLS-AGG-02", "Aggiornamento", "2025-05-17", "2027-05-17")]],
    [D("Guernelli"), [att(D("Guernelli"), "BLS-BAS-05", "Base", "2023-11-07", "2025-11-07")]],
    [D("Ferrari"), [att(D("Ferrari"), "BLS-BAS-05", "Base", "2024-02-29", "2026-02-28")]],
    [D("Alquati"), [att(D("Alquati"), "BLS-BAS-05", "Base", "2024-03-04", "2026-03-04")]],
    [D("Somenzi"), [att(D("Somenzi"), "BLS-BAS-05", "Base", "2024-03-04", "2026-03-04")]],
    [D("Bretani"), [att(D("Bretani"), "BLS-BAS-05", "Base", "2025-04-05", "2027-04-05")]],
    ...["Barbati", "Buttafava", "Fregoni", "Galli", "Maffini", "Torresani"].map((n): [Dipendente, Attestato[]] => [D(n), [att(D(n), "BLS-BAS-05", "Base", "2025-10-17", "2027-10-17")]]),
    ...["N1", "N2", "N3", "N4"].map((n): [Dipendente, Attestato[]] => [D(n), [att(D(n), "BLS-BAS-05", "Base", "2026-03-10", "2028-03-10")]]),
    [dip("Bodini", "ATA"), [att(dip("Bodini", "ATA"), "BLS-BAS-05", "Base", "2024-05-25", "2026-05-25")]],
    ...["A1", "A2"].map((n): [Dipendente, Attestato[]] => [dip(n, "ATA"), [att(dip(n, "ATA"), "BLS-BAS-05", "Base", "2026-04-01", "2028-04-01")]]),
  ];
  const tutti = lista.map((l) => l[0]);
  const attestati = lista.flatMap((l) => l[1]);
  const ass = tutti.map((d) => ({ id: `x${d.id}`, dipendente_id: d.id, ruolo_id: "r-dae" }));
  const f = trovaPredefinita("scadenze-defibrillatore")!.filtri;
  const m = calcolaRighe(attestati, { ...f, senzaFinestra: true }, OGGI, ass, null, [ruoloDae], tutti);
  expect(contaVistaAddetti(m)).toEqual({ tutti: 19, formazione: 6 });
  expect([...new Set(righePerVistaAddetti(m, "formazione").map((r) => r.dipendenteId))].sort()).toEqual(["Alquati", "Bertuccioli", "Bodini", "Ferrari", "Guernelli", "Somenzi"]);
  const d = diagnosiAddetti(m);
  expect(d).toHaveLength(19);
  expect(d.find((x) => x.lavoratore.startsWith("Bertuccioli"))!.motivo).toBe("MANCA");
  expect(d.find((x) => x.lavoratore.startsWith("Bretani"))!.richiede).toBe(false);
});

/*
 * File:      dati-stampa.ordine.test.ts
 * Percorso:  src/features/stampe/dati-stampa.ordine.test.ts
 * Data creaz: 06/11/2026
 * Verifica l'ordinamento per colonna (A→Z / Z→A) e «Univoco» (una riga per lavoratore, scadenza più urgente).
 */
import { describe, expect, it } from "vitest";
import { ordinaRighe, prossimoOrdine, unicoPerLavoratore, type RigaStampa } from "./dati-stampa";

const riga = (id: string, dip: string, cognome: string, extra: Partial<RigaStampa> = {}): RigaStampa => ({
  id, dipendenteId: dip, cognome, nome: "X", cf: "", reparto: "Docente", sottoreparto: "", materia: "", mansione: "", ruoli: "",
  assunzione: null, luogoNascita: "", dataNascita: null, formazione: {}, mancanti: [], fineContratto: null, cessazione: null,
  corso: "Preposto", codice: "PRP", gruppo: "g", gruppoTitolo: "G", ore: 8, numero: "", dataCorso: "2020-01-01",
  scadenza: null, stato: "valido", giorniAllaScadenza: null, ...extra,
});
const ids = (rr: RigaStampa[]) => rr.map((r) => r.id);

describe("ordinamento per colonna", () => {
  const righe = [
    riga("1", "a", "Rossi", { scadenza: "2024-03-21", stato: "scaduto", ore: 8 }),
    riga("2", "b", "bianchi", { scadenza: "2023-05-30", stato: "in_scadenza", ore: 12 }),
    riga("3", "c", "Verdi", { scadenza: null, stato: "valido", ore: 4 }),
    riga("4", "d", "Àlberti", { scadenza: "2025-01-01", stato: "senza_scadenza", ore: null }),
  ];

  it("per lavoratore dalla A alla Z e viceversa, senza distinguere maiuscole e accenti", () => {
    expect(ids(ordinaRighe(righe, { colonna: "lavoratore", direzione: "asc" }))).toEqual(["4", "2", "1", "3"]);
    expect(ids(ordinaRighe(righe, { colonna: "lavoratore", direzione: "desc" }))).toEqual(["3", "1", "2", "4"]);
  });

  it("le date si ordinano per data vera e i dati assenti restano in fondo in entrambe le direzioni", () => {
    expect(ids(ordinaRighe(righe, { colonna: "scadenza", direzione: "asc" }))).toEqual(["2", "1", "4", "3"]);
    expect(ids(ordinaRighe(righe, { colonna: "scadenza", direzione: "desc" }))).toEqual(["4", "1", "2", "3"]);
  });

  it("lo stato si ordina per urgenza e le ore come numeri", () => {
    expect(ids(ordinaRighe(righe, { colonna: "stato", direzione: "asc" }))).toEqual(["1", "2", "3", "4"]);
    expect(ids(ordinaRighe(righe, { colonna: "ore", direzione: "desc" }))).toEqual(["2", "1", "3", "4"]);
  });

  it("senza ordine restituisce le righe com'erano e non modifica l'originale", () => {
    expect(ordinaRighe(righe, null)).toBe(righe);
    ordinaRighe(righe, { colonna: "lavoratore", direzione: "asc" });
    expect(ids(righe)).toEqual(["1", "2", "3", "4"]);
  });

  it("il clic sulla stessa intestazione gira A→Z, Z→A, nessuno; un'altra colonna riparte da A→Z", () => {
    const a = prossimoOrdine(null, "lavoratore");
    expect(a).toEqual({ colonna: "lavoratore", direzione: "asc" });
    const b = prossimoOrdine(a, "lavoratore");
    expect(b).toEqual({ colonna: "lavoratore", direzione: "desc" });
    expect(prossimoOrdine(b, "lavoratore")).toBeNull();
    expect(prossimoOrdine(b, "scadenza")).toEqual({ colonna: "scadenza", direzione: "asc" });
  });
});

describe("univoco", () => {
  it("tiene una sola riga per lavoratore: quella con la scadenza più urgente (la più vecchia)", () => {
    const righe = [
      riga("1", "bianchi", "Bianchi", { scadenza: "2024-03-21" }),
      riga("2", "bianchi", "Bianchi", { scadenza: "2023-05-30" }),
      riga("3", "rossi", "Rossi", { scadenza: "2024-01-01" }),
      riga("4", "bianchi", "Bianchi", { scadenza: null }),
    ];
    expect(ids(unicoPerLavoratore(righe))).toEqual(["2", "3"]);
  });

  it("una scadenza vera vince su «senza scadenza», anche se questa viene prima", () => {
    const righe = [riga("1", "a", "A", { scadenza: null }), riga("2", "a", "A", { scadenza: "2030-01-01" })];
    expect(ids(unicoPerLavoratore(righe))).toEqual(["2"]);
  });

  it("mantiene l'ordine originale e, a parità di scadenza, la prima riga", () => {
    const righe = [
      riga("1", "a", "A", { scadenza: "2024-01-01" }),
      riga("2", "b", "B", { scadenza: "2024-01-01" }),
      riga("3", "a", "A", { scadenza: "2024-01-01" }),
    ];
    expect(ids(unicoPerLavoratore(righe))).toEqual(["1", "2"]);
  });
});

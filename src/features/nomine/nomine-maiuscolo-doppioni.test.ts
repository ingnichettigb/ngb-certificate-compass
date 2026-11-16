/*
 * File:      nomine-maiuscolo-doppioni.test.ts
 * Percorso:  src/features/nomine/nomine-maiuscolo-doppioni.test.ts
 * Data creaz: 16/11/2026
 * Test di: cognomi e nomi sempre in MAIUSCOLO nelle Nomine; doppioni tolti ignorando solo maiuscole e spazi in eccesso,
 *          senza mai fondere nomi uniti e divisi (MARIACRISTINA ≠ MARIA CRISTINA).
 * Revisioni:
 *   rev 1 — 16/11/2026 — Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { candidatiManuali, nominatiDaOrganigramma } from "./nominativi";
import { voceElenco } from "./tipi";

const dip = (id: string, cognome: string, nome: string, reparto = "ATA") =>
  ({ id, cognome, nome, reparto, stato_lavoratore: "in_forza", codice_fiscale: "" }) as unknown as Dipendente;
const ruoli = [
  { id: "r-sds", nome: "Responsabile custodia SDS", macro_categoria: "SDS", obbligatorio_tutti: false, attivo: true },
] as unknown as RuoloSicurezza[];
const ass = [{ id: "a1", dipendente_id: "1", ruolo_id: "r-sds" }] as unknown as AssegnazioneRuolo[];
const sds = voceElenco("sds")!;

describe("nomi in maiuscolo e doppioni", () => {
  it("lo stesso nome scritto in minuscolo o con spazi in più nell'organigramma non è un doppione", () => {
    const voci = [{ titolo: "Responsabile custodia SDS", nomi: ["  bardelli   maria cristina "] }];
    const n = nominatiDaOrganigramma(sds, {
      dipendenti: [dip("1", "BARDELLI", "MARIA CRISTINA")],
      ruoli,
      assegnazioni: ass,
      voci,
    });
    expect(n.map((x) => x.nome)).toEqual(["BARDELLI MARIA CRISTINA"]);
    expect(n[0]?.dettaglio).toBe("ATA");
  });

  it("nome unito e nome diviso sono due persone diverse: non vengono fusi", () => {
    const voci = [{ titolo: "Responsabile custodia SDS", nomi: ["Bardelli Mariacristina"] }];
    const n = nominatiDaOrganigramma(sds, {
      dipendenti: [dip("1", "BARDELLI", "MARIA CRISTINA")],
      ruoli,
      assegnazioni: ass,
      voci,
    });
    expect(n.map((x) => x.nome)).toEqual(["BARDELLI MARIA CRISTINA", "BARDELLI MARIACRISTINA"]);
    expect(n[1]?.id).toBe("voce:BARDELLI MARIACRISTINA");
  });

  it("le voci libere senza lavoratore corrispondente compaiono in maiuscolo", () => {
    const voci = [{ titolo: "Responsabile custodia SDS", nomi: ["esterno mario"] }];
    const n = nominatiDaOrganigramma(sds, { dipendenti: [], ruoli: [], assegnazioni: [], voci });
    expect(n.map((x) => x.nome)).toEqual(["ESTERNO MARIO"]);
  });

  it("i candidati manuali sono in maiuscolo e non includono chi è già nominato (anche scritto in minuscolo)", () => {
    const gia = [{ id: "voce:x", nome: "rossi anna", origine: "voce" as const }];
    const c = candidatiManuali([dip("1", "ROSSI", "ANNA"), dip("2", "NERI", "PAOLO")], gia);
    expect(c.map((x) => x.nome)).toEqual(["NERI PAOLO"]);
  });
});

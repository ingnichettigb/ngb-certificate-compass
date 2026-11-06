/*
 * File:      registra-nuovi.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/registra-nuovi.test.ts
 * Creato:    06/11/2026
 * Verifica che l'importazione «solo nuovi» scriva SOLO i nuovi (in maiuscolo, a tempo determinato, con
 * assunzione scelta) e non tocchi mai i già presenti; e che la riabilitazione non azzeri la data di cessazione.
 * Revisioni:
 *   rev 1 — 06/11/2026 08:20 — Prima stesura.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dati } = vi.hoisted(() => ({
  dati: {
    tabelle: {
      dipendenti: [
        { id: "a", cognome: "ROSSI", nome: "MARIO", codice_fiscale: "RSSMRA80A01H501U", stato_lavoratore: "in_forza" },
        { id: "b", cognome: "BIANCHI", nome: "ANNA", codice_fiscale: "BNCNNA85B41F205X", stato_lavoratore: "cessato" },
      ],
    },
  },
}));
vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});

import { registro } from "@/test/registratore-supabase";
import { riabilitaDipendenti } from "@/lib/api";
import { analizzaSoloNuovi, type RigaGrezza } from "./analisi-elenco";
import { registraNuovi } from "./registra-nuovi";

const riga = (cf: string, cognome: string, nome: string): RigaGrezza => ({
  nominativo: `${cognome} ${nome}`, cf, funzione: "docenti", cognome, nome, luogoNascita: "Milano", dataNascita: "1980-01-01",
});

beforeEach(() => { registro.length = 0; });

describe("importazione «solo nuovi»", () => {
  const analisi = analizzaSoloNuovi(
    [riga("DVOGLC80A01F205X", "Dova", "Gianluca"), riga("RSSMRA80A01H501U", "Rossi", "Mario"), riga("BNCNNA85B41F205X", "Bianchi", "Anna"), riga("XXX", "Sbagliato", "Cf")],
    [],
    "ATA",
  );

  it("inserisce solo il nuovo e riconosce già presenti (anche dal database aggiornato) e non validi", async () => {
    const esito = await registraNuovi({ righe: analisi, dataInizio: "2026-09-01", ruoli: [] });
    expect(esito.inseriti.map((v) => v.cf)).toEqual(["DVOGLC80A01F205X"]);
    expect(esito.presentiInForza.map((v) => v.cf)).toEqual(["RSSMRA80A01H501U"]);
    expect(esito.presentiCessati.map((v) => [v.id, v.cf])).toEqual([["b", "BNCNNA85B41F205X"]]);
    expect(esito.nonValidi).toHaveLength(1);
    expect(esito.errori).toEqual([]);
  });

  it("scrive una sola riga: il nuovo, in maiuscolo, determinato, con l'assunzione scelta", async () => {
    await registraNuovi({ righe: analisi, dataInizio: "2026-09-01", ruoli: [] });
    const scritture = registro.filter((r) => String(r[1]).startsWith("from.upsert") && !String(r[1]).includes("select") && r[2] === "dipendenti");
    expect(scritture).toHaveLength(1);
    const payload = String(scritture[0]?.[3]);
    expect(payload).toContain('"cognome":"DOVA"');
    expect(payload).toContain('"nome":"GIANLUCA"');
    expect(payload).toContain('"luogo_nascita":"MILANO"');
    expect(payload).toContain('"reparto":"Docente"');
    expect(payload).toContain('"tipo_contratto":"determinato"');
    expect(payload).toContain('"data_assunzione":"2026-09-01"');
    expect(payload).not.toContain("RSSMRA80A01H501U");
    expect(registro.some((r) => String(r[1]).startsWith("from.update") && r[2] === "dipendenti")).toBe(false);
  });

  it("«Riabilita i cessati» rimette in forza ma non azzera la data di cessazione (il segnale della coda)", async () => {
    await riabilitaDipendenti(["b"], "2026-09-01");
    const upd = registro.find((r) => String(r[1]) === "from.update" && r[2] === "dipendenti");
    const payload = String(upd?.[3]);
    expect(payload).toContain('"stato_lavoratore":"in_forza"');
    expect(payload).toContain('"data_assunzione":"2026-09-01"');
    expect(payload).not.toContain("data_cessazione");
    expect(registro.some((r) => String(r[1]).includes(".in") && r[3] === JSON.stringify(["id", ["b"]]))).toBe(true);
  });
});

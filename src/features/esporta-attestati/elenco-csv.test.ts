import { describe, expect, it } from "vitest";
import { csvElencoAttestati, filtraAttestati } from "./elenco-csv";

const corsi = [
  { id: "t1", codice: "SIC-GEN-04", nome_corso: "Generale", macro_categoria: "Sicurezza", ore_minime_legge: 4, codice_corso_aggiornamento: null },
  { id: "t2", codice: "ANT-L1B-04", nome_corso: "Antincendio", macro_categoria: "Antincendio", ore_minime_legge: 4, codice_corso_aggiornamento: "ANT-L1A-02", ore_aggiornamento: 2, anni_aggiornamento: 5 },
] as never[];
const att = [
  { id: "a1", tipo_corso_id: "t1", data_corso: "2024-03-15", data_scadenza_calcolata: null, ore_dichiarate: null, url_foto_fronte: null, dipendenti: { cognome: "ROSSI", nome: "MARIO", codice_fiscale: "CF1", reparto: "ATA" } },
  { id: "a2", tipo_corso_id: "t2", data_corso: "2024-01-10", data_scadenza_calcolata: "2029-01-10", ore_dichiarate: 4, url_foto_fronte: "X/file.pdf", dipendenti: { cognome: "BIANCHI", nome: "ANNA", codice_fiscale: "CF2", reparto: "Docente" } },
] as never[];

describe("esporta elenco attestati", () => {
  it("filtra per categoria e per corsi scelti", () => {
    expect(filtraAttestati(att, corsi, { tipo: "categoria", chiave: "antincendio" })).toHaveLength(1);
    expect(filtraAttestati(att, corsi, { tipo: "corsi", ids: new Set(["t1", "t2"]) })).toHaveLength(2);
    expect(filtraAttestati(att, corsi, { tipo: "corsi", ids: new Set() })).toHaveLength(0);
  });
  it("aggiunge la colonna percorso solo se richiesta", () => {
    const con = csvElencoAttestati(att, corsi, true).split("\r\n");
    expect(con[0]).toContain("Percorso e nome file (PC)");
    expect(con[1]).toContain("X/file.pdf");
    expect(con[2]).toContain("Nessun file collegato");
    expect(csvElencoAttestati(att, corsi, false)).not.toContain("Percorso");
  });
});

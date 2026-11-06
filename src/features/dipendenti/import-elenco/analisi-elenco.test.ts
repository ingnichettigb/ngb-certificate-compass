/*
 * File:      analisi-elenco.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/analisi-elenco.test.ts
 * Creato:    03/11/2026
 * Revisioni:
 *   rev 1 — 03/11/2026 14:30 — Prima stesura.
 *   rev 2 — 06/11/2026 08:20 — Test della modalità «solo nuovi», del reparto «docenti» e della coerenza codice fiscale/data di nascita.
 */
import { describe, expect, it } from "vitest";
import {
  analizzaRighe,
  analizzaSoloNuovi,
  dataFineServizioDefault,
  incoerenzaCfData,
  repartoDaTesto,
  separaNominativo,
  trovaClasse,
  type RigaGrezza,
} from "./analisi-elenco";

const CODICI = ["A027", "A050", "A11", "A19", "ADSS", "IRC", "A50"];

describe("analisi elenco", () => {
  it("fine servizio 31/08 dell'anno corrente", () => {
    expect(dataFineServizioDefault(new Date(2027, 2, 1))).toBe("2027-08-31");
  });
  it("riconosce le classi esistenti senza crearne", () => {
    expect(trovaClasse("A-19 STORIAFILOSOFIA", CODICI)?.classe).toBe("A19");
    expect(trovaClasse("A050 SCIENZE", CODICI)?.classe).toBe("A050");
    expect(trovaClasse("I.R.C.", CODICI)?.classe).toBe("IRC");
    expect(trovaClasse("ADSS -SOSTEGNO", CODICI)?.classe).toBe("ADSS");
    expect(trovaClasse("AS2B INGLESE", CODICI)).toBeNull();
  });
  it("separa cognome maiuscolo e nome", () => {
    expect(separaNominativo("AUGELLO Fabio")).toEqual({ cognome: "AUGELLO", nome: "Fabio" });
  });
  it("cessazione, ATA e nuovo ingresso per codice fiscale", () => {
    const r = analizzaRighe(
      [
        { nominativo: "AUGELLO Fabio", cf: "GLLFBA78T16I533R ", funzione: "\u00a0Non più in servizio" },
        { nominativo: "ROSSI Anna", cf: "RSSNNA80A41D150X", funzione: "COLL. SCOLASTICO" },
      ],
      [{ id: "1", codice_fiscale: "GLLFBA78T16I533R" }],
      CODICI,
    );
    expect(r[0]).toMatchObject({ tipo: "cessazione", dipendenteId: "1" });
    expect(r[1]).toMatchObject({ tipo: "ata", sottorepartoAta: "Collaboratore scolastico", dipendenteId: null });
  });
});

describe("modalità «solo nuovi»", () => {
  const riga = (cf: string, cognome: string, nome: string, extra: Partial<RigaGrezza> = {}): RigaGrezza => ({
    nominativo: `${cognome} ${nome}`, cf, funzione: "docenti", cognome, nome, luogoNascita: "milano", dataNascita: "1980-01-01", ...extra,
  });
  const esistenti = [
    { id: "a", codice_fiscale: "RSSMRA80A01H501U", stato_lavoratore: "in_forza" },
    { id: "b", codice_fiscale: "BNCNNA85B41F205X", stato_lavoratore: "cessato" },
  ];
  const righe = [
    riga("DVOGLC80A01F205X", "Dova  ", "Gianluca"),
    riga("RSSMRA80A01H501U", "Rossi", "Mario"),
    riga("BNCNNA85B41F205X", "Bianchi", "Anna"),
    riga("DVOGLC80A01F205X", "Dova", "Gianluca"),
    riga("XXX", "Errato", "Codice"),
  ];
  const r = analizzaSoloNuovi(righe, esistenti, "ATA");

  it("distingue nuovo, già presente in forza, già presente cessato, doppione e non valido", () => {
    expect(r.map((x) => x.categoria)).toEqual(["nuovo", "presente_in_forza", "presente_cessato", "doppione", "non_valido"]);
    expect(r[1]?.dipendenteId).toBe("a");
    expect(r[2]?.dipendenteId).toBe("b");
  });
  it("cognome, nome e luogo di nascita escono sempre in maiuscolo e puliti", () => {
    expect(r[0]).toMatchObject({ cognome: "DOVA", nome: "GIANLUCA", luogoNascita: "MILANO" });
  });
  it("il reparto del file («docenti») prevale su quello predefinito", () => {
    expect(r[0]?.reparto).toBe("Docente");
    expect(analizzaSoloNuovi([riga("DVOGLC80A01F205X", "Dova", "G", { funzione: "" })], [], "ATA")[0]?.reparto).toBe("ATA");
  });
  it("riconosce il reparto da testo libero", () => {
    expect(repartoDaTesto("Docenti")).toBe("Docente");
    expect(repartoDaTesto("A.T.A.")).toBeNull(); // formato non previsto: si usa la scelta in testa alla finestra
    expect(repartoDaTesto("ATA")).toBe("ATA");
    expect(repartoDaTesto("Collaboratore scolastico")).toBe("ATA");
    expect(repartoDaTesto("")).toBeNull();
  });
  it("segnala la data di nascita incoerente con il codice fiscale", () => {
    expect(incoerenzaCfData("DVOGLC80A01F205X", "1980-01-01")).toBeNull();
    expect(incoerenzaCfData("DVOGLC80A01F205X", "1981-01-01")).not.toBeNull();
    expect(incoerenzaCfData("BNCNNA85B41F205X", "1985-02-01")).toBeNull(); // donna: giorno + 40
  });
  it("niente avvisi di data per i già presenti", () => {
    expect(r[1]?.avvisi).toEqual([]);
  });
});

describe("modalità aggiornamento: colonne separate e reparto «docenti»", () => {
  it("usa cognome e nome del file e non chiede di trovare una classe «docenti»", () => {
    const [p] = analizzaRighe(
      [{ nominativo: "DOVA Gianluca", cf: "DVOGLC80A01F205X", funzione: "docenti", cognome: "Dova", nome: "Gianluca" }],
      [],
      CODICI,
      "docente",
    );
    expect(p?.cognome).toBe("DOVA");
    expect(p?.nome).toBe("GIANLUCA");
    expect(p?.nota).toBe("Scegli la classe di concorso");
  });
});

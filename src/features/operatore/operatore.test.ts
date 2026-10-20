/*
 * Test di "fotografia" delle funzioni pure della Postazione Operatore.
 * Descrivono il comportamento che aveva operatore.tsx prima della suddivisione.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { costruisciBozzaEmail, riepilogo } from "./bozza-email";
import { estensioneFile, nomeFileStandard } from "./nome-file";
import { dataDaTesto, ETICHETTE_OCR, pulisciTestoOcr } from "./ocr-testo";
import { NOTA_PREDEFINITA, VUOTA, type CodaRiga } from "./types";

function riga(parziale: Partial<CodaRiga> = {}): CodaRiga {
  return {
    ...VUOTA,
    id: "1",
    cognome: "ROSSI",
    nome: "MARIO",
    codice_fiscale: "RSSMRA80A01H501U",
    tipo_corso_nome: "Antincendio",
    data_corso: "2026-03-15",
    ore: 8,
    esito: "Valido",
    percorso_file: null,
    mime_file: null,
    nome_file: null,
    archiviato: false,
    inviato: false,
    argomenti_mancanti: [],
    ...parziale,
  };
}

describe("pulisciTestoOcr", () => {
  it("testo vuoto", () => {
    expect(pulisciTestoOcr("")).toBe("");
  });
  it("toglie spazi, a capo e caratteri spuri ai bordi", () => {
    expect(pulisciTestoOcr("  |Rossi|  \n")).toBe("Rossi");
    expect(pulisciTestoOcr("-- ROSSI --")).toBe("ROSSI");
    expect(pulisciTestoOcr("a   b\tc")).toBe("a b c");
  });
  it("cognome e nome: maiuscolo, solo lettere, spazi e apostrofo", () => {
    expect(pulisciTestoOcr("d'Angelo 3", "cognome")).toBe("D'ANGELO");
    expect(pulisciTestoOcr("maria  grazia", "nome")).toBe("MARIA GRAZIA");
  });
  it("codice fiscale: maiuscolo, solo lettere e numeri", () => {
    expect(pulisciTestoOcr("rssmra80a01 h501u.", "codice_fiscale")).toBe("RSSMRA80A01H501U");
  });
  it("email: minuscolo senza spazi", () => {
    expect(pulisciTestoOcr("  Mario.Rossi @ Mail.it ", "email")).toBe("mario.rossi@mail.it");
  });
  it("ore: solo cifre e separatori", () => {
    expect(pulisciTestoOcr("12 ore", "ore")).toBe("12");
    expect(pulisciTestoOcr("8,5 h", "ore")).toBe("8,5");
  });
  it("data: solo cifre e separatori di data", () => {
    expect(pulisciTestoOcr("Data: 15/03/2026", "data_corso")).toBe("15/03/2026");
  });
  it("note e altri campi: solo la pulizia di base", () => {
    expect(pulisciTestoOcr("  corso  valido. ", "note")).toBe("corso valido");
  });
  it("ogni campo ha un'etichetta", () => {
    expect(Object.keys(ETICHETTE_OCR)).toHaveLength(8);
    expect(ETICHETTE_OCR.codice_fiscale).toBe("Codice Fiscale");
  });
});

describe("dataDaTesto", () => {
  it("converte GG/MM/AAAA in AAAA-MM-GG", () => {
    expect(dataDaTesto("15/03/2026")).toBe("2026-03-15");
  });
  it("accetta punti e trattini, anno a 2 cifre, giorno e mese a 1 cifra", () => {
    expect(dataDaTesto("5.3.26")).toBe("2026-03-05");
    expect(dataDaTesto("15-03-26")).toBe("2026-03-15");
  });
  it("senza data riconoscibile restituisce stringa vuota", () => {
    expect(dataDaTesto("niente")).toBe("");
    expect(dataDaTesto("")).toBe("");
  });
});

describe("nome file", () => {
  it("nomeFileStandard: anno-mese, cognome, nome, CF, corso", () => {
    expect(
      nomeFileStandard({
        data_corso: "2026-03-15",
        cognome: "ROSSI",
        nome: "MARIO",
        codice_fiscale: "RSSMRA80A01H501U",
        tipo_corso_nome: "Antincendio - Rischio basso",
      }),
    ).toBe("2026-03_ROSSI_MARIO_RSSMRA80A01H501U_Antincendio___Rischio_basso.pdf");
  });
  it("nomeFileStandard: valori di ripiego se mancano i dati", () => {
    expect(
      nomeFileStandard({
        data_corso: "",
        cognome: "",
        nome: "",
        codice_fiscale: "",
        tipo_corso_nome: "",
      }),
    ).toBe("ANNO-MANCANTE_COGNOME_NOME_SENZACF_CORSO.pdf");
  });
  it("estensioneFile", () => {
    expect(estensioneFile("application/pdf")).toBe("pdf");
    expect(estensioneFile("image/jpeg")).toBe("jpg");
    expect(estensioneFile("image/png")).toBe("png");
    expect(estensioneFile(null)).toBe("jpg");
    expect(estensioneFile("")).toBe("jpg");
  });
});

describe("testo dell'email", () => {
  it("riepilogo: righe di base", () => {
    expect(riepilogo(riga())).toBe(
      "ROSSI MARIO (RSSMRA80A01H501U)\nCorso: Antincendio — 15/03/2026 — 8 ore\nEsito: Valido",
    );
  });
  it("riepilogo: ore mancanti, integrazione DVR e note", () => {
    const r = riga({
      ore: null,
      esito: "Valido con integrazione DVR",
      integrazione: "4 ore di rischio specifico",
      note: "da completare",
    });
    expect(riepilogo(r)).toBe(
      "ROSSI MARIO (RSSMRA80A01H501U)\nCorso: Antincendio — 15/03/2026 — ? ore\nEsito: Valido con integrazione DVR" +
        "\nIntegrazione richiesta: 4 ore di rischio specifico\nNote: da completare",
    );
  });
  it("bozza per una sola persona: destinatario, oggetto e saluto", () => {
    const b = costruisciBozzaEmail([riga({ email: " mario@x.it " }), riga({ id: "2", email: "mario@x.it" })]);
    expect(b.destinatari).toBe("mario@x.it");
    expect(b.oggetto).toBe("Esito verifica attestati D.Lgs. 81/2008 — ROSSI MARIO");
    expect(b.testoCorpo.startsWith("Gentile ROSSI MARIO,\n\ndi seguito l'esito")).toBe(true);
    expect(b.testoCorpo).toContain("1) ROSSI MARIO (RSSMRA80A01H501U)");
    expect(b.testoCorpo).toContain("\n\n2) ROSSI MARIO");
  });
  it("bozza per più persone: saluto generico e destinatari distinti", () => {
    const b = costruisciBozzaEmail([
      riga({ email: "a@x.it" }),
      riga({ id: "2", cognome: "BIANCHI", nome: "ANNA", email: "b@x.it" }),
    ]);
    expect(b.destinatari).toBe("a@x.it, b@x.it");
    expect(b.oggetto).toBe("Esito verifica attestati D.Lgs. 81/2008 — ROSSI MARIO, BIANCHI ANNA");
    expect(b.testoCorpo.startsWith("Gentile collega,")).toBe(true);
  });
  it("bozza senza email: destinatari vuoti", () => {
    expect(costruisciBozzaEmail([riga({ email: "" })]).destinatari).toBe("");
  });
});

describe("valori iniziali", () => {
  it("VUOTA e nota predefinita", () => {
    expect(VUOTA.esito).toBe("Valido");
    expect(VUOTA.argomenti).toEqual([]);
    expect(NOTA_PREDEFINITA).toContain("Accordo Stato-Regioni");
  });
});

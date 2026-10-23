/*
 * Test delle regole di decisione di HR (approva/respingi).
 */
import { describe, expect, it } from "vitest";
import { costruisciAggiornamento, descrizioneEsito, erroreDecisione } from "./decisione";

describe("erroreDecisione", () => {
  it("un rifiuto senza note (o con soli spazi) non è ammesso", () => {
    expect(erroreDecisione("Respinto", "")).toBe("Le note di rifiuto sono obbligatorie");
    expect(erroreDecisione("Respinto", "   \n ")).toBe("Le note di rifiuto sono obbligatorie");
  });
  it("un rifiuto con note è ammesso", () => {
    expect(erroreDecisione("Respinto", "Foto illeggibile")).toBeNull();
  });
  it("l'approvazione non richiede note", () => {
    expect(erroreDecisione("Approvato", "")).toBeNull();
  });
});

describe("costruisciAggiornamento", () => {
  const adesso = new Date("2026-10-20T12:00:00Z");
  const base = { tipoCorsoId: "t1", dataCorso: "2026-03-15", ore: "8", note: "  Corso non coerente  ", adesso };
  it("approvato: niente note, ore come numero, data di validazione in formato ISO", () => {
    expect(costruisciAggiornamento({ ...base, esito: "Approvato" })).toEqual({
      tipo_corso_id: "t1",
      data_corso: "2026-03-15",
      ore_dichiarate: 8,
      stato_validazione: "Approvato",
      note_rifiuto: null,
      data_validazione: "2026-10-20T12:00:00.000Z",
    });
  });
  it("respinto: le note vengono ripulite dagli spazi e salvate", () => {
    expect(costruisciAggiornamento({ ...base, esito: "Respinto" })).toMatchObject({
      stato_validazione: "Respinto",
      note_rifiuto: "Corso non coerente",
    });
  });
  it("ore vuote diventano null; decimali accettati", () => {
    expect(costruisciAggiornamento({ ...base, ore: "", esito: "Approvato" }).ore_dichiarate).toBeNull();
    expect(costruisciAggiornamento({ ...base, ore: "6.5", esito: "Approvato" }).ore_dichiarate).toBe(6.5);
  });
});

describe("descrizioneEsito", () => {
  it("senza invio email: solo conferma", () => {
    expect(descrizioneEsito(false, false)).toBe("Esito salvato.");
    expect(descrizioneEsito(false, true)).toBe("Esito salvato.");
  });
  it("con invio email: dipende dall'indirizzo", () => {
    expect(descrizioneEsito(true, true)).toContain("app di posta");
    expect(descrizioneEsito(true, false)).toContain("nessuna email preparata");
  });
});

/*
 * File:      nomine.miglioramenti.test.ts
 * Percorso:  src/features/nomine/nomine.miglioramenti.test.ts
 * Data creaz: 13/11/2026
 * Test di: titolo Prof./Prof.ssa dal codice fiscale, numero progressivo, intestazione con riga istituzionale e sito, modelli DAE/Evacuazione.
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { costruisciDocumento, testoDocumento } from "./documento";
import { generaPdfNomine } from "./genera-pdf";
import { righeIntestazione } from "./intestazione";
import { MODELLI_DEFAULT, modelloDefault } from "./modelli-default";
import { ELENCO_NOMINE } from "./tipi";
import { nomeLettera, nominatiDaOrganigramma } from "./nominativi";
import { sessoDaCodiceFiscale, titoloNominato } from "./titolo-nominato";

const CF_F = "SMNLCU80A41C816X"; // giorno 41 = 1 + 40 → donna
const CF_M = "GRGSVN75B10C816K"; // giorno 10 → uomo

describe("titolo dal codice fiscale", () => {
  it("riconosce il sesso dal giorno di nascita", () => {
    expect(sessoDaCodiceFiscale(CF_F)).toBe("F");
    expect(sessoDaCodiceFiscale(CF_M)).toBe("M");
    expect(sessoDaCodiceFiscale(" " + CF_F.toLowerCase())).toBe("F");
  });
  it("codice non leggibile o vuoto: sesso ignoto", () => {
    expect(sessoDaCodiceFiscale("")).toBeNull();
    expect(sessoDaCodiceFiscale(null)).toBeNull();
    expect(sessoDaCodiceFiscale("12345")).toBeNull();
  });
  it("Prof./Prof.ssa solo per i docenti; nessun titolo per ATA o se il sesso è ignoto", () => {
    expect(titoloNominato({ reparto: "Docente", codice_fiscale: CF_F })).toBe("Prof.ssa");
    expect(titoloNominato({ reparto: "Docente", codice_fiscale: CF_M })).toBe("Prof.");
    expect(titoloNominato({ reparto: "ATA", codice_fiscale: CF_F })).toBe("");
    expect(titoloNominato({ reparto: "Docente", codice_fiscale: "boh" })).toBe("");
  });
});

describe("nominati con titolo", () => {
  const dip = (id: string, cognome: string, nome: string, reparto: string, cf: string) =>
    ({ id, cognome, nome, reparto, codice_fiscale: cf }) as unknown as Dipendente;
  const ruoli = [{ id: "r1", nome: "Addetto Primo Soccorso", macro_categoria: "Primo Soccorso", obbligatorio_tutti: false, attivo: true }] as unknown as RuoloSicurezza[];
  const ass = [{ id: "a1", dipendente_id: "1", ruolo_id: "r1" }, { id: "a2", dipendente_id: "2", ruolo_id: "r1" }] as unknown as AssegnazioneRuolo[];
  const dati = { dipendenti: [dip("1", "Somenzi", "Lucia", "Docente", CF_F), dip("2", "Bardelli", "Mariacristina", "ATA", CF_F)], ruoli, assegnazioni: ass, voci: [] };
  it("il titolo c'è per il docente e non per l'ATA; l'indice resta senza titolo", () => {
    const voce = ELENCO_NOMINE.find((v) => v.tipo === "primo-soccorso")!;
    const n = nominatiDaOrganigramma(voce, dati);
    const somenzi = n.find((x) => x.nome === "Somenzi Lucia")!;
    const bardelli = n.find((x) => x.nome === "Bardelli Mariacristina")!;
    expect(somenzi.titolo).toBe("Prof.ssa");
    expect(bardelli.titolo).toBeUndefined();
    expect(nomeLettera(somenzi)).toBe("Prof.ssa Somenzi Lucia");
    expect(nomeLettera(somenzi, false)).toBe("Somenzi Lucia");
    expect(nomeLettera(bardelli)).toBe("Bardelli Mariacristina");
  });
});

describe("numero progressivo della lettera", () => {
  const ditta = { ragione_sociale: "Liceo X", comune: "Cremona", datore_di_lavoro: "Prof.ssa Nolli", e_scuola: true };
  it("compare in alto e vicino alla firma solo se indicato", () => {
    const con = testoDocumento(costruisciDocumento(modelloDefault("dpi"), ditta, { nome: "Rossi Mario", anno: "2026-2027", protocollo: "1803", data: "13/11/2026", numero: "201" }));
    expect(con).toContain("N° 201 prot. N° 1803");
    expect(con).toContain("Rossi Mario N° 201");
    const senza = testoDocumento(costruisciDocumento(modelloDefault("dpi"), ditta, { nome: "Rossi Mario", anno: "2026-2027", protocollo: "1803", data: "13/11/2026" }));
    expect(senza).not.toContain("N° 201");
    expect(senza).toContain("prot. N° 1803");
  });
  it("il PDF con numero si genera", async () => {
    const b = await generaPdfNomine(modelloDefault("sds"), ditta, [{ nome: "Rossi Mario", protocollo: "1803", numero: "237" }], { anno: "2026-2027", data: "13/11/2026" });
    expect(b.length).toBeGreaterThan(2000);
  });
});

describe("intestazione", () => {
  it("riga istituzionale sopra il nome e sito web tra i contatti", () => {
    const r = righeIntestazione({ ragione_sociale: "Liceo Aselli", intestazione_ufficiale: "MINISTERO DELL'ISTRUZIONE", telefono: "0372/22051", sito_web: "www.liceoaselli.edu.it" });
    expect(r[0]).toEqual({ testo: "MINISTERO DELL'ISTRUZIONE" });
    expect(r[1]).toMatchObject({ testo: "Liceo Aselli", grassetto: true });
    expect(r.map((x) => x.testo).join("|")).toContain("Sito: www.liceoaselli.edu.it");
  });
  it("senza i nuovi campi l'intestazione è quella di prima", () => {
    const r = righeIntestazione({ ragione_sociale: "Liceo Aselli" });
    expect(r[0]).toMatchObject({ testo: "Liceo Aselli", grassetto: true });
  });
});

describe("modelli corretti", () => {
  it("DAE: la dichiarazione riguarda il defibrillatore", () => {
    expect(MODELLI_DEFAULT.dae.formazione).toBe("ADDETTO ALL'USO DEL DEFIBRILLATORE");
  });
  it("Evacuazione: numero unico 112 e niente «cassette»", () => {
    const c = MODELLI_DEFAULT.evacuazione.corpo;
    expect(c).toContain("Numero Unico di Emergenza (112)");
    expect(c.toLowerCase()).not.toContain("cassette");
  });
});

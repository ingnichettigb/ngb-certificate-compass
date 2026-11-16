/*
 * File:      ruoli-organigramma.test.ts
 * Percorso:  src/features/stampe/ruoli-organigramma.test.ts
 * Data creaz: 16/11/2026
 * Revisioni:
 *   rev 1 — 16/11/2026 — Prove: registro antincendio, DPI e SDS come ruoli del DB (fonte unica di organigramma e Nomine).
 */
import { describe, expect, it } from "vitest";
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import type { VoceOrganigramma } from "@/lib/api/ditta";
import { nominatiDaOrganigramma } from "../nomine/nominativi";
import { voceElenco } from "../nomine/tipi";
import { dipendentiDelRuolo, nomiVoceRuolo } from "./organigramma-a3";
import {
  chiaveRuoloDaTitolo,
  collegaRuoliFissi,
  eVoceDaDb,
  NOME_RUOLO_DPI,
  NOME_RUOLO_REGISTRO,
  NOME_RUOLO_SDS,
} from "./ruoli-organigramma";
import { ruoliDelGruppo } from "./stampa-selezioni";

const dip = (id: string, cognome: string, nome: string, extra: Partial<Dipendente> = {}) =>
  ({
    id,
    cognome,
    nome,
    codice_fiscale: id,
    email: null,
    reparto: "ATA",
    sottoreparto: null,
    classe_concorso: null,
    materia: null,
    luogo_nascita: null,
    data_nascita: null,
    ...extra,
  }) as Dipendente;

const ruolo = (id: string, nome: string, macro: string | null = null): RuoloSicurezza => ({
  id,
  nome,
  descrizione: null,
  macro_categoria: macro,
  obbligatorio_tutti: false,
  attivo: true,
  ordine: 0,
});

const R_REG = ruolo("r-reg", NOME_RUOLO_REGISTRO);
const R_DPI = ruolo("r-dpi", NOME_RUOLO_DPI);
const R_SDS = ruolo("r-sds", NOME_RUOLO_SDS);
const ruoli = [ruolo("r-ant", "Addetto Antincendio", "Antincendio"), R_REG, R_DPI, R_SDS];

const SEDE_A = "sede-a";
const SEDE_B = "sede-b";
const ass = (id: string, dipendente_id: string, ruolo_id: string, sede_id: string): AssegnazioneRuolo => ({
  id,
  dipendente_id,
  ruolo_id,
  sede_id,
});

describe("nomi dei ruoli e gruppi della tavola", () => {
  it("i tre ruoli non finiscono in nessun riquadro delle squadre (nome senza parole dei gruppi, macro-categoria vuota)", () => {
    for (const gruppo of ["preposti", "primo-soccorso", "defibrillatore", "evacuazione", "antincendio", "privacy"]) {
      const nomi = ruoliDelGruppo(gruppo, ruoli).map((r) => r.nome);
      expect(nomi).not.toContain(NOME_RUOLO_REGISTRO);
      expect(nomi).not.toContain(NOME_RUOLO_DPI);
      expect(nomi).not.toContain(NOME_RUOLO_SDS);
    }
    // e il vero Antincendio resta al suo posto
    expect(ruoliDelGruppo("antincendio", ruoli).map((r) => r.nome)).toEqual(["Addetto Antincendio"]);
  });

  it("riconosce i titoli delle voci fisse", () => {
    expect(chiaveRuoloDaTitolo("Addetti registro antincendio")).toBe("registro");
    expect(chiaveRuoloDaTitolo("Responsabile distribuzione D.P.I.")).toBe("dpi");
    expect(chiaveRuoloDaTitolo("Responsabile custodia SDS")).toBe("sds");
    expect(chiaveRuoloDaTitolo("Evacuazione – figure di classe")).toBeNull();
  });
});

describe("collegaRuoliFissi", () => {
  const voci: VoceOrganigramma[] = [
    { titolo: "Evacuazione – figure di classe", nomi: ["Alunni aprifila"], tipo: "nota" },
    { titolo: "Addetti registro antincendio", nomi: [], tipo: "ruolo" },
    { titolo: "Responsabile distribuzione D.P.I.", nomi: ["Qualcuno"] },
    { titolo: "Responsabile custodia SDS", nomi: [], tipo: "ruolo", ruolo_id: "gia-collegato" },
  ];

  it("collega al ruolo le voci fisse senza ruolo_id e lascia stare note e voci già collegate", () => {
    const r = collegaRuoliFissi(voci, ruoli);
    expect(r[0]).toEqual(voci[0]);
    expect(r[1]).toMatchObject({ tipo: "ruolo", ruolo_id: "r-reg" });
    expect(r[2]).toMatchObject({ tipo: "ruolo", ruolo_id: "r-dpi", nomi: ["Qualcuno"] });
    expect(r[3]?.ruolo_id).toBe("gia-collegato");
  });

  it("se i ruoli non sono ancora nel DB non inventa collegamenti", () => {
    expect(collegaRuoliFissi(voci, [])).toEqual(voci);
    const senzaDpi = collegaRuoliFissi(voci, [R_REG]);
    expect(senzaDpi[2]?.ruolo_id).toBeUndefined();
  });

  it("una voce è «da DB» solo se azzurra e con ruolo_id", () => {
    expect(eVoceDaDb({ tipo: "ruolo", ruolo_id: "x" })).toBe(true);
    expect(eVoceDaDb({ ruolo_id: "x" })).toBe(true);
    expect(eVoceDaDb({ tipo: "nota", ruolo_id: "x" })).toBe(false);
    expect(eVoceDaDb({ tipo: "ruolo" })).toBe(false);
  });
});

describe("nomiVoceRuolo (nominativi dal DB, sempre MAIUSCOLO)", () => {
  const dipendenti = [
    dip("1", "Bardelli", "Mariacristina"),
    dip("2", "rossi", "mario"), // minuscolo nel DB: in tavola esce comunque MAIUSCOLO
    dip("3", "Cessato", "Gino", { stato_lavoratore: "cessato" }),
    dip("4", "Verdi", "Anna"),
    dip("5", "Verdi", "Alberto"), // stessa forma breve «VERDI A.» di Anna
  ];
  const assegnazioni = [
    ass("a1", "1", "r-dpi", SEDE_A),
    ass("a2", "2", "r-dpi", SEDE_A),
    ass("a3", "3", "r-dpi", SEDE_A),
    ass("a4", "1", "r-sds", SEDE_A),
    ass("a5", "4", "r-dpi", SEDE_B),
  ];

  it("più persone, in ordine alfabetico, solo in forza, MAIUSCOLO; forma breve, per esteso se due persone hanno la stessa", () => {
    expect(nomiVoceRuolo("r-dpi", dipendenti, assegnazioni)).toEqual(["BARDELLI M.", "ROSSI M.", "VERDI ANNA"]);
  });

  it("con una sede scelta contano solo gli incarichi di quella sede", () => {
    expect(nomiVoceRuolo("r-dpi", dipendenti, assegnazioni, SEDE_A)).toEqual(["BARDELLI M.", "ROSSI M."]);
    expect(nomiVoceRuolo("r-dpi", dipendenti, assegnazioni, SEDE_B)).toEqual(["VERDI ANNA"]);
  });

  it("ogni ruolo ha la sua lista", () => {
    expect(nomiVoceRuolo("r-sds", dipendenti, assegnazioni)).toEqual(["BARDELLI M."]);
    expect(nomiVoceRuolo("r-reg", dipendenti, assegnazioni)).toEqual([]);
  });

  it("dipendentiDelRuolo restituisce i lavoratori (non le etichette)", () => {
    expect(dipendentiDelRuolo("r-dpi", dipendenti, assegnazioni, SEDE_A).map((d) => d.id)).toEqual(["1", "2"]);
  });
});

describe("Nomine: stessa fonte dell'organigramma", () => {
  const dipendenti = [dip("1", "Bardelli", "Mariacristina"), dip("2", "Neri", "Paolo")];
  const assegnazioni = [ass("a1", "1", "r-dpi", SEDE_A), ass("a2", "2", "r-dpi", SEDE_A)];

  it("DPI: i nominati sono quelli del ruolo del DB (stessi della voce azzurra)", () => {
    const voci: VoceOrganigramma[] = [
      { titolo: "Responsabile distribuzione D.P.I.", nomi: [], tipo: "ruolo", ruolo_id: "r-dpi" },
    ];
    const n = nominatiDaOrganigramma(voceElenco("dpi")!, { dipendenti, ruoli, assegnazioni, voci });
    expect(n.map((x) => [x.nome, x.origine])).toEqual([
      ["Bardelli Mariacristina", "ruolo"],
      ["Neri Paolo", "ruolo"],
    ]);
    // e sono gli stessi nomi che escono nella tavola
    expect(nomiVoceRuolo("r-dpi", dipendenti, assegnazioni)).toEqual(["BARDELLI M.", "NERI P."]);
  });

  it("una voce collegata al ruolo non crea nominati «voce:<nome>» dai vecchi nomi non abbinati", () => {
    const voci: VoceOrganigramma[] = [
      { titolo: "Responsabile distribuzione D.P.I.", nomi: ["Nome Inesistente"], tipo: "ruolo", ruolo_id: "r-dpi" },
    ];
    const n = nominatiDaOrganigramma(voceElenco("dpi")!, { dipendenti, ruoli, assegnazioni, voci });
    expect(n.some((x) => x.id.startsWith("voce:"))).toBe(false);
  });

  it("una voce NON collegata (vecchio comportamento) continua a funzionare", () => {
    const voci: VoceOrganigramma[] = [{ titolo: "Responsabile custodia SDS", nomi: ["Neri Paolo", "Esterno Mario"] }];
    const n = nominatiDaOrganigramma(voceElenco("sds")!, { dipendenti, ruoli: [], assegnazioni: [], voci });
    expect(n.map((x) => x.nome)).toEqual(["Esterno Mario", "Neri Paolo"]);
  });

  it("le tre nomine puntano al ruolo del DB; le altre no", () => {
    expect(voceElenco("registro-antincendio")?.ruoloDb).toBe(NOME_RUOLO_REGISTRO);
    expect(voceElenco("dpi")?.ruoloDb).toBe(NOME_RUOLO_DPI);
    expect(voceElenco("sds")?.ruoloDb).toBe(NOME_RUOLO_SDS);
    expect(voceElenco("antincendio")?.ruoloDb).toBeUndefined();
  });
});

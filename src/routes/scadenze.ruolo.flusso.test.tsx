/*
 * File:      scadenze.ruolo.flusso.test.tsx
 * Percorso:  src/routes/scadenze.ruolo.flusso.test.tsx
 * Revisione: 1 — 28/11/2026 09:11
 * Data creazione: 28/11/2026 09:11
 * Test di flusso del filtro «Ruolo» della pagina Scadenze: ruoli dal catalogo (Tabella 01), corsi dalla Tabella 02,
 * solo incarichi realmente assegnati, menù Corso limitato al ruolo, viste «Scaduti o in scadenza», Esporta e Stampa.
 * La data «di oggi» è bloccata al 20/10/2026.
 * Revisioni:
 * - Rev 1 (28/11/2026 09:11): Prima stesura.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

const { dati } = vi.hoisted(() => {
  const att = (id: string, cognome: string, cf: string, corso: string, codice: string, dataCorso: string, anni: number) => ({
    id,
    codice_fiscale: cf,
    dipendente_id: "d-" + id,
    tipo_corso_id: "t-" + id,
    data_corso: dataCorso,
    ore_dichiarate: 8,
    stato_validazione: "Approvato",
    created_at: "2026-01-01",
    url_foto_fronte: "file.pdf",
    dipendenti: { cognome, nome: "X", reparto: "ATA", codice_fiscale: cf },
    tipi_corso: {
      nome_corso: corso,
      macro_categoria: "X",
      livello_specifico: "Base",
      codice,
      durata_validita_anni: anni,
      ore_aggiornamento: 6,
      ore_minime_legge: 6,
    },
  });
  const ruolo = (id: string, nome: string, codice: string, ordine: number) => ({
    id,
    nome,
    codice,
    descrizione: null,
    macro_categoria: nome,
    obbligatorio_tutti: false,
    attivo: true,
    ordine,
  });
  return {
    dati: {
      tabelle: {
        attestati_caricati: [
          att("1", "ROSSI", "RSSMRA80A01H501U", "Antincendio rischio basso", "ANT-BASE", "2021-01-10", 5), // scaduto, incarico assegnato
          att("2", "BIANCHI", "BNCNNA85B41F205X", "Primo soccorso", "PSO-BASE", "2023-10-01", 3), // scaduto, incarico assegnato
          att("3", "VERDI", "VRDLNE80A41H501X", "Antincendio rischio basso", "ANT-BASE", "2021-11-20", 5), // in scadenza (26/11/2026... entro 90 gg)
          att("4", "GIALLI", "GLLPLA80A01H501U", "Primo soccorso", "PSO-BASE", "2021-03-01", 3), // scaduto, incarico NON assegnato
          att("5", "NERI", "NRELCU80A01H501U", "Antincendio rischio basso", "ANT-BASE", "2021-01-10", 5), // scaduto, incarico NON assegnato
        ],
        ruoli_sicurezza: [
          ruolo("r-ant", "Addetto antincendio", "ADD-ANTINCENDIO", 1),
          ruolo("r-pso", "Addetto primo soccorso", "ADD-PRIMO-SOCCORSO", 2),
        ],
        dipendenti_ruoli: [
          { id: "a1", dipendente_id: "d-1", ruolo_id: "r-ant" },
          { id: "a2", dipendente_id: "d-3", ruolo_id: "r-ant" },
          { id: "a3", dipendente_id: "d-2", ruolo_id: "r-pso" },
        ],
        regole_ruolo_corso: [
          { id: "g1", ruolo_codice: "ADD-ANTINCENDIO", parametro: "corsi", valore: "", corso_base: "ANT-BASE", corso_aggiornamento: "ANT-AGG", ordine: 1 },
          { id: "g2", ruolo_codice: "ADD-PRIMO-SOCCORSO", parametro: "corsi", valore: "", corso_base: "PSO-BASE", corso_aggiornamento: "PSO-AGG", ordine: 2 },
        ],
      },
    },
  };
});

vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});
vi.mock("@tanstack/react-router", async (orig) => {
  const m: any = await orig();
  return { ...m, Link: ({ to, children, ...p }: any) => <a href={to} {...p}>{children}</a> };
});

import { Route } from "@/routes/scadenze";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const righe = () => [...document.querySelectorAll("table tbody tr")].map((tr) => tr.textContent?.replace(/\s+/g, " ").trim() ?? "");
const cognomi = () => righe().map((t) => t.match(/ROSSI|BIANCHI|VERDI|GIALLI|NERI/)?.[0]);
const intestazione = () => document.querySelector("header")?.textContent?.replace(/\s+/g, " ").trim() ?? "";

async function scegli(indiceCombo: number, opzione: string) {
  fireEvent.keyDown(screen.getAllByRole("combobox")[indiceCombo]!, { key: "Enter" });
  await attendi();
  fireEvent.keyDown(screen.getByRole("option", { name: opzione }), { key: "Enter" });
  await attendi();
}
const opzioni = async (indiceCombo: number) => {
  fireEvent.keyDown(screen.getAllByRole("combobox")[indiceCombo]!, { key: "Enter" });
  await attendi();
  const nomi = screen.getAllByRole("option").map((o) => o.textContent);
  fireEvent.keyDown(screen.getAllByRole("option")[0]!, { key: "Escape" });
  await attendi();
  return nomi;
};

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

async function apri() {
  const Pagina = Route.options.component as () => ReactElement;
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Pagina />
    </QueryClientProvider>,
  );
  await screen.findByText("Scadenze attestati");
  await attendi();
}

describe("Scadenze: filtro Ruolo", () => {
  it("l'ordine dei menù è periodo, reparto, ruolo, corso", async () => {
    await apri();
    const combo = screen.getAllByRole("combobox").map((c) => c.textContent);
    expect(combo).toEqual(["Scaduti", "Tutti i reparti", "Tutti i ruoli", "Tutti i corsi"]);
  });

  it("i ruoli vengono dal catalogo, nell'ordine di tabella", async () => {
    await apri();
    expect(await opzioni(2)).toEqual(["Tutti i ruoli", "Addetto antincendio", "Addetto primo soccorso"]);
  });

  it("scelto un ruolo: solo persone con l'incarico realmente assegnato e corsi scaduti di quel ruolo", async () => {
    await apri();
    await scegli(2, "Addetto antincendio");
    expect(cognomi()).toEqual(["ROSSI"]); // VERDI non è scaduto; NERI scaduto ma senza l'incarico assegnato
    expect(intestazione()).toContain("Ruolo: Addetto antincendio");
  });

  it("«Scaduti o in scadenza» mostra anche chi sta per scadere, per persona in ordine alfabetico", async () => {
    await apri();
    await scegli(2, "Addetto antincendio");
    await scegli(0, "Scaduti o in scadenza (90 gg)");
    expect(cognomi()).toEqual(["ROSSI", "VERDI"]);
  });

  it("il menù Corso propone solo i corsi del ruolo e si azzera cambiando ruolo", async () => {
    await apri();
    await scegli(2, "Addetto antincendio");
    expect(await opzioni(3)).toEqual(["Tutti i corsi", "Antincendio rischio basso"]);
    await scegli(3, "Antincendio rischio basso");
    expect(screen.getAllByRole("combobox")[3]!.textContent).toBe("Antincendio rischio basso");
    await scegli(2, "Addetto primo soccorso");
    expect(screen.getAllByRole("combobox")[3]!.textContent).toBe("Tutti i corsi");
    expect(await opzioni(3)).toEqual(["Tutti i corsi", "Primo soccorso"]);
    expect(cognomi()).toEqual(["BIANCHI"]); // GIALLI è scaduto ma l'incarico non gli è assegnato
  });

  it("con un ruolo la spunta «Solo incarichi attualmente assegnati» è attiva e bloccata", async () => {
    await apri();
    const spunta = () => screen.getByRole("checkbox");
    expect(spunta().hasAttribute("disabled")).toBe(false);
    await scegli(2, "Addetto antincendio");
    expect(spunta().getAttribute("aria-checked")).toBe("true");
    expect(spunta().hasAttribute("disabled")).toBe(true);
    await scegli(2, "Tutti i ruoli");
    expect(spunta().hasAttribute("disabled")).toBe(false);
  });

  it("Esporta e Stampa sono disponibili; Stampa apre la stampa del browser", async () => {
    await apri();
    const stampa = vi.fn();
    vi.stubGlobal("print", stampa);
    expect(screen.getByRole("button", { name: /Esporta/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Stampa/ }));
    expect(stampa).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

/*
 * Test di flusso della pagina Scadenze attestati.
 * Registra, per ogni scelta dell'utente (periodo, corso, reparto, ricerca, ordinamento),
 * l'elenco di righe mostrato e lo confronta con lo snapshot.
 * La data «di oggi» è bloccata al 20/10/2026 per avere risultati stabili.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

const { dati } = vi.hoisted(() => {
  const att = (id: string, cognome: string, nome: string, cf: string, reparto: string | null, corso: string | null, dataCorso: string | null, scad: string | null) => ({
    id, codice_fiscale: cf, dipendente_id: "d-" + id, tipo_corso_id: "t-" + id, data_corso: dataCorso, data_scadenza_calcolata: scad,
    ore_dichiarate: 8, stato_validazione: "Approvato", created_at: "2026-01-01",
    dipendenti: { cognome, nome, reparto, codice_fiscale: cf },
    tipi_corso: corso ? { nome_corso: corso, macro_categoria: "X", livello_specifico: "Base" } : null,
  });
  return {
    dati: {
      tabelle: {
        attestati_caricati: [
          att("1", "ROSSI", "MARIO", "RSSMRA80A01H501U", "Docente", "Antincendio rischio basso", "2021-01-10", "2026-01-10"),
          att("2", "BIANCHI", "ANNA", "BNCNNA85B41F205X", "ATA", "Primo soccorso", "2023-10-01", "2026-10-19"),
          att("3", "VERDI", "ELENA", "VRDLNE80A41H501X", "Docente", "Antincendio rischio basso", "2021-11-20", "2026-11-15"),
          att("4", "NERI", "LUCA", "NRELCU80A01H501U", "ATA", "Preposto", "2022-01-18", "2027-01-18"),
          att("5", "GIALLI", "PAOLO", "GLLPLA80A01H501U", "docente", "Primo soccorso", "2024-03-01", "2027-03-01"),
          att("6", "BRUNI", "SARA", "BRNSRA80A41H501X", "Studente", "primo SOCCORSO", "2022-09-01", "2027-09-01"),
          att("7", "VIOLA", "TINA", "VLITNA80A41H501X", "45123", "Antincendio rischio basso", "2025-05-05", "2030-01-01"),
          att("8", "ARANCI", "UGO", "RNCGUO80A01H501U", null, null, null, "2026-10-20"),
          att("9", "SENZA", "SCADENZA", "SNZSCD80A01H501U", "ATA", "Preposto", "2025-01-01", null),
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

import { registro } from "@/test/registratore-supabase";
import { Route } from "@/routes/scadenze";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const righe = () => [...document.querySelectorAll("table tbody tr")].map((tr) => tr.textContent?.replace(/\s+/g, " ").trim());
const intestazione = () => document.querySelector("header")?.textContent?.replace(/\s+/g, " ").trim();
const foto = (etichetta: string) => registro.push([etichetta, intestazione(), righe()]);

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
  registro.length = 0;
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Scadenze: percorso d'uso completo", () => {
  it("registra tutto quello che la pagina mostra", async () => {
    const Pagina = Route.options.component as () => ReactElement;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Pagina />
      </QueryClientProvider>,
    );
    registro.push(["caricamento", document.body.textContent?.replace(/\s+/g, " ")]);
    await screen.findByText("Scadenze attestati");
    await attendi();
    foto("vista iniziale (Scaduti, per scadenza crescente)");

    registro.push(["opzioni periodo", await opzioni(0)]);
    registro.push(["opzioni corso", await opzioni(1)]);
    registro.push(["opzioni reparto", await opzioni(2)]);

    for (const v of ["In scadenza (90 gg)", "In scadenza (6 mesi)", "In scadenza (1 anno)", "Tutti con scadenza", "Scaduti"]) {
      await scegli(0, v);
      foto("periodo " + v);
    }

    await scegli(0, "Tutti con scadenza");
    await scegli(1, "Primo soccorso");
    foto("corso Primo soccorso (indipendente da maiuscole)");
    await scegli(2, "Docente");
    foto("corso Primo soccorso + reparto Docente");
    await scegli(1, "Tutti i corsi");
    foto("solo reparto Docente (indipendente da maiuscole)");
    await scegli(2, "Tutti i reparti");

    const cerca = screen.getByPlaceholderText("Cerca dipendente, CF o corso");
    for (const t of ["ross", "  VRDLNE ", "antincendio", "preposto", "zzz", "mario rossi", ""]) {
      fireEvent.change(cerca, { target: { value: t } });
      await attendi();
      foto("ricerca «" + t + "»");
    }

    for (const col of ["Dipendente", "Dipendente", "Codice fiscale", "Reparto", "Reparto", "Corso", "Data corso", "Data corso", "Scadenza", "Scadenza"]) {
      await clic(screen.getByTitle("Ordina per " + col));
      foto("ordinato per " + col);
    }

    await scegli(0, "In scadenza (1 anno)");
    await scegli(1, "Preposto");
    foto("combinazione 1 anno + Preposto");
    await scegli(2, "ATA");
    foto("combinazione 1 anno + Preposto + ATA");

    expect(registro).toMatchSnapshot();
  });
});

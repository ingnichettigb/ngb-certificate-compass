/*
 * Test di flusso della pagina Dipendenti.
 * Registra chiamate al database, notifiche e contenuto della pagina durante un percorso d'uso
 * (ricerca, filtri, scheda, ruoli, DVR, ordinamento, cambio reparto, nuovo dipendente)
 * e le confronta con lo snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

const { dati } = vi.hoisted(() => {
  const tc = (id: string, nome: string, macro: string, livello: string) => ({ id, nome_corso: nome, macro_categoria: macro, livello_specifico: livello, ore_minime_legge: 8, durata_validita_anni: 5 });
  const att = (id: string, dip: string, tipo: ReturnType<typeof tc>, corso: string, scad: string | null, stato = "Approvato") => ({
    id, dipendente_id: dip, codice_fiscale: "X", tipo_corso_id: tipo.id, data_corso: corso, data_scadenza_calcolata: scad,
    ore_dichiarate: 8, url_foto_fronte: null, url_foto_retro: null, stato_validazione: stato, note_rifiuto: null, data_validazione: null,
    created_at: "2026-01-01", tipi_corso: tipo,
  });
  const antincendio = tc("t1", "Antincendio rischio basso", "Antincendio", "Base");
  const soccorso = tc("t2", "Primo Soccorso gruppo B", "Primo Soccorso", "Base");
  const dip = (id: string, cognome: string, nome: string, cf: string, reparto: string | null) => ({
    id, cognome, nome, codice_fiscale: cf, reparto, email: null, sottoreparto: null, classe_concorso: null, materia: null,
    luogo_nascita: "Cremona", data_nascita: "1980-01-01", codice_ateco: "",
  });
  const dati = {
    tabelle: {
      reparti: [
        { id: "rp1", nome: "Docente", ordine: 1, attivo: true, richiede_classe_concorso: true },
        { id: "rp2", nome: "ATA", ordine: 2, attivo: true, richiede_classe_concorso: false },
        { id: "rp3", nome: "Dismesso", ordine: 3, attivo: false, richiede_classe_concorso: false },
      ],
      dipendenti: [
        dip("d1", "ROSSI", "MARIO", "RSSMRA80A01H501U", "Docente"),
        dip("d2", "BIANCHI", "ANNA", "BNCNNA85B41F205X", "ATA"),
        dip("d3", "VERDI", "ELENA", "VRDLNE80A41H501X", ""),
        dip("d4", "NERI", "LUCA", "NRELCU80A01H501U", "Studente"),
      ],
      attestati_caricati: [
        att("a1", "d1", antincendio, "2024-05-18", "2029-05-18"),
        att("a2", "d1", soccorso, "2021-03-10", "2024-03-10"),
        att("a3", "d2", antincendio, "2025-09-12", "2030-09-12"),
        att("a4", "d1", soccorso, "2026-01-20", null, "In attesa"),
      ],
      ruoli_sicurezza: [
        { id: "ru1", nome: "Addetto antincendio", descrizione: null, macro_categoria: "Antincendio", obbligatorio_tutti: false, attivo: true, ordine: 1 },
        { id: "ru2", nome: "Lavoratore", descrizione: null, macro_categoria: null, obbligatorio_tutti: true, attivo: true, ordine: 2 },
        { id: "ru3", nome: "Preposto", descrizione: null, macro_categoria: "Preposto", obbligatorio_tutti: false, attivo: true, ordine: 3 },
      ],
      dipendenti_ruoli: [
        { id: "as1", dipendente_id: "d1", ruolo_id: "ru1" },
        { id: "as2", dipendente_id: "d1", ruolo_id: "ru3" },
        { id: "as3", dipendente_id: "d2", ruolo_id: "ru1" },
      ],
      integrazioni_dvr: [
        { id: "i1", dipendente_id: "d1", attestato_origine_id: "a1", tipo_corso_nome: "Antincendio rischio basso", descrizione: "Integrazione 4 ore", ore: 4, argomenti_mancanti: ["Rischio elettrico", "Movimentazione"], stato: "Da completare", data_richiesta: "2026-09-01", attestato_chiusura_id: null, data_chiusura: null, created_at: "2026-09-01" },
        { id: "i2", dipendente_id: "d1", attestato_origine_id: null, tipo_corso_nome: null, descrizione: "Integrazione 2 ore", ore: 2, argomenti_mancanti: [], stato: "Completata", data_richiesta: "2025-02-01", attestato_chiusura_id: null, data_chiusura: "2025-03-01", created_at: "2025-02-01" },
      ],
      documenti_attestati: [],
      categorie_corso: [],
      tipi_corso: [],
    },
  };
  return { dati };
});

vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});
vi.mock("sonner", async () => {
  const { creaToastFinto } = await import("@/test/registratore-supabase");
  return { toast: creaToastFinto(vi) };
});
vi.mock("@tanstack/react-router", async (orig) => {
  const m: any = await orig();
  return { ...m, Link: ({ to, children, ...p }: any) => <a href={to} {...p}>{children}</a> };
});

import { registro } from "@/test/registratore-supabase";
import { Route } from "@/routes/dipendenti";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const lista = () => [...document.querySelectorAll("ul.divide-y > li")].map((li) => li.textContent?.replace(/\s+/g, " ").trim());
const righeTabella = () => [...document.querySelectorAll("table tbody tr")].map((tr) => tr.textContent?.replace(/\s+/g, " ").trim());
const pagina = (etichetta: string) => registro.push(["pagina", etichetta, document.body.textContent?.replace(/\s+/g, " ")]);

async function scegli(indiceCombo: number, opzione: string) {
  const trigger = screen.getAllByRole("combobox")[indiceCombo]!;
  fireEvent.keyDown(trigger, { key: "Enter" });
  await attendi();
  fireEvent.keyDown(screen.getByRole("option", { name: opzione }), { key: "Enter" });
  await attendi();
}

beforeEach(() => {
  registro.length = 0;
  vi.spyOn(window, "confirm").mockReturnValue(true);
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Dipendenti: percorso d'uso completo", () => {
  it("registra tutto quello che la pagina fa", async () => {
    const Pagina = Route.options.component as () => ReactElement;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Pagina />
      </QueryClientProvider>,
    );
    await screen.findByText("ROSSI MARIO");
    pagina("iniziale");

    // ricerca
    const cerca = screen.getByPlaceholderText(/Cerca per cognome/);
    fireEvent.change(cerca, { target: { value: "ros" } });
    registro.push(["lista: ricerca ros", lista()]);
    fireEvent.change(cerca, { target: { value: "vrdlne" } });
    registro.push(["lista: ricerca CF", lista()]);
    fireEvent.change(cerca, { target: { value: "zzz" } });
    registro.push(["lista: ricerca vuota", lista()]);
    fireEvent.change(cerca, { target: { value: "" } });

    // filtri reparto
    for (const r of ["ATA", "Studente", "Senza reparto", "Tutti i reparti"]) {
      await scegli(0, r);
      registro.push(["lista: reparto " + r, lista()]);
    }
    // filtri ruolo
    for (const r of ["Preposto", "Addetto antincendio", "Con corsi mancanti", "Tutti i ruoli"]) {
      await scegli(1, r);
      registro.push(["lista: ruolo " + r, lista()]);
    }

    // scheda di ROSSI
    await clic(screen.getByText("ROSSI MARIO").closest("button")!);
    pagina("scheda ROSSI");
    registro.push(["tabella iniziale", righeTabella()]);

    // ordinamento della tabella attestati
    for (const col of ["Corso", "Corso", "Data", "Data", "Scadenza", "Scadenza", "Stato"]) {
      await clic(screen.getByTitle("Ordina per " + col));
      registro.push(["tabella ordinata per " + col, righeTabella()]);
    }

    // ruoli: spunta e togli
    const caselle = screen.getAllByRole("checkbox");
    await clic(caselle[0]!);
    await clic(caselle[2]!);
    await clic(screen.getByText("Segna completata"));

    // cambio reparto del dipendente selezionato
    const comboScheda = screen.getAllByRole("combobox").length - 1;
    await scegli(comboScheda, "ATA");
    await scegli(comboScheda, "Nessun reparto");

    // altra scheda (BIANCHI, scaduto) e scheda senza dati (NERI)
    await clic(screen.getByText("BIANCHI ANNA").closest("button")!);
    pagina("scheda BIANCHI");
    await clic(screen.getByText("NERI LUCA").closest("button")!);
    pagina("scheda NERI");

    // nuovo dipendente
    await clic(screen.getByText("Nuovo"));
    pagina("form nuovo");
    await clic(screen.getByText("Salva"));
    const campo = (etichetta: string) => screen.getByText(etichetta, { selector: "label" }).parentElement!.querySelector("input")!;
    fireEvent.change(campo("Cognome"), { target: { value: "Gialli" } });
    fireEvent.change(campo("Nome"), { target: { value: "Paolo" } });
    fireEvent.change(campo("Codice fiscale"), { target: { value: "glllpa80a01h501u" } });
    fireEvent.change(campo("Email"), { target: { value: "p@x.it" } });
    fireEvent.change(campo("Codice ATECO"), { target: { value: "85.20" } });
    fireEvent.change(campo("Luogo di nascita"), { target: { value: "Soresina" } });
    fireEvent.change(campo("Data di nascita"), { target: { value: "1980-01-01" } });
    await scegli(screen.getAllByRole("combobox").length - 1, "Docente");
    pagina("form compilato");
    await clic(screen.getByText("Salva"));
    pagina("dopo salvataggio");
    await clic(screen.getByText("Nuovo"));
    await clic(screen.getByText("Annulla"));
    pagina("dopo annulla");

    expect(registro).toMatchSnapshot();
  });
});

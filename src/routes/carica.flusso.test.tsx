/*
 * Test di flusso della pagina «Carica il tuo attestato» (modulo del lavoratore).
 * Registra chiamate al database/storage, notifiche e contenuto della pagina durante un percorso
 * completo (validazioni, scelta reparto/corso, invio) e le confronta con lo snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";

const { dati } = vi.hoisted(() => {
  const corso = (id: string, nome: string, macro: string, livello: string, ore: number | null, anni: number | null, visibile = true) => ({
    id, nome_corso: nome, macro_categoria: macro, livello_specifico: livello, ore_minime_legge: ore, durata_validita_anni: anni,
    codice: null, ordine: 1, anni_aggiornamento: null, ore_aggiornamento: null, codice_corso_aggiornamento: null, visibile_lavoratore: visibile,
  });
  return {
    dati: {
      tabelle: {
        tipi_corso: [
          corso("t1", "Antincendio rischio basso", "Antincendio", "Base", 4, 5),
          corso("t2", "Antincendio rischio medio", "Antincendio", "Base", 8, 5),
          corso("t3", "Antincendio aggiornamento", "Antincendio", "Aggiornamento", 2, 5),
          corso("t4", "Antincendio nascosto", "Antincendio", "Specifico", 8, 5, false),
          corso("t5", "Primo soccorso gruppo B", "Primo Soccorso", "Base", 12, 3),
          corso("t6", "Preposto", "Preposto", "Specifico", 8, null),
        ],
        reparti: [
          { id: "rp1", nome: "Docente", ordine: 1, attivo: true, richiede_classe_concorso: true },
          { id: "rp2", nome: "ATA", ordine: 2, attivo: true, richiede_classe_concorso: false },
          { id: "rp3", nome: "Dismesso", ordine: 3, attivo: false, richiede_classe_concorso: false },
        ],
        sottoreparti: [
          { id: "sr1", reparto_id: "rp2", codice: "AA", nome: "Assistente amministrativo", ordine: 1, attivo: true },
          { id: "sr2", reparto_id: "rp2", codice: "CS", nome: "Collaboratore scolastico", ordine: 2, attivo: true },
          { id: "sr3", reparto_id: "rp2", codice: "XX", nome: "Disattivato", ordine: 3, attivo: false },
        ],
        classi_concorso: [
          { id: "c1", codice: "A022", denominazione: "Italiano", usi: 3, da_lavoratore: false, attivo: true },
          { id: "c2", codice: "A026", denominazione: "Matematica", usi: 9, da_lavoratore: false, attivo: true },
          { id: "c3", codice: "B012", denominazione: null, usi: 0, da_lavoratore: true, attivo: false },
        ],
        materie: [
          { id: "m1", nome: "Italiano", classe_concorso: "A022", usi: 2, da_lavoratore: true, attivo: true },
          { id: "m2", nome: "Matematica", classe_concorso: "A026", usi: 5, da_lavoratore: true, attivo: true },
        ],
        categorie_corso: [{ macro_categoria: "Primo Soccorso", visibile_lavoratore: false }],
      },
      singoli: { dipendenti: { id: "dip-1", codice_fiscale: "RSSMRA80A01H501U", cognome: "Rossi", nome: "Mario" } },
    },
  };
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
import { Route } from "@/routes/carica";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const pagina = (etichetta: string) => registro.push(["pagina", etichetta, document.body.textContent?.replace(/\s+/g, " ")]);
const campo = (etichetta: string) =>
  screen.getByText(etichetta, { selector: "label" }).parentElement!.querySelector("input")! as HTMLInputElement;
const digita = async (el: Element, v: string) => { fireEvent.change(el, { target: { value: v } }); await attendi(); };
const invia = async () => { fireEvent.submit(document.querySelector("form")!); await attendi(); };
const valori = (etichetta: string) => registro.push(["valori", etichetta, JSON.stringify([...document.querySelectorAll("form input:not([type=file])")].map((i) => (i as HTMLInputElement).value))]);

async function scegli(etichettaCampo: string, opzione: string) {
  const blocco = screen.getByText(etichettaCampo, { selector: "label" }).parentElement!;
  const trigger = within(blocco).getByRole("combobox");
  fireEvent.keyDown(trigger, { key: "Enter" });
  await attendi();
  fireEvent.keyDown(screen.getByRole("option", { name: opzione }), { key: "Enter" });
  await attendi();
}
const opzioni = async (etichettaCampo: string) => {
  const blocco = screen.getByText(etichettaCampo, { selector: "label" }).parentElement!;
  fireEvent.keyDown(within(blocco).getByRole("combobox"), { key: "Enter" });
  await attendi();
  const nomi = screen.getAllByRole("option").map((o) => o.textContent);
  fireEvent.keyDown(screen.getAllByRole("option")[0]!, { key: "Escape" });
  await attendi();
  return nomi;
};
const foto = (nome: string) => new File(["x"], nome, { type: "image/jpeg" });

beforeEach(() => {
  registro.length = 0;
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  URL.createObjectURL = vi.fn(() => "blob:anteprima");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(Date, "now").mockReturnValue(1792000000000);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Carica attestato (lavoratore): percorso d'uso completo", () => {
  it("registra tutto quello che la pagina fa", async () => {
    const Pagina = Route.options.component as () => ReactElement;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Pagina />
      </QueryClientProvider>,
    );
    await screen.findByText("1. I tuoi dati");
    await attendi();
    pagina("iniziale");
    registro.push(["opzioni reparto", await opzioni("Reparto *")]);
    registro.push(["opzioni categoria", await opzioni("Categoria del corso *")]);

    // validazioni nell'ordine in cui compaiono
    await invia();
    await digita(campo("Codice fiscale *"), "abc");
    await invia();
    await digita(campo("Codice fiscale *"), "rssmra80a01h501u");
    await digita(campo("Cognome *"), "Rossi");
    await digita(campo("Nome *"), "Mario");
    await digita(campo("Email"), " mario@x.it ");
    await invia();

    // ATA: serve il profilo; poi Docente: classe e materia; il cambio reparto azzera i campi dipendenti
    await scegli("Reparto *", "ATA");
    pagina("reparto ATA");
    registro.push(["opzioni profilo", await opzioni("Profilo / sottoreparto *")]);
    await invia();
    await scegli("Profilo / sottoreparto *", "AA — Assistente amministrativo");
    await scegli("Reparto *", "Docente");
    pagina("reparto Docente");
    await invia();
    await digita(screen.getByPlaceholderText("es. A-26"), "a-26");
    valori("classe digitata");
    await invia();
    await digita(screen.getByPlaceholderText("es. Matematica"), "Matematica");
    await invia();
    await scegli("Reparto *", "ATA");
    valori("dopo cambio reparto (campi azzerati)");
    await scegli("Profilo / sottoreparto *", "CS — Collaboratore scolastico");
    await scegli("Reparto *", "Docente");
    await digita(screen.getByPlaceholderText("es. A-26"), "a-26");
    await digita(screen.getByPlaceholderText("es. Matematica"), "Matematica");
    await digita(campo("Luogo di nascita"), "Soresina");
    await digita(campo("Data di nascita"), "1980-01-01");

    // corso: categoria -> livello -> corso (le ore si precompilano), poi data e scadenza calcolata
    await scegli("Categoria del corso *", "Antincendio");
    pagina("categoria Antincendio");
    await clic(screen.getByRole("radio", { name: "Aggiornamento" }));
    pagina("livello Aggiornamento");
    await clic(screen.getByRole("radio", { name: "Base" }));
    pagina("livello Base");
    await clic(screen.getByRole("radio", { name: /rischio medio/ }));
    valori("corso scelto (ore precompilate)");
    await digita(campo("Data del corso *"), "2026-03-15");
    await digita(campo("Ore dichiarate"), "6");
    pagina("scadenza calcolata");
    await scegli("Categoria del corso *", "Preposto");
    pagina("cambio categoria (corso azzerato)");
    await scegli("Categoria del corso *", "Antincendio");
    await clic(screen.getByRole("radio", { name: "Base" }));
    await clic(screen.getByRole("radio", { name: /rischio basso/ }));
    await digita(campo("Data del corso *"), "2026-03-15");

    // senza foto: errore; poi con foto fronte e retro: invio
    await invia();
    fireEvent.change(document.getElementById("upload-Fronte")!, { target: { files: [foto("fronte.jpg")] } });
    await attendi();
    fireEvent.change(document.getElementById("upload-Retro")!, { target: { files: [foto("retro.jpg")] } });
    await attendi();
    pagina("foto allegate");
    await clic(screen.getAllByLabelText("Rimuovi immagine")[0]!);
    pagina("rimossa una foto");
    fireEvent.change(document.getElementById("upload-Fronte")!, { target: { files: [foto("fronte2.jpg")] } });
    await attendi();
    await invia();
    pagina("dopo invio");

    // «Carica un altro attestato»: torna il modulo senza il corso
    await clic(screen.getByText("Carica un altro attestato"));
    pagina("secondo attestato");
    valori("secondo attestato");

    expect(registro).toMatchSnapshot();
  });
});

/*
 * Test di flusso della finestra Impostazioni (Reparti, Classi e materie, Categorie, Ruoli).
 * Registra letture, scritture e notifiche durante un percorso d'uso e le confronta con lo snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const { dati } = vi.hoisted(() => {
  const dati = {
    tabelle: {
      reparti: [
        { id: "rp1", nome: "Docente", ordine: 1, attivo: true, richiede_classe_concorso: true },
        { id: "rp2", nome: "ATA", ordine: 2, attivo: false, richiede_classe_concorso: false },
      ],
      sottoreparti: [{ id: "sr1", reparto_id: "rp2", codice: "AA", nome: "Assistente amministrativo", ordine: 1, attivo: true }],
      dipendenti: [
        { id: "d1", cognome: "ROSSI", nome: "MARIO", codice_fiscale: "RSSMRA80A01H501U", reparto: "Studente" },
        { id: "d2", cognome: "NERI", nome: "LUCA", codice_fiscale: "NRELCU80A01H501U", reparto: "Docente" },
        { id: "d3", cognome: "VERDI", nome: "ELENA", codice_fiscale: "VRDLNE80A41H501X", reparto: "45123" },
      ],
      classi_concorso: [
        { id: "c1", codice: "A022", denominazione: "Italiano", usi: 3, da_lavoratore: false, attivo: true },
        { id: "c2", codice: "B012", denominazione: null, usi: 0, da_lavoratore: true, attivo: false },
      ],
      materie: [{ id: "m1", nome: "Italiano", classe_concorso: "A022", usi: 2, da_lavoratore: true, attivo: true }],
      tipi_corso: [{ macro_categoria: "Antincendio" }, { macro_categoria: "Antincendio" }, { macro_categoria: "Primo Soccorso" }],
      categorie_corso: [{ macro_categoria: "Primo Soccorso", visibile_lavoratore: false }],
      ruoli_sicurezza: [{ id: "ru1", nome: "Preposto", categoria: "Preposto", ordine: 1, attivo: true }],
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

import { registro } from "@/test/registratore-supabase";
import { ImpostazioniDialog } from "@/components/ImpostazioniDialog";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const scheda = async (nome: string) => { fireEvent.mouseDown(screen.getByRole("tab", { name: nome })); await attendi(); };
const testo = (etichetta: string) =>
  registro.push(["pagina", etichetta, (document.querySelector("[role=dialog]")?.textContent ?? "").replace(/\s+/g, " ")]);
const interruttori = () => within(document.querySelector("[role=dialog]") as HTMLElement).getAllByRole("switch");

beforeEach(() => {
  registro.length = 0;
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Impostazioni: percorso d'uso completo", () => {
  it("registra tutto quello che la finestra fa", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ImpostazioniDialog />
      </QueryClientProvider>,
    );
    await clic(screen.getByText("Impostazioni generali"));
    await screen.findByText("Docente");
    testo("reparti: iniziale");

    // Reparti: apre, cambia, aggiunge, elimina
    await clic(screen.getByText("ATA").closest("button")!);
    testo("reparti: ATA aperto");
    const interr = interruttori();
    await clic(interr[0]!); // Docente nel modulo
    await clic(interr[1]!); // ATA nel modulo
    await clic(interr[2]!); // chiedi classe di concorso
    await clic(interr[3]!); // sottoreparto
    await clic(screen.getByLabelText("Elimina Assistente amministrativo"));
    fireEvent.change(screen.getByPlaceholderText("Sigla"), { target: { value: "at" } });
    fireEvent.change(screen.getByPlaceholderText(/Nuovo sottoreparto/), { target: { value: "Assistente tecnico" } });
    await clic(screen.getByPlaceholderText(/Nuovo sottoreparto/).parentElement!.querySelector("button")!);
    await clic(screen.getByLabelText("Elimina ATA"));
    fireEvent.change(screen.getByPlaceholderText(/Nuovo reparto/), { target: { value: "Segreteria" } });
    await clic(screen.getAllByRole("button", { name: /Aggiungi/ })[0]!);
    await clic(screen.getByText("+ Studente"));
    testo("reparti: dopo le azioni");

    // Classi di concorso e materie
    await scheda("Classi e materie");
    testo("insegnamento: iniziale");
    fireEvent.change(screen.getByPlaceholderText("Cerca…"), { target: { value: "b01" } });
    testo("insegnamento: filtro");
    fireEvent.change(screen.getByPlaceholderText("Cerca…"), { target: { value: "" } });
    await clic(screen.getByLabelText("Mostra A022 nel modulo"));
    await clic(screen.getByLabelText("Elimina A022"));
    await clic(screen.getByLabelText("Elimina Italiano"));
    fireEvent.change(screen.getByPlaceholderText("A-26"), { target: { value: "a-26" } });
    fireEvent.change(screen.getByPlaceholderText("Denominazione (facoltativa)"), { target: { value: "Matematica" } });
    await clic(screen.getAllByRole("button", { name: /Aggiungi/ }).at(-1)!);
    testo("insegnamento: dopo le azioni");

    // Categorie dei corsi
    await scheda("Categorie corsi");
    testo("categorie: iniziale");
    await clic(interruttori()[0]!);
    await clic(interruttori()[1]!);
    testo("categorie: dopo le azioni");

    // Ruoli
    await scheda("Ruoli");
    testo("ruoli: iniziale");

    expect(registro).toMatchSnapshot();
  });
});

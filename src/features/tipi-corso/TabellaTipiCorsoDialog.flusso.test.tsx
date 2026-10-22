/*
 * Test di flusso della «Tabella corsi» (tipi di corso): modifica delle celle, interruttore,
 * spostamento con frecce e trascinamento, eliminazione, aggiunta, stato di errore.
 * Registra chiamate al database, notifiche e contenuto della finestra e le confronta con lo snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { dati } = vi.hoisted(() => {
  const c = (id: string, ordine: number, nome: string, macro: string, livello: string, extra: Record<string, unknown> = {}) => ({
    id, ordine, nome_corso: nome, macro_categoria: macro, livello_specifico: livello, codice: null, ore_minime_legge: null,
    durata_validita_anni: null, anni_aggiornamento: null, ore_aggiornamento: null, codice_corso_aggiornamento: null, visibile_lavoratore: true, ...extra,
  });
  return {
    dati: {
      tabelle: {
        tipi_corso: [
          c("t1", 1, "Formazione generale", "Formazione Lavoratori", "Base", { codice: "FSL1", ore_minime_legge: 4 }),
          c("t2", 2, "Formazione specifica rischio basso", "Formazione Lavoratori", "Specifico", { codice: "FSL2", ore_minime_legge: 4, durata_validita_anni: 5, anni_aggiornamento: 5, ore_aggiornamento: 6, codice_corso_aggiornamento: "FSL2A" }),
          c("t3", 3, "Antincendio rischio basso", "Antincendio", "Base", { codice: "A1", ore_minime_legge: 4, visibile_lavoratore: false }),
          c("t4", 4, "Preposto", "Preposto", "Specifico", { ore_minime_legge: 8 }),
        ],
      },
      errori: {} as Record<string, string>,
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

import { registro } from "@/test/registratore-supabase";
import { TabellaTipiCorsoDialog } from "@/features/tipi-corso/TabellaTipiCorsoDialog";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const dialogo = () => (document.querySelector("[role=dialog]")?.textContent ?? "").replace(/\s+/g, " ");
const valori = () => [...document.querySelectorAll("[role=dialog] tbody input")].map((i) => (i as HTMLInputElement).value).join("|");
const righe = () => [...document.querySelectorAll("[role=dialog] tbody tr")];
const foto = (etichetta: string) => registro.push(["pagina", etichetta, dialogo(), valori(), righe().map((r) => r.className)]);
const modifica = async (riga: number, indiceInput: number, valore: string) => {
  const input = righe()[riga]!.querySelectorAll("input")[indiceInput]!;
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: valore } });
  fireEvent.blur(input);
  await attendi();
};

const nuovoClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
  registro.length = 0;
  dati.errori = {} as Record<string, string>;
  for (const k of Object.keys(dati.errori)) delete dati.errori[k];
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Tabella tipi di corso: percorso d'uso completo", () => {
  it("registra tutto quello che la finestra fa", async () => {
    render(<QueryClientProvider client={nuovoClient()}><TabellaTipiCorsoDialog /></QueryClientProvider>);
    await clic(screen.getByText("Tabella corsi"));
    await screen.findByText("Formazione generale", { selector: "td span, td" }).catch(() => undefined);
    await attendi();
    foto("iniziale");

    // modifica celle: testo, numeri, vuoti (diventano null), valore invariato (nessuna chiamata)
    await modifica(0, 1, "  Formazione generale lavoratori  "); // nome
    await modifica(0, 1, "Formazione generale"); // invariato -> nessuna scrittura
    await modifica(0, 0, "FSL1-NEW"); // codice
    await modifica(0, 0, "   "); // codice vuoto -> null
    await modifica(0, 2, "6"); // ore
    await modifica(0, 2, ""); // ore vuote -> null
    await modifica(1, 3, "3"); // validità anni
    await modifica(1, 4, ""); // aggiornamento anni -> null
    await modifica(1, 5, "8.5"); // ore aggiornamento
    await modifica(1, 6, "fsl2b"); // codice aggiornamento
    await modifica(1, 6, ""); // vuoto -> null

    // interruttore «Al lavoratore»
    const interruttori = document.querySelectorAll("[role=dialog] [role=switch]");
    await clic(interruttori[0]!);
    await clic(interruttori[2]!);

    // frecce: la prima su e l'ultima giù sono disattivate
    await clic(screen.getByLabelText("Sposta su Formazione specifica rischio basso"));
    await clic(screen.getByLabelText("Sposta giù Formazione generale"));
    await clic(screen.getByLabelText("Sposta su Formazione generale"));
    await clic(screen.getByLabelText("Sposta giù Preposto"));
    registro.push(["frecce disattivate", [...document.querySelectorAll("[role=dialog] tbody button[disabled]")].map((b) => b.getAttribute("aria-label"))]);

    // trascinamento: dalla riga 3 sulla riga 1; poi su se stessa; poi rilascio senza origine
    const maniglia = (nome: string) => screen.getByLabelText(`Trascina per spostare ${nome}`);
    fireEvent.dragStart(maniglia("Antincendio rischio basso"));
    fireEvent.dragOver(righe()[0]!);
    foto("trascinando sopra la riga 1");
    fireEvent.dragLeave(righe()[0]!);
    fireEvent.dragOver(righe()[0]!);
    fireEvent.drop(righe()[0]!);
    await attendi();
    fireEvent.dragStart(maniglia("Preposto"));
    fireEvent.drop(righe()[3]!);
    await attendi();
    fireEvent.drop(righe()[1]!);
    await attendi();
    fireEvent.dragStart(maniglia("Preposto"));
    fireEvent.dragEnd(maniglia("Preposto"));
    fireEvent.drop(righe()[0]!);
    await attendi();

    // eliminazione: prima annullata, poi confermata
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    await clic(screen.getByLabelText("Elimina Preposto"));
    await clic(screen.getByLabelText("Elimina Preposto"));

    // aggiunta: senza nome (pulsante disattivato), con Invio, con pulsante e categoria
    const nome = screen.getByPlaceholderText("Nome del nuovo corso");
    const categoria = screen.getByPlaceholderText("Categoria (es. Antincendio)");
    registro.push(["pulsante aggiungi senza nome disattivato", (screen.getByText("Aggiungi corso").closest("button") as HTMLButtonElement).disabled]);
    fireEvent.keyDown(nome, { key: "Enter" });
    await attendi();
    fireEvent.change(nome, { target: { value: "Corso nuovo" } });
    fireEvent.keyDown(nome, { key: "a" });
    fireEvent.keyDown(nome, { key: "Enter" });
    await attendi();
    fireEvent.change(nome, { target: { value: "Altro corso" } });
    fireEvent.change(categoria, { target: { value: "Antincendio" } });
    await clic(screen.getByText("Aggiungi corso"));
    foto("dopo aggiunta (campi azzerati)");

    expect(registro).toMatchSnapshot();
  });

  it("mostra l'errore se la tabella non è leggibile", async () => {
    dati.errori["tipi_corso"] = "relation \"tipi_corso\" does not exist";
    render(<QueryClientProvider client={nuovoClient()}><TabellaTipiCorsoDialog /></QueryClientProvider>);
    await clic(screen.getByText("Tabella corsi"));
    await attendi();
    registro.push(["errore", dialogo()]);
    expect(registro).toMatchSnapshot();
  });
});

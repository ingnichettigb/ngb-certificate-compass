/*
 * Test di flusso della Dashboard HR (validazione attestati).
 * Registra chiamate al database, notifiche, email preparate e contenuto della pagina durante un
 * percorso d'uso (filtri per stato, scelta di un attestato, correzione dati, approva/respingi, email)
 * e le confronta con lo snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

const { dati } = vi.hoisted(() => {
  const dip = (cognome: string, nome: string, cf: string, email: string | null, reparto: string | null) => ({
    id: "d-" + cf, cognome, nome, codice_fiscale: cf, email, reparto, luogo_nascita: "Cremona", data_nascita: "1980-02-03", sottoreparto: null,
    classe_concorso: null, materia: null, codice_ateco: "",
  });
  const tc = (id: string, nome: string, macro: string) => ({ id, nome_corso: nome, macro_categoria: macro, livello_specifico: "Base", ore_minime_legge: 8, durata_validita_anni: 5 });
  const att = (id: string, d: ReturnType<typeof dip>, corso: ReturnType<typeof tc>, stato: string, dataCorso: string, scad: string | null, ore: number | null, note: string | null = null) => ({
    id, dipendente_id: d.id, codice_fiscale: d.codice_fiscale, tipo_corso_id: corso.id, data_corso: dataCorso, data_scadenza_calcolata: scad,
    ore_dichiarate: ore, url_foto_fronte: "Coda/" + id + "-f.jpg", url_foto_retro: null, stato_validazione: stato, note_rifiuto: note,
    data_validazione: null, created_at: "2026-10-01", dipendenti: d, tipi_corso: corso,
  });
  const rossi = dip("ROSSI", "MARIO", "RSSMRA80A01H501U", "mario@x.it", "Docente");
  const bianchi = dip("BIANCHI", "ANNA", "BNCNNA85B41F205X", null, "ATA");
  const verdi = dip("VERDI", "ELENA", "VRDLNE80A41H501X", "  ", null);
  const antincendio = tc("t1", "Antincendio rischio basso", "Antincendio");
  const soccorso = tc("t2", "Primo soccorso", "Primo Soccorso");
  return {
    dati: {
      tabelle: {
        attestati_caricati: [
          att("a1", rossi, antincendio, "In attesa", "2026-03-15T00:00:00", "2031-03-15", 8),
          att("a2", bianchi, soccorso, "Approvato", "2021-01-10T00:00:00", "2024-01-10", null),
          att("a3", verdi, antincendio, "Respinto", "2025-06-01T00:00:00", null, 4.5, "Foto illeggibile"),
        ],
        tipi_corso: [antincendio, soccorso, tc("t3", "Preposto", "Preposto")],
      },
      singoli: { attestati_caricati: { id: "a1" } },
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
vi.mock("@/lib/api/email-esito", async (orig) => {
  const m: any = await orig();
  const { registro } = await import("@/test/registratore-supabase");
  return {
    ...m,
    apriEmailEsito: (a: any, esito: string) => {
      const link = m.costruisciMailto(a, esito);
      registro.push(["apriEmailEsito", esito, link ? decodeURIComponent(link) : null]);
      return Boolean(link);
    },
  };
});
vi.mock("@tanstack/react-router", async (orig) => {
  const m: any = await orig();
  return { ...m, Link: ({ to, children, ...p }: any) => <a href={to} {...p}>{children}</a> };
});

import { registro } from "@/test/registratore-supabase";
import { Route } from "@/routes/hr";

/** Il database finto restituisce, dopo un aggiornamento, la riga dell'attestato indicato (come farebbe Supabase). */
const rispondeCon = (id: string) => {
  (dati.singoli as Record<string, unknown>)["attestati_caricati"] = (dati.tabelle.attestati_caricati as { id: string }[]).find((a) => a.id === id);
};
const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const lista = () => [...document.querySelectorAll("aside button")].filter((b) => b.className.includes("w-full")).map((b) => b.textContent?.replace(/\s+/g, " ").trim());
const dettaglio = () => document.querySelector("section")?.textContent?.replace(/\s+/g, " ").trim();
const campi = () => [...document.querySelectorAll("section input")].map((i) => `${(i as HTMLInputElement).type}:${(i as HTMLInputElement).value}`).join("|");
const casellaEmail = () => document.querySelector("section [role=checkbox]") as HTMLButtonElement;
const pulsanti = () => [...document.querySelectorAll("section button")].map((b) => `${b.textContent?.trim()}${(b as HTMLButtonElement).disabled ? "(x)" : ""}`).filter((t) => /Approva|Respingi|email di esito/.test(t));
const foto = (e: string) => registro.push(["pagina", e, lista(), dettaglio() ?? "(nessun dettaglio)", campi(), pulsanti(), casellaEmail()?.getAttribute("data-state") ?? null]);

async function scegliTipoCorso(nome: string) {
  fireEvent.keyDown(document.querySelector("section [role=combobox]")!, { key: "Enter" });
  await attendi();
  fireEvent.keyDown(screen.getByRole("option", { name: nome }), { key: "Enter" });
  await attendi();
}

beforeEach(() => {
  registro.length = 0;
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Dashboard HR: percorso d'uso completo", () => {
  it("registra tutto quello che la pagina fa", async () => {
    const Pagina = Route.options.component as () => ReactElement;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Pagina />
      </QueryClientProvider>,
    );
    await screen.findByText("Dashboard HR");
    await attendi();
    foto("iniziale (In attesa, nessun dettaglio)");

    for (const f of ["Approvato", "Respinto", "Tutti", "In attesa"]) {
      await clic(screen.getByText(f, { selector: "aside button" }));
      foto("filtro " + f);
    }

    // ROSSI (con email): dettaglio, correzioni, rifiuto senza note, poi con note, poi approvazione
    await clic(screen.getByText(/ROSSI MARIO/, { selector: "aside button span" }).closest("button")!);
    foto("dettaglio ROSSI");
    await scegliTipoCorso("Preposto — Preposto");
    fireEvent.change(document.querySelector("section input[type=date]")!, { target: { value: "2026-04-01" } });
    fireEvent.change(document.querySelector("section input[type=number]")!, { target: { value: "6.5" } });
    await attendi();
    foto("dopo correzioni");
    await clic(screen.getByText("Respingi"));
    foto("note di rifiuto mostrate");
    await clic(screen.getByText("Respingi"));
    fireEvent.change(document.querySelector("section textarea")!, { target: { value: "  Corso non coerente  " } });
    await attendi();
    await clic(casellaEmail());
    foto("email disattivata");
    await clic(casellaEmail());
    rispondeCon("a1");
    await clic(screen.getByText("Respingi"));
    await clic(screen.getByText("Approva"));

    // BIANCHI (senza email, approvata): casella disattivata, «invia di nuovo» disattivato
    await clic(screen.getByText("Tutti", { selector: "aside button" }));
    await clic(screen.getByText(/BIANCHI ANNA/, { selector: "aside button span" }).closest("button")!);
    foto("dettaglio BIANCHI (senza email)");
    rispondeCon("a2");
    await clic(screen.getByText("Approva"));
    await clic(screen.getByText("Invia di nuovo email di esito"));

    // VERDI (email vuota/spazi, respinta, note già presenti)
    await clic(screen.getByText(/VERDI ELENA/, { selector: "aside button span" }).closest("button")!);
    foto("dettaglio VERDI (respinta con note)");
    rispondeCon("a3");
    await clic(screen.getByText("Respingi"));

    // si torna su ROSSI (il database finto non cambia: resta «In attesa», niente «invia di nuovo»)
    await clic(screen.getByText(/ROSSI MARIO/, { selector: "aside button span" }).closest("button")!);
    foto("fine");

    expect(registro).toMatchSnapshot();
  });
});

/*
 * Test di flusso di «Imposta AI» (elenco fornitori, modifica, chiave rapida, nuova AI, test, eliminazione).
 * Registra notifiche, chiamate di test e configurazione salvata nel browser (con chiavi finte)
 * e le confronta con lo snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("sonner", async () => {
  const { creaToastFinto } = await import("@/test/registratore-supabase");
  return { toast: creaToastFinto(vi) };
});
vi.mock("@/lib/ai-test.functions", async () => {
  const { registro } = await import("@/test/registratore-supabase");
  return {
    testaFornitoreAi: vi.fn(async ({ data }: { data: { baseUrl: string; model: string; apiKey: string } }) => {
      registro.push(["testaFornitoreAi", JSON.stringify(data)]);
      if (!data.apiKey.trim()) return { ok: false, messaggio: "Inserisci prima la chiave." };
      if (data.apiKey === "KO") return { ok: false, messaggio: "Chiave non valida" };
      return { ok: true, messaggio: "Chiave valida e pronta!" };
    }),
  };
});

import { registro } from "@/test/registratore-supabase";
import { ImpostaAiButton } from "@/features/ai/ImpostaAiButton";

const CHIAVE = "archivio_attestati_ai_config_v1";
const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const digita = async (sel: string, v: string) => { fireEvent.change(document.querySelector(sel)!, { target: { value: v } }); await attendi(); };
const scheda = (nome: string) =>
  screen.getAllByText(nome).map((e) => e.closest("div.rounded-lg")).find(Boolean) as HTMLElement;
const foto = (etichetta: string) =>
  registro.push([
    "stato",
    etichetta,
    JSON.stringify(JSON.parse(localStorage.getItem(CHIAVE) ?? "null")),
    [...document.querySelectorAll("[role=dialog]")].map((d) => (d.textContent ?? "").replace(/\s+/g, " ")),
    [...document.querySelectorAll("[role=dialog] input")].map((i) => `${(i as HTMLInputElement).id}=${(i as HTMLInputElement).type}:${(i as HTMLInputElement).value}`),
  ]);

const G20 = "Google AI Studio – Gemini 2.0 Flash (gratis)";
const G25 = "Google AI Studio – Gemini 2.5 Flash";
const GPT = "OpenAI – GPT-4o-mini (chiave personale)";
const DEF = "AI integrata (crediti Lovable)";

beforeEach(() => {
  registro.length = 0;
  localStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Imposta AI: percorso d'uso completo", () => {
  it("registra tutto quello che il componente fa", async () => {
    render(<ImpostaAiButton />);
    await attendi();
    foto("iniziale");
    await clic(screen.getByText("AI:").closest("button")!);
    foto("elenco aperto");

    // chiave rapida: inserisce, mostra, salva e attiva; poi la rimuove
    await clic(within(scheda(G20)).getByTitle("Modifica rapida chiave"));
    foto("chiave rapida aperta");
    await digita("#chiave-rapida", "AIzaFAKE-20");
    await clic(screen.getByLabelText("Mostra o nascondi chiave"));
    foto("chiave rapida visibile");
    await clic(screen.getByText("Salva e attiva"));
    foto("dopo salva chiave 2.0");
    await clic(within(scheda(G20)).getByTitle("Modifica rapida chiave"));
    await digita("#chiave-rapida", "   ");
    await clic(screen.getByText("Salva e attiva"));
    foto("dopo rimozione chiave 2.0");
    await clic(within(scheda(G25)).getByTitle("Modifica rapida chiave"));
    await digita("#chiave-rapida", "AIzaFAKE-25");
    await clic(screen.getByText("Annulla"));
    await clic(within(scheda(G25)).getByTitle("Modifica rapida chiave"));
    await digita("#chiave-rapida", "AIzaFAKE-25");
    await clic(screen.getByText("Salva e attiva"));
    await clic(within(scheda(G20)).getByTitle("Modifica rapida chiave"));
    await digita("#chiave-rapida", "KO");
    await clic(screen.getByText("Salva e attiva"));
    foto("2.0 con chiave KO attiva");

    // usa questa / non attivabile senza chiave
    await clic(within(scheda(G25)).getByText("Usa questa"));
    await clic(within(scheda(GPT)).getByText("Usa questa"));
    foto("dopo usa questa");

    // modifica completa: validazioni e salvataggio
    await clic(within(scheda(GPT)).getByText("Modifica"));
    foto("modifica aperta");
    await digita("#mod-nome", "  ");
    await clic(screen.getByText("Salva modifiche"));
    await digita("#mod-nome", "GPT personale");
    await digita("#mod-url", "  ");
    await clic(screen.getByText("Salva modifiche"));
    await digita("#mod-url", "https://api.openai.com/v1///");
    await digita("#mod-modello", "");
    await clic(screen.getByText("Salva modifiche"));
    await digita("#mod-modello", "gpt-4o");
    await digita("#mod-chiave", "sk-FAKE");
    await clic(screen.getByLabelText("Mostra o nascondi chiave"));
    foto("modifica compilata");
    await clic(screen.getByText("Salva modifiche"));
    foto("dopo modifica");
    await clic(within(scheda(DEF)).getByText("Testa"));

    // test dei fornitori
    await clic(within(scheda(G20)).getByText("Testa"));
    await clic(within(scheda(G25)).getByText("Testa"));
    await clic(within(scheda("OpenRouter (modelli gratuiti)")).getByText("Testa"));

    // nuova AI: template, validazioni, salvataggio
    await clic(screen.getByText("Aggiungi nuova AI"));
    foto("nuova AI aperta");
    await clic(screen.getByText("🌪️ Mistral Pixtral (Visione)"));
    foto("template Mistral");
    await digita("#nuovo-nome", "");
    await clic(screen.getByText("Salva AI"));
    await digita("#nuovo-nome", "Mia AI");
    await digita("#nuova-url", "");
    await clic(screen.getByText("Salva AI"));
    await digita("#nuova-url", "https://api.mistral.ai/v1//");
    await digita("#nuovo-modello", "");
    await clic(screen.getByText("Salva AI"));
    await digita("#nuovo-modello", "pixtral-12b-2409");
    await digita("#nuova-chiave", "FAKE-NUOVA");
    await clic(screen.getByLabelText("Mostra o nascondi chiave"));
    await clic(screen.getByText("Salva AI"));
    foto("dopo nuova AI");

    // seconda AI senza chiave (l'orologio avanza: gli id dipendono dalla data), poi elimina entrambe
    vi.setSystemTime(new Date("2026-10-20T12:00:05Z"));
    await clic(screen.getByText("Aggiungi nuova AI"));
    await digita("#nuovo-nome", "Senza chiave");
    await clic(screen.getByText("Salva AI"));
    foto("seconda AI senza chiave");
    await clic(within(scheda("Mia AI")).getByTitle("Elimina questa AI"));
    foto("dopo elimina");
    await clic(scheda("Senza chiave").querySelector("[title='Elimina questa AI']")!);

    // ripristino elenco iniziale
    await clic(screen.getByText("Elenco iniziale"));
    foto("dopo ripristino");

    expect(registro).toMatchSnapshot();
  });
});

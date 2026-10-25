/*
 * Test di flusso della pagina iniziale: contatori, schede, QR code e link da copiare.
 * Ogni contatore riceve un numero diverso, così uno scambio tra contatori sarebbe visibile.
 * La data «di oggi» è bloccata al 20/10/2026.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return {
    supabase: creaClientFinto({
      conteggio: (tabella, chiamate) => {
        const nomi = chiamate.map((c) => c.nome);
        if (tabella === "dipendenti") return 4;
        if (tabella !== "attestati_caricati") return undefined;
        if (nomi.includes("eq")) return 3; // in attesa
        if (nomi.includes("lt")) return 2; // scaduti
        if (nomi.includes("gte")) return 5; // in scadenza (6 mesi)
        return 9; // totale
      },
    }),
  };
});
vi.mock("qrcode", () => ({ default: { toDataURL: async (url: string) => `data:image/png;base64,QR[${url}]` } }));
vi.mock("@/assets/logo-ngb.jpg.asset.json", () => ({ default: { url: "/logo-test.jpg" } }));
vi.mock("@tanstack/react-router", async (orig) => {
  const m: any = await orig();
  return { ...m, Link: ({ to, children, ...p }: any) => <a href={to} {...p}>{children}</a> };
});

import { registro } from "@/test/registratore-supabase";
import { Route } from "@/routes/index";

const attendi = (ms = 40) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const testo = () => document.body.textContent?.replace(/\s+/g, " ").trim();
const collegamenti = () => [...document.querySelectorAll("a")].map((a) => `${a.getAttribute("href")} «${a.textContent?.replace(/\s+/g, " ").trim()}»`);
const contatori = () => [...document.querySelectorAll("section a[class*='rounded-2xl']")].map((a) => a.textContent?.replace(/\s+/g, " ").trim());
const immagini = () => [...document.querySelectorAll("img")].map((i) => `${i.getAttribute("alt")} → ${i.getAttribute("src")}`);

beforeEach(() => {
  registro.length = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
  Object.assign(navigator, { clipboard: { writeText: vi.fn((t: string) => { registro.push(["clipboard.writeText", t]); return Promise.resolve(); }) } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Home: contatori, schede e link", () => {
  it("registra tutto quello che la pagina mostra e fa", async () => {
    const Pagina = Route.options.component as () => ReactElement;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Pagina />
      </QueryClientProvider>,
    );
    registro.push(["subito dopo il rendering", contatori(), immagini()]);
    await attendi(60);
    registro.push(["dopo il caricamento", contatori(), immagini(), collegamenti(), testo()]);

    await act(async () => { fireEvent.click(screen.getByText("Copia link").closest("button")!); });
    registro.push(["dopo «Copia link»", screen.queryByText("Copiato") ? "Copiato" : "Copia link"]);
    await attendi(1900);
    registro.push(["dopo 1,9 secondi", screen.queryByText("Copiato") ? "Copiato" : "Copia link"]);

    expect(registro).toMatchSnapshot();
  });
});

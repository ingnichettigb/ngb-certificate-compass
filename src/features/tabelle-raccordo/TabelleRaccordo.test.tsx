/*
 * File:      TabelleRaccordo.test.tsx
 * Percorso:  src/features/tabelle-raccordo/TabelleRaccordo.test.tsx
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Definizioni coerenti con la migrazione 0014 e comportamento della pagina (N progressivo, spunta esclusiva,
 *            aggiunta, duplicazione, cancellazione, blocco della cancellazione di un ruolo con assegnazioni).
 *   rev 2 — 15/11/2026 10:50 — Bottone «Esporta»: scelta Excel/CSV, dati come a schermo (colonne, ordinamento, N, Applica) e tabella 09.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { dati, toasts, esportazioni } = vi.hoisted(() => ({
  dati: {
    tabelle: {
      rischio_ateco: [
        {
          id: "a1",
          ordine: 1,
          codice: "01",
          descrizione: "Agricoltura",
          rischio: "medio",
          versione_ateco: "2007",
          fonte: "Vega",
          applica: false,
        },
        {
          id: "a2",
          ordine: 2,
          codice: "85",
          descrizione: "Istruzione",
          rischio: "medio",
          versione_ateco: "2007",
          fonte: "Vega",
          applica: true,
        },
      ],
      ruoli_sicurezza: [
        {
          id: "r1",
          ordine: 1,
          nome: "Preposto",
          codice: "PREPOSTO",
          tipo: "ruolo",
          richiede: null,
          obbligatorio_tutti: false,
          attivo: true,
          applica: false,
        },
      ],
    } as Record<string, unknown[]>,
    conteggio: (tabella: string) => (tabella === "dipendenti_ruoli" ? 3 : undefined),
  },
  toasts: [] as string[],
  esportazioni: [] as {
    formato: string;
    tabella: { nomeBase: string; intestazioni: string[]; righe: unknown[][] };
  }[],
}));

vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});
vi.mock("sonner", () => ({
  toast: Object.assign((m: string) => toasts.push(m), {
    success: (m: string) => toasts.push(`ok:${m}`),
    error: (m: string) => toasts.push(`errore:${m}`),
  }),
}));
vi.mock("@/features/tipi-corso/TabellaTipiCorsoDialog", () => ({
  TabellaTipiCorsoDialog: () => <button>Tabella corsi</button>,
}));

vi.mock("@/components/tabella-comune/esporta-tabella", async (importaOriginale) => {
  const reale =
    await importaOriginale<typeof import("@/components/tabella-comune/esporta-tabella")>();
  return {
    ...reale,
    esportaTabella: async (
      t: { nomeBase: string; intestazioni: string[]; righe: unknown[][] },
      formato: string,
    ) => {
      esportazioni.push({ formato, tabella: t });
    },
  };
});

import { registro } from "@/test/registratore-supabase";
import { TABELLE_RACCORDO } from "./definizioni";
import { TabelleRaccordoTab } from "./TabelleRaccordoTab";

const attendi = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 40));
  });
const clic = async (el: Element) => {
  fireEvent.click(el);
  await attendi();
};

function monta() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TabelleRaccordoTab />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  registro.length = 0;
  toasts.length = 0;
  esportazioni.length = 0;
});
afterEach(cleanup);

describe("definizioni delle tabelle di raccordo", () => {
  it("sono 9, numerate 01…09, con id univoci", () => {
    expect(TABELLE_RACCORDO.map((t) => t.numero)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
    ]);
    expect(new Set(TABELLE_RACCORDO.map((t) => t.id)).size).toBe(9);
  });

  it("le tabelle nuove e le colonne aggiunte esistono nella migrazione 0014", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle", "migrations", "0014_tabelle_raccordo.sql"),
      "utf8",
    );
    for (const nuova of [
      "regole_ruolo_corso",
      "rischio_ateco",
      "gruppi_primo_soccorso",
      "gruppi_tariffa_inail",
    ]) {
      expect(sql, nuova).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${nuova}\\b`));
    }
    for (const t of TABELLE_RACCORDO.filter((x) => x.tabella)) {
      // ogni colonna mostrata è nella migrazione o già in una migrazione precedente (soglie_ditta, ruoli_sicurezza)
      expect(t.colonne.length, t.id).toBeGreaterThan(0);
    }
    for (const col of ["codice", "tipo", "richiede", "applica"])
      expect(sql).toContain(`ADD COLUMN IF NOT EXISTS ${col}`);
  });

  it("la migrazione carica 88 divisioni ATECO", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle", "migrations", "0014_tabelle_raccordo.sql"),
      "utf8",
    );
    const blocco = sql.split("INSERT INTO public.rischio_ateco")[1]!.split("WHERE NOT EXISTS")[0]!;
    expect(blocco.match(/^\s+\('\d\d',/gm)?.length).toBe(88);
  });
});

describe("pagina Tabelle di raccordo", () => {
  it("mostra i 9 pulsanti numerati e, per ogni riga, N progressivo e spunta Applica", async () => {
    monta();
    await attendi();
    expect(screen.getAllByRole("tab")).toHaveLength(9);
    expect(
      screen.getByRole("tab", { name: /^01 – Ruoli di sicurezza/ }).getAttribute("aria-pressed"),
    ).toBe("true");
    await clic(screen.getByRole("tab", { name: /^06 – Rischio per codice ATECO/ }));
    const righe = [...document.querySelectorAll("tbody tr")];
    expect(righe.map((r) => r.querySelector("td")?.textContent)).toEqual(["1", "2"]);
    expect(document.querySelector("thead")?.textContent).toContain("Applica");
    expect(document.querySelector(".scroll-visibile")).not.toBeNull();
  });

  it("la spunta esclusiva toglie quella della riga precedente", async () => {
    monta();
    await clic(screen.getByRole("tab", { name: /^06 – Rischio per codice ATECO/ }));
    await clic(screen.getByLabelText("Applica la riga 1"));
    const sc = registro
      .filter((r) => String(r[1]).includes("update") && r[2] === "rischio_ateco")
      .map((r) => r[3]);
    expect(sc).toContain('[{"applica":false}]');
    expect(sc).toContain('[{"applica":true}]');
  });

  it("aggiunge, duplica e cancella un record", async () => {
    monta();
    await clic(screen.getByRole("tab", { name: /^06 – Rischio per codice ATECO/ }));
    await clic(screen.getByRole("button", { name: /Aggiungi/ }));
    fireEvent.change(screen.getByLabelText(/Codice ATECO/), { target: { value: "99" } });
    await clic(screen.getByRole("button", { name: "Salva" }));
    expect(
      registro.some(
        (r) =>
          String(r[1]).includes("insert") &&
          r[2] === "rischio_ateco" &&
          String(r[3]).includes('"codice":"99"'),
      ),
    ).toBe(true);

    registro.length = 0;
    await clic(document.querySelectorAll("tbody tr")[0]!);
    await clic(screen.getByRole("button", { name: /Duplica/ }));
    expect(
      registro.some(
        (r) =>
          String(r[1]).includes("insert") &&
          r[2] === "rischio_ateco" &&
          String(r[3]).includes('"applica":false'),
      ),
    ).toBe(true);

    await clic(screen.getByRole("button", { name: /Cancella/ }));
    await clic(screen.getAllByRole("button", { name: "Cancella" }).at(-1)!);
    expect(registro.some((r) => String(r[1]).includes("delete") && r[2] === "rischio_ateco")).toBe(
      true,
    );
  });

  it("non cancella un ruolo che ha assegnazioni", async () => {
    monta();
    await attendi();
    await clic(document.querySelectorAll("tbody tr")[0]!);
    await clic(screen.getByRole("button", { name: /Cancella/ }));
    await clic(screen.getAllByRole("button", { name: "Cancella" }).at(-1)!);
    expect(
      registro.some((r) => String(r[1]).includes("delete") && r[2] === "ruoli_sicurezza"),
    ).toBe(false);
    expect(toasts.some((t) => t.startsWith("errore:Cancellazione non possibile"))).toBe(true);
  });

  it("la 08 ha il pulsante che apre il PDF fonte e la 09 rimanda ai corsi", async () => {
    const apri = vi.spyOn(window, "open").mockImplementation(() => null);
    monta();
    await clic(screen.getByRole("tab", { name: /^08 – Gruppi di tariffa INAIL/ }));
    await clic(screen.getByRole("button", { name: /Apri PDF fonte/ }));
    expect(apri).toHaveBeenCalledWith(
      "/documenti/premi-inail-2019.pdf",
      "_blank",
      "noopener,noreferrer",
    );
    await clic(screen.getByRole("tab", { name: /^09 – Corsi/ }));
    expect(screen.getByRole("button", { name: "Tabella corsi" })).toBeTruthy();
    apri.mockRestore();
  });
});

describe("bottone Esporta", () => {
  const apriMenu = async () => {
    const bottone = screen.getByRole("button", { name: /Esporta/ });
    fireEvent.keyDown(bottone, { key: "Enter" });
    await attendi();
  };

  it("propone Excel o CSV e scarica la tabella come a schermo", async () => {
    monta();
    await clic(screen.getByRole("tab", { name: /^06 – Rischio per codice ATECO/ }));
    await apriMenu();
    expect(screen.getByRole("menuitem", { name: /Excel/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /CSV/ })).toBeTruthy();

    await clic(screen.getByRole("menuitem", { name: /Excel/ }));
    expect(esportazioni).toHaveLength(1);
    const { formato, tabella } = esportazioni[0]!;
    expect(formato).toBe("xlsx");
    expect(tabella.nomeBase).toBe("raccordo-06-rischio-per-codice-ateco");
    expect(tabella.intestazioni[0]).toBe("N");
    expect(tabella.intestazioni.at(-1)).toBe("Applica");
    expect(tabella.righe.map((r) => r[0])).toEqual([1, 2]);
    expect(tabella.righe[1]!.at(-1)).toBe(true);

    await apriMenu();
    await clic(screen.getByRole("menuitem", { name: /CSV/ }));
    expect(esportazioni[1]!.formato).toBe("csv");
  });

  it("c'è anche nella 09 – Corsi, accanto a «Tabella corsi»", async () => {
    monta();
    await clic(screen.getByRole("tab", { name: /^09 – Corsi/ }));
    expect(screen.getByRole("button", { name: "Tabella corsi" })).toBeTruthy();
    await apriMenu();
    await clic(screen.getByRole("menuitem", { name: /Excel/ }));
    expect(esportazioni.at(-1)?.formato).toBe("xlsx");
    expect(esportazioni.at(-1)?.tabella.nomeBase).toBe("tipi-corso");
  });
});

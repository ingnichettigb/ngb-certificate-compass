/*
 * File:      TabelleRaccordo.test.tsx
 * Percorso:  src/features/tabelle-raccordo/TabelleRaccordo.test.tsx
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Definizioni coerenti con la migrazione 0014 e comportamento della pagina (N progressivo, spunta esclusiva,
 *            aggiunta, duplicazione, cancellazione, blocco della cancellazione di un ruolo con assegnazioni).
 *   rev 2 — 15/11/2026 10:50 — Bottone «Esporta»: scelta Excel/CSV, dati come a schermo (colonne, ordinamento, N, Applica) e tabella 09.
 *   rev 3 — 15/11/2026 11:20 — Il menu «Esporta» deve stare sopra le Impostazioni generali (z-100) e i dialoghi (z-150).
 *   rev 4 — 15/11/2026 — Colonna «Applica» su tutte le tabelle: la 06 associa il codice alla Ditta (il primo è «principale»); nelle 03, 04, 05 e 07
 *            la riga della Ditta è spuntata e salvata nel database (applica true sulla fascia attiva, false sulle altre); nella 07 la scelta
 *            manuale resta esclusiva e le righe fuori fascia sono bloccate. Esportazione con «Applica» come a schermo. Titolo della 09
 *            («Tipi di corso») e PDF fonte della 08 (collegamento, non bottone) allineati al codice.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { dati, stato, toasts, esportazioni } = vi.hoisted(() => {
  const stato = { inForza: 128 };
  return {
  stato,
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
    // Anagrafica Ditta (singleton) e lavoratori in forza: si cambiano nei singoli test
    singoli: { ditta: { n_lavoratori_dichiarato: 127, codici_ateco: [] as unknown[] } } as Record<string, unknown>,
    conteggio: (tabella: string) =>
      tabella === "dipendenti_ruoli" ? 3 : tabella === "dipendenti" ? stato.inForza : undefined,
  },
  toasts: [] as string[],
  esportazioni: [] as {
    formato: string;
    tabella: { nomeBase: string; intestazioni: string[]; righe: unknown[][] };
  }[],
  };
});

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

const DITTA_BASE = { n_lavoratori_dichiarato: 127, codici_ateco: [] as unknown[] };

beforeEach(() => {
  registro.length = 0;
  toasts.length = 0;
  esportazioni.length = 0;
  stato.inForza = 128;
  dati.singoli["ditta"] = { ...DITTA_BASE };
  delete dati.tabelle["soglie_ditta"];
  delete dati.tabelle["gruppi_primo_soccorso"];
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

  it("06: la spunta associa il codice alla Ditta e il primo codice è «principale»", async () => {
    monta();
    await clic(screen.getByRole("tab", { name: /^06 – Rischio per codice ATECO/ }));
    await clic(screen.getByLabelText("Applica la riga 1"));
    const scritture = registro
      .filter((r) => String(r[1]).includes("update") && r[2] === "ditta")
      .map((r) => String(r[3]));
    expect(scritture.some((t) => t.includes('"codice":"01"') && t.includes('"principale":true'))).toBe(true);
    expect(toasts).toContain("ok:Codice ATECO 01 associato alla Ditta");
    // Il catalogo ATECO non ha più la spunta esclusiva nel database
    expect(registro.some((r) => String(r[1]).includes("update") && r[2] === "rischio_ateco")).toBe(false);
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

  it("la 08 ha il collegamento che apre il PDF fonte e la 09 rimanda ai corsi", async () => {
    monta();
    await clic(screen.getByRole("tab", { name: /^08 – Gruppi di tariffa INAIL/ }));
    const pdf = screen.getByRole("link", { name: /Apri PDF fonte/ });
    expect(pdf.getAttribute("href")).toBe("/documenti/premi-inail-2019.pdf");
    expect(pdf.getAttribute("target")).toBe("_blank");
    expect(pdf.getAttribute("rel")).toContain("noopener");
    await clic(screen.getByRole("tab", { name: /^09 – Tipi di corso/ }));
    expect(screen.getByRole("button", { name: "Tabella corsi" })).toBeTruthy();
  });
});

describe("bottone Esporta", () => {
  const apriMenu = async () => {
    const bottone = screen.getByRole("button", { name: /Esporta/ });
    fireEvent.keyDown(bottone, { key: "Enter" });
    await attendi();
  };

  it("propone Excel o CSV e scarica la tabella come a schermo", async () => {
    // Il codice 85 è associato alla Ditta: è la riga con «Applica» spuntato
    dati.singoli["ditta"] = {
      ...DITTA_BASE,
      codici_ateco: [{ codice: "85", descrizione: "Istruzione", rischio: "medio", principale: true }],
    };
    monta();
    await clic(screen.getByRole("tab", { name: /^06 – Rischio per codice ATECO/ }));
    await apriMenu();
    expect(screen.getByRole("menuitem", { name: /Excel/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /CSV/ })).toBeTruthy();
    // Le Impostazioni generali stanno a z-[100], i dialoghi a z-[150]: il menu deve stare sopra entrambi.
    expect(screen.getByRole("menu").className).toContain("z-[200]");

    await clic(screen.getByRole("menuitem", { name: /Excel/ }));
    expect(esportazioni).toHaveLength(1);
    const { formato, tabella } = esportazioni[0]!;
    expect(formato).toBe("xlsx");
    expect(tabella.nomeBase).toBe("raccordo-06-rischio-per-codice-ateco");
    expect(tabella.intestazioni[0]).toBe("N");
    expect(tabella.intestazioni.at(-1)).toBe("Applica");
    expect(tabella.righe.map((r) => r[0])).toEqual([1, 2]);
    expect(tabella.righe[0]!.at(-1)).toBe(false);
    expect(tabella.righe[1]!.at(-1)).toBe(true);

    await apriMenu();
    await clic(screen.getByRole("menuitem", { name: /CSV/ }));
    expect(esportazioni[1]!.formato).toBe("csv");
  });

  it("c'è anche nella 09 – Corsi, accanto a «Tabella corsi»", async () => {
    monta();
    await clic(screen.getByRole("tab", { name: /^09 – Tipi di corso/ }));
    expect(screen.getByRole("button", { name: "Tabella corsi" })).toBeTruthy();
    await apriMenu();
    await clic(screen.getByRole("menuitem", { name: /Excel/ }));
    expect(esportazioni.at(-1)?.formato).toBe("xlsx");
    expect(esportazioni.at(-1)?.tabella.nomeBase).toBe("tipi-corso");
  });
});

describe("colonna «Applica» nelle tabelle della Ditta (03, 04, 05, 07)", () => {
  const SOGLIE = [
    { ambito: "rls", da: 0, a: 15, etichetta: "Fino a 15", esito: "RLS eletto o territoriale" },
    { ambito: "rls", da: 16, a: 200, etichetta: "16-200", esito: "1 RLS" },
    { ambito: "rls", da: 201, a: 1000, etichetta: "201-1.000", esito: "3 RLS" },
    { ambito: "primo_soccorso", da: 1, a: 2, etichetta: "1-2", esito: "Gruppo C" },
    { ambito: "primo_soccorso", da: 3, a: 5, etichetta: "3-5", esito: "Gruppo B" },
    { ambito: "primo_soccorso", da: 6, a: null, etichetta: "6 o più", esito: "Gruppo B" },
    { ambito: "antincendio_presenze", da: 0, a: 100, etichetta: "Fino a 100", esito: "Livello 1" },
    { ambito: "antincendio_presenze", da: 101, a: 300, etichetta: "101-300", esito: "Livello 2" },
    { ambito: "antincendio_presenze", da: 301, a: null, etichetta: "Oltre 300", esito: "Livello 3" },
  ];
  /**
   * Righe di soglie_ditta; «spuntate» = numeri di riga (per ambito, da 1) già spuntati nel database.
   * Il client finto non applica i filtri .eq(): per le tabelle 03, 04, 05 si passa l'ambito per avere solo le sue righe.
   */
  const soglie = (spuntate: Record<string, number[]> = {}, ambito?: string) => {
    const contatori: Record<string, number> = {};
    return SOGLIE.filter((r) => !ambito || r.ambito === ambito).map((r) => {
      const n = (contatori[r.ambito] = (contatori[r.ambito] ?? 0) + 1);
      return {
        id: `${r.ambito}-${n}`,
        ordine: n,
        note: null,
        attiva: true,
        applica: (spuntate[r.ambito] ?? []).includes(n),
        ...r,
      };
    });
  };
  const GRUPPI = [
    ["1-2", "qualsiasi", "C"],
    ["3-5", "fino a 4", "B"],
    ["3-5", "oltre 4", "B"],
    ["6 o più", "fino a 4", "B"],
    ["6 o più", "oltre 4", "A"],
    ["6 o più, agricoltura a tempo indeterminato", "—", "A"],
  ] as const;
  const gruppi = (spuntate: number[] = []) =>
    GRUPPI.map(([lavoratori, indice_inail, gruppo], i) => ({
      id: `g${i + 1}`,
      ordine: i + 1,
      lavoratori,
      indice_inail,
      gruppo,
      nota: null,
      applica: spuntate.includes(i + 1),
    }));

  const spunta = (n: number) => screen.getByLabelText(`Applica la riga ${n}`);
  const acceso = (n: number) => spunta(n).getAttribute("aria-checked") === "true";
  const bloccata = (n: number) => spunta(n).hasAttribute("disabled");
  const scritture = (tabella: string) =>
    registro
      .filter((r) => String(r[1]).startsWith("from.update") && r[2] === tabella)
      .map((r) => `${r[1]} ${r[3]}`);
  const aperta = async (titolo: RegExp) => {
    monta();
    await attendi();
    await clic(screen.getByRole("tab", { name: titolo }));
    await attendi();
  };

  it("03 RLS: 127 dichiarati e 128 in forza → la fascia 16-200 è gialla, spuntata e salvata (le altre false)", async () => {
    // Nel database la spunta è sulla fascia sbagliata (la prima): va spostata sulla seconda
    dati.tabelle["soglie_ditta"] = soglie({ rls: [1] }, "rls");
    await aperta(/^03 – Soglie numero RLS/);

    const intestazioni = [...document.querySelectorAll("thead th")].map((th) => th.textContent?.trim());
    expect(intestazioni.at(-1)).toBe("Applica");
    expect(intestazioni).not.toContain("In uso Ditta");

    const righe = [...document.querySelectorAll("tbody tr")];
    expect([1, 2, 3].map(acceso)).toEqual([false, true, false]);
    expect(righe[1]!.className).toContain("bg-amber");
    expect(righe[1]!.textContent).toContain("In uso Ditta");
    expect(righe[0]!.textContent).not.toContain("In uso Ditta");
    expect([1, 2, 3].map(bloccata)).toEqual([true, true, true]); // calcolata dal programma, non a mano

    expect(scritture("soglie_ditta")).toEqual([
      'from.update [{"applica":false}]',
      'from.update.in ["id",["rls-1"]]',
      'from.update [{"applica":true}]',
      'from.update.in ["id",["rls-2"]]',
    ]);
  });

  it("04 Primo soccorso: 128 lavoratori → fascia «6 o più» spuntata", async () => {
    dati.tabelle["soglie_ditta"] = soglie({}, "primo_soccorso");
    await aperta(/^04 – Soglie primo soccorso/);
    expect([1, 2, 3].map(acceso)).toEqual([false, false, true]);
    expect(scritture("soglie_ditta")).toEqual([
      'from.update [{"applica":true}]',
      'from.update.in ["id",["primo_soccorso-3"]]',
    ]);
  });

  it("05 Antincendio: 250 presenze → livello 2 spuntato; se il database è già allineato non scrive nulla", async () => {
    dati.singoli["ditta"] = { ...DITTA_BASE, presenze_contemporanee_max: 250 };
    dati.tabelle["soglie_ditta"] = soglie({ antincendio_presenze: [2] }, "antincendio_presenze");
    await aperta(/^05 – Soglie antincendio scuola/);
    expect([1, 2, 3].map(acceso)).toEqual([false, true, false]);
    expect(scritture("soglie_ditta")).toEqual([]);
  });

  it("07: più righe con stessa fascia e gruppo → tutte spuntate, salvate; le righe fuori fascia sono bloccate", async () => {
    stato.inForza = 4;
    dati.singoli["ditta"] = { ...DITTA_BASE, n_lavoratori_dichiarato: 4 };
    dati.tabelle["soglie_ditta"] = soglie();
    dati.tabelle["gruppi_primo_soccorso"] = gruppi();
    await aperta(/^07 – Gruppo di primo soccorso/);

    expect([1, 2, 3, 4, 5, 6].map(acceso)).toEqual([false, true, true, false, false, false]);
    expect([1, 2, 3, 4, 5, 6].map(bloccata)).toEqual([true, false, false, true, true, true]);
    expect(document.querySelectorAll("tbody tr")[1]!.textContent).toContain("In uso Ditta");
    expect(scritture("gruppi_primo_soccorso")).toEqual([
      'from.update [{"applica":true}]',
      'from.update.in ["id",["g2","g3"]]',
    ]);
  });

  it("07: la scelta manuale dell'indice INAIL resta esclusiva e non viene sovrascritta", async () => {
    stato.inForza = 4;
    dati.singoli["ditta"] = { ...DITTA_BASE, n_lavoratori_dichiarato: 4 };
    dati.tabelle["soglie_ditta"] = soglie();
    dati.tabelle["gruppi_primo_soccorso"] = gruppi([3]); // l'utente aveva scelto «oltre 4»
    await aperta(/^07 – Gruppo di primo soccorso/);

    expect([2, 3].map(acceso)).toEqual([false, true]);
    expect(scritture("gruppi_primo_soccorso")).toEqual([]); // nessun allineamento automatico sopra la sua scelta

    await clic(spunta(2)); // sceglie «fino a 4»: toglie la spunta all'altra riga
    expect(scritture("gruppi_primo_soccorso")).toEqual([
      'from.update [{"applica":false}]',
      'from.update.in ["id",["g3"]]',
      'from.update [{"applica":true}]',
      'from.update.eq ["id","g2"]',
    ]);
  });

  it("l'esportazione porta «Applica» come a schermo, anche se nel database la spunta non è ancora salvata", async () => {
    dati.tabelle["soglie_ditta"] = soglie({}, "rls");
    await aperta(/^03 – Soglie numero RLS/);
    fireEvent.keyDown(screen.getByRole("button", { name: /Esporta/ }), { key: "Enter" });
    await attendi();
    await clic(screen.getByRole("menuitem", { name: /Excel/ }));
    const { tabella } = esportazioni.at(-1)!;
    expect(tabella.intestazioni.at(-1)).toBe("Applica");
    expect(tabella.righe.map((r) => r.at(-1))).toEqual([false, true, false]);
  });
});

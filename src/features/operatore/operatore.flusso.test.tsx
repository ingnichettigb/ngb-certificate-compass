/*
 * Test di flusso della Postazione Operatore.
 * Esegue un percorso d'uso completo e confronta, con uno "snapshot", tutto ciò che la pagina fa:
 * chiamate al database/storage, notifiche (toast) e contenuto dei campi.
 * Serve a garantire che la riorganizzazione del codice non cambi il comportamento.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { log, makeClient, toast } = vi.hoisted(() => {
  const log: unknown[][] = [];
  let tabella = "";

  const TIPI = [
    { id: "t1", nome_corso: "Antincendio", macro_categoria: "Antincendio", livello_specifico: "Base", ore_minime_legge: 8, durata_validita_anni: 5 },
    { id: "t2", nome_corso: "Primo Soccorso", macro_categoria: "Primo Soccorso", livello_specifico: "Base", ore_minime_legge: 12, durata_validita_anni: 3 },
  ];
  const base = { data_nascita: "", luogo_nascita: "", codice_ateco: "", ente: "", argomenti: [], integrazione: "", percorso_file: null, mime_file: null, nome_file: null, argomenti_mancanti: [] };
  const CODA = [
    { ...base, id: "r1", cognome: "ROSSI", nome: "MARIO", codice_fiscale: "RSSMRA80A01H501U", email: "mario@x.it", reparto: "Docente", tipo_corso_id: "t1", tipo_corso_nome: "Antincendio", data_corso: "2026-03-15", ore: 8, esito: "Valido", note: "ok", archiviato: true, inviato: true, created_at: "2026-10-01" },
    { ...base, id: "r2", cognome: "BIANCHI", nome: "ANNA", codice_fiscale: "BNCNNA85B41F205X", email: "", reparto: "", tipo_corso_id: null, tipo_corso_nome: "", data_corso: "", ore: null, esito: "Non valido", note: "x", archiviato: false, inviato: false, created_at: "2026-10-02" },
    { ...base, id: "r3", cognome: "VERDI", nome: "ELENA", codice_fiscale: "VRDLNE80A41H501X", email: "elena@x.it", reparto: "ATA", tipo_corso_id: "t1", tipo_corso_nome: "Antincendio", data_corso: "2026-05-10", ore: 8, esito: "Valido con integrazione DVR", integrazione: "4 ore di rischio specifico", note: "da integrare", archiviato: false, inviato: false, created_at: "2026-10-03" },
  ];

  const ultimo = (path: string[]) => [...path].reverse().find((p) => p !== "()") ?? "";
  const risposta = (path: string[]) => {
    const op = ultimo(path);
    if (path.includes("storage")) {
      if (op === "download") return { data: new Blob(["x"]), error: null };
      if (op === "createSignedUrl") return { data: { signedUrl: "https://firmato/x" }, error: null };
      return { data: null, error: null };
    }
    const scrive = path.some((p) => ["insert", "update", "upsert", "delete"].includes(p));
    if (op === "single" || op === "maybeSingle") {
      if (tabella === "dipendenti") return { data: { id: "dip-1", codice_fiscale: "VRDLNE80A41H501X", cognome: "VERDI", nome: "ELENA" }, error: null };
      return { data: { id: "nuovo-1" }, error: null };
    }
    if (!scrive && tabella === "tipi_corso") return { data: TIPI, error: null };
    if (!scrive && tabella === "coda_valutazioni") return { data: CODA, error: null, count: 1 };
    return { data: null, error: null, count: 1 };
  };
  const make = (path: string[]): any =>
    new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") return (ok: (v: unknown) => unknown) => ok(risposta(path));
        return make([...path, String(prop)]);
      },
      apply(_t, _this, args) {
        if (path.length === 1 && path[0] === "from") tabella = String(args[0]);
        log.push(["sb", path.filter((p) => p !== "()").join("."), tabella, JSON.stringify(args)]);
        return make([...path, "()"]);
      },
    });

  const rec = (nome: string) =>
    vi.fn((msg: unknown, opt?: unknown) => {
      log.push(["toast." + nome, String(msg), opt ? JSON.stringify(opt) : ""]);
      return "toast-id";
    });
  const toast = { success: rec("success"), error: rec("error"), info: rec("info"), loading: rec("loading") };
  return { log, makeClient: () => make([]), toast };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: makeClient() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/email-resend.functions", () => ({
  inviaEmailConResend: vi.fn(async (arg: unknown) => {
    log.push(["inviaEmailConResend", JSON.stringify(arg)]);
    return { ok: true };
  }),
}));
vi.mock("@tanstack/react-router", async (orig) => {
  const m: any = await orig();
  return { ...m, Link: ({ to, children, ...p }: any) => <a href={to} {...p}>{children}</a> };
});

import { Route } from "@/routes/operatore";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const campo = (id: string) => document.getElementById(id) as HTMLInputElement;
const riga = (cognome: string) => screen.getByText(new RegExp(`^${cognome} `)).closest("tr") as HTMLElement;
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const istantanea = (etichetta: string) => {
  log.push([
    "stato",
    etichetta,
    JSON.stringify({
      cognome: campo("cog").value,
      nome: campo("nom").value,
      cf: campo("cf").value,
      email: campo("email").value,
      reparto: campo("rep").value,
      data: campo("dt").value,
      ore: campo("ore").value,
      file: document.querySelector("div.font-mono")?.textContent,
      righe: document.querySelectorAll("tbody tr").length,
      pulsanteSalva: [...document.querySelectorAll("button")].map((b) => b.textContent).filter((t) => /coda|modifiche/.test(t ?? "")),
    }),
  ]);
};

beforeEach(() => {
  log.length = 0;
  let n = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `uuid-${++n}` as `${string}-${string}-${string}-${string}-${string}`);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Postazione Operatore: percorso d'uso completo", () => {
  it("registra tutto quello che la pagina fa", async () => {
    const Pagina = Route.options.component as () => JSX.Element;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Pagina />
      </QueryClientProvider>,
    );
    await screen.findByText("VERDI ELENA");
    istantanea("iniziale");

    // 1) salvataggio senza dati minimi: errore
    await clic(screen.getByText("Aggiungi alla coda"));

    // 2) compilo il modulo e salvo in coda
    fireEvent.change(campo("cog"), { target: { value: "neri" } });
    fireEvent.change(campo("nom"), { target: { value: "luca" } });
    fireEvent.change(campo("cf"), { target: { value: "nrelcu80a01h501u" } });
    fireEvent.change(campo("email"), { target: { value: " Luca@X.it " } });
    fireEvent.change(campo("dt"), { target: { value: "2026-09-01" } });
    fireEvent.change(campo("ore"), { target: { value: "6" } });
    istantanea("compilato");
    await clic(screen.getByText("Aggiungi alla coda"));
    istantanea("dopo salvataggio");

    // 3) «Non valido» senza note
    fireEvent.change(campo("cog"), { target: { value: "gialli" } });
    fireEvent.change(campo("cf"), { target: { value: "glllca80a01h501u" } });
    fireEvent.change(document.getElementById("note")!, { target: { value: "" } });
    await clic(screen.getByText("Archivia subito nel DB"));

    // 4) copia anagrafica di VERDI, poi modifica di ROSSI, poi svuota
    await clic(riga("VERDI").querySelector('[aria-label^="Copia dati anagrafici"]')!);
    istantanea("anagrafica copiata");
    await clic(riga("ROSSI").querySelector('[aria-label="Modifica"]')!);
    istantanea("in modifica");
    await clic(screen.getByText("Salva modifiche"));
    istantanea("modifica salvata");
    await clic(screen.getByText("Svuota"));
    istantanea("svuotato");

    // 5) duplica ed elimina
    await clic(riga("ROSSI").querySelector('[aria-label^="Duplica"]')!);
    await clic(riga("BIANCHI").querySelector('[aria-label="Elimina dalla coda"]')!);

    // 6) archiviazione: riga con tipo di corso mancante (errore) e riga con integrazione DVR
    await clic(riga("BIANCHI").querySelector('[aria-label="Aggiungi al database"]')!);
    await clic(riga("VERDI").querySelector('[aria-label="Aggiungi al database"]')!);

    // 7) selezione di più righe e archiviazione dei selezionati
    const caselle = document.querySelectorAll("tbody [role=checkbox]");
    await clic(caselle[0]!);
    await clic(caselle[2]!);
    await clic(screen.getByText(/Aggiungi selezionati al DB/));

    // 8) email: bozza per VERDI senza destinatario, poi con destinatario
    await clic(riga("VERDI").querySelector('[aria-label^="Invia email con Resend"]')!);
    fireEvent.change(document.getElementById("destinatariEmail")!, { target: { value: "a@x.it; B@x.it" } });
    fireEvent.change(document.getElementById("oggettoEmail")!, { target: { value: "Oggetto di prova" } });
    await clic(screen.getByText("Invia adesso con Resend"));

    // 9) email per due righe selezionate (saluto generico)
    await clic(screen.getByText(/Unica email/));
    log.push(["modale", (document.getElementById("corpoEmail") as HTMLTextAreaElement)?.value ?? "(chiusa)"]);
    await clic(screen.getByText("Annulla"));

    // 10) salva sul PC senza file allegato
    await clic(riga("VERDI").querySelector('[aria-label="Salva sul PC con nome"]')!);

    expect(log).toMatchSnapshot();
  });
});

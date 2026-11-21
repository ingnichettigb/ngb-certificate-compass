/*
 * File:          TabelleRaccordoRiferimenti.test.tsx
 * Percorso:      src/features/tabelle-raccordo/TabelleRaccordoRiferimenti.test.tsx
 * Data creazione: 2026-11-21
 * Punto di verità ruoli-corsi (Fase 3): selettori di ruolo e corso nella Tabella 02, codice dei ruoli (maiuscolo, bloccato in
 * modifica), blocchi di cancellazione e aggiornamento delle altre schermate dopo il salvataggio.
 * I menu a tendina Radix sono sostituiti da elenchi semplici: in jsdom non si aprono come nel browser.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { dati, toasts } = vi.hoisted(() => ({
  dati: {
    singoli: {} as Record<string, unknown>,
    tabelle: {
      ruoli_sicurezza: [
        { id: "r1", ordine: 1, nome: "Addetto DAE", codice: "ADD_DAE", tipo: "ruolo", richiede: null, obbligatorio_tutti: false, attivo: true, applica: false },
        { id: "r2", ordine: 2, nome: "Lavoratore", codice: "LAVORATORE", tipo: "ruolo", richiede: null, obbligatorio_tutti: true, attivo: true, applica: false },
        { id: "r3", ordine: 3, nome: "Vecchio senza codice", codice: null, tipo: "ruolo", richiede: null, obbligatorio_tutti: false, attivo: true, applica: false },
      ],
      tipi_corso: [
        { id: "c1", ordine: 1, codice: "BLS-BAS-05", nome_corso: "BLSD base" },
        { id: "c2", ordine: 2, codice: "BLS-AGG-05", nome_corso: "BLSD aggiornamento" },
      ],
      regole_ruolo_corso: [
        { id: "g1", ordine: 1, ruolo_codice: "ADD_DAE", ruolo: "Addetto DAE", parametro: "nessuno", valore: "—", corso_base: "BLS-BAS-05", corso_aggiornamento: "BLS-AGG-05", applica: false },
      ],
    } as Record<string, unknown[]>,
    // Solo quando il test lo chiede: negli altri casi la tabella si legge normalmente
    conteggio: (tabella: string): number | undefined =>
      tabella === "regole_ruolo_corso" && contaRegole.n > 0 ? contaRegole.n : undefined,
  },
  toasts: [] as string[],
}));
const contaRegole = vi.hoisted(() => ({ n: 0 }));

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
vi.mock("@/features/tipi-corso/TabellaTipiCorsoDialog", () => ({ TabellaTipiCorsoDialog: () => <button>Tabella corsi</button> }));
vi.mock("@/components/ui/select", async () => {
  const React = await import("react");
  const SelectTrigger = () => null;
  const SelectValue = () => null;
  const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const SelectItem = ({ value, children }: { value: string; children?: React.ReactNode }) => <option value={value}>{children}</option>;
  const Select = ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children?: React.ReactNode }) => {
    let id: string | undefined;
    React.Children.forEach(children, (c) => {
      if (React.isValidElement(c) && c.type === SelectTrigger) id = (c.props as { id?: string }).id;
    });
    return (
      <select id={id} value={value} onChange={(e) => onValueChange(e.target.value)}>
        <option value="" />
        {React.Children.map(children, (c) => (React.isValidElement(c) && c.type === SelectContent ? c : null))}
      </select>
    );
  };
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

import { registro } from "@/test/registratore-supabase";
import { TabelleRaccordoTab } from "./TabelleRaccordoTab";

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const clic = async (el: Element) => { fireEvent.click(el); await attendi(); };
const scrivi = async (el: Element, value: string) => { fireEvent.change(el, { target: { value } }); await attendi(); };

function monta() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalida = vi.spyOn(qc, "invalidateQueries");
  render(<QueryClientProvider client={qc}><TabelleRaccordoTab /></QueryClientProvider>);
  return { invalida };
}
const scritture = (tabella: string, op: string) =>
  registro.filter((r) => String(r[1]).endsWith(`.${op}`) && r[2] === tabella).map((r) => String(r[3]));
const vai02 = async () => {
  await clic(screen.getByRole("tab", { name: /^02 – Regole ruolo → corso/ }));
  await attendi();
};

beforeEach(() => { registro.length = 0; toasts.length = 0; contaRegole.n = 0; });
afterEach(cleanup);

describe("Tabella 02: ruolo e corsi come elenco", () => {
  it("nelle celle si vedono i nomi, non solo i codici", async () => {
    monta(); await attendi(); await vai02();
    const riga = document.querySelector("tbody tr")!.textContent!;
    expect(riga).toContain("Addetto DAE (ADD_DAE)");
    expect(riga).toContain("BLS-BAS-05 – BLSD base");
    expect(riga).toContain("BLS-AGG-05 – BLSD aggiornamento");
  });

  it("si cerca anche per nome del ruolo", async () => {
    monta(); await attendi(); await vai02();
    fireEvent.change(screen.getByLabelText("Cerca nella tabella"), { target: { value: "addetto dae" } });
    await attendi();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(document.querySelector("tbody tr")!.textContent).toContain("BLS-BAS-05");
    fireEvent.change(screen.getByLabelText("Cerca nella tabella"), { target: { value: "zzz" } });
    await attendi();
    expect(document.body.textContent).toContain("Nessun record corrisponde a «zzz»");
  });

  it("aggiungendo una regola si salvano i CODICI e si aggiornano le regole usate da Matrice e Scadenze", async () => {
    const { invalida } = monta(); await attendi(); await vai02();
    await clic(screen.getByRole("button", { name: /Aggiungi/ }));
    await scrivi(screen.getByLabelText(/^Ruolo/), "LAVORATORE");
    await scrivi(screen.getByLabelText(/^Corso base/), "BLS-BAS-05");
    await clic(screen.getByRole("button", { name: "Salva" }));
    const insert = scritture("regole_ruolo_corso", "insert").at(-1)!;
    expect(insert).toContain('"ruolo_codice":"LAVORATORE"');
    expect(insert).toContain('"corso_base":"BLS-BAS-05"');
    expect(insert).not.toContain('"ruolo":"');
    expect(invalida.mock.calls.some(([f]) => JSON.stringify((f as { queryKey: unknown }).queryKey) === '["regole-ruolo-corso"]')).toBe(true);
  });

  it("senza ruolo non salva", async () => {
    monta(); await attendi(); await vai02();
    await clic(screen.getByRole("button", { name: /Aggiungi/ }));
    await clic(screen.getByRole("button", { name: "Salva" }));
    expect(toasts).toContain("errore:Compila «Ruolo»");
    expect(scritture("regole_ruolo_corso", "insert")).toHaveLength(0);
  });

  it("duplicare una regola non viola il vincolo anti-doppioni: il valore diventa «… (copia)»", async () => {
    monta(); await attendi(); await vai02();
    await clic(document.querySelector("tbody tr")!);
    await clic(screen.getByRole("button", { name: /Duplica/ }));
    expect(scritture("regole_ruolo_corso", "insert").at(-1)).toContain("— (copia)");
  });
});

describe("Tabella 01: codice dei ruoli", () => {
  it("un codice con spazi non si salva", async () => {
    monta(); await attendi();
    await clic(screen.getByRole("button", { name: /Aggiungi/ }));
    await scrivi(screen.getByLabelText(/^Codice/), "add dae");
    await scrivi(screen.getByLabelText(/^Ruolo/), "Nuovo ruolo");
    await clic(screen.getByRole("button", { name: "Salva" }));
    expect(toasts).toContain("errore:«Codice» non valido");
    expect(scritture("ruoli_sicurezza", "insert")).toHaveLength(0);
  });

  it("un codice in minuscolo si salva in maiuscolo", async () => {
    const { invalida } = monta(); await attendi();
    await clic(screen.getByRole("button", { name: /Aggiungi/ }));
    await scrivi(screen.getByLabelText(/^Codice/), "oper_x_1");
    await scrivi(screen.getByLabelText(/^Ruolo/), "Operatore X");
    await scrivi(screen.getByLabelText(/^Richiede/), "LAVORATORE");
    await clic(screen.getByRole("button", { name: "Salva" }));
    const insert = scritture("ruoli_sicurezza", "insert").at(-1)!;
    expect(insert).toContain('"codice":"OPER_X_1"');
    expect(insert).toContain('"richiede":"LAVORATORE"');
    expect(invalida.mock.calls.some(([f]) => JSON.stringify((f as { queryKey: unknown }).queryKey) === '["ruoli-sicurezza"]')).toBe(true);
  });

  it("il codice di un ruolo che ce l'ha già non si cambia e non viene inviato", async () => {
    monta(); await attendi();
    await clic(document.querySelectorAll("tbody tr")[0]!);
    await clic(screen.getByRole("button", { name: /Modifica/ }));
    expect((screen.getByLabelText(/^Codice/) as HTMLInputElement).disabled).toBe(true);
    await scrivi(screen.getByLabelText(/^Ruolo/), "Addetto DAE (BLSD)");
    await clic(screen.getByRole("button", { name: "Salva" }));
    const update = scritture("ruoli_sicurezza", "update").at(-1)!;
    expect(update).toContain('"nome":"Addetto DAE (BLSD)"');
    expect(update).not.toContain('"codice"');
  });

  it("un ruolo senza codice (es. copia) si può ancora completare", async () => {
    monta(); await attendi();
    await clic(document.querySelectorAll("tbody tr")[2]!);
    await clic(screen.getByRole("button", { name: /Modifica/ }));
    expect((screen.getByLabelText(/^Codice/) as HTMLInputElement).disabled).toBe(false);
  });

  it("«Richiede» non offre il ruolo stesso", async () => {
    monta(); await attendi();
    await clic(document.querySelectorAll("tbody tr")[0]!);
    await clic(screen.getByRole("button", { name: /Modifica/ }));
    const valori = [...(screen.getByLabelText(/^Richiede/) as HTMLSelectElement).options].map((o) => o.value);
    expect(valori).toContain("LAVORATORE");
    expect(valori).not.toContain("ADD_DAE");
  });

  it("non cancella un ruolo che ha regole nella Tabella 02", async () => {
    contaRegole.n = 1;
    monta(); await attendi();
    await clic(document.querySelectorAll("tbody tr")[0]!);
    await clic(screen.getByRole("button", { name: /Cancella/ }));
    await clic(screen.getAllByRole("button", { name: "Cancella" }).at(-1)!);
    expect(scritture("ruoli_sicurezza", "delete")).toHaveLength(0);
    expect(toasts).toContain("errore:Cancellazione non possibile");
  });
});

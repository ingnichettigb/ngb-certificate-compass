/*
 * File:          SezioneSicurezzaDitta.test.tsx
 * Percorso:      src/features/ditta/SezioneSicurezzaDitta.test.tsx
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 12:45): Inserimento e rimozione dei codici ATECO, fasce mostrate dai numeri e campi della scuola.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SezioneSicurezzaDitta, type FormSicurezza } from "./SezioneSicurezzaDitta";
import type { Soglia } from "./regole-ditta";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const soglia = (ambito: string, da: number, a: number | null, esito: string): Soglia => ({
  id: `${ambito}-${da}`, ambito, da, a, etichetta: esito, esito, attiva: true,
});
const SOGLIE = [
  soglia("rls", 16, 200, "1 RLS"), soglia("primo_soccorso", 3, null, "Gruppo B"),
  soglia("antincendio_presenze", 101, 1000, "Livello 2"), soglia("idoneita_tecnica_presenze", 301, null, "Richiesta"),
];
const VUOTO: FormSicurezza = {
  codici_ateco: [], rischio_ditta: "", reparti_rischio_differenziato: false,
  n_lavoratori_dichiarato: "", e_scuola: false, presenze_contemporanee_max: "", livello_antincendio: "",
};

afterEach(cleanup);

function mostra(form: FormSicurezza, onChange = vi.fn(), inForza: number | null = 4) {
  render(<SezioneSicurezzaDitta form={form} onChange={onChange} soglie={SOGLIE} inForza={inForza} />);
  return onChange;
}

describe("sezione Sicurezza e rischio", () => {
  it("aggiunge un codice ATECO valido come principale, con il suggerimento di rischio per l'Istruzione", () => {
    const onChange = mostra(VUOTO);
    fireEvent.change(screen.getByLabelText(/Codici ATECO/), { target: { value: "853120" } });
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi codice ATECO" }));
    expect(onChange).toHaveBeenCalledWith({
      ...VUOTO, codici_ateco: [{ codice: "85.31.20", rischio: "medio", principale: true }],
    });
  });

  it("rifiuta un codice ATECO non valido", () => {
    const onChange = mostra(VUOTO);
    fireEvent.change(screen.getByLabelText(/Codici ATECO/), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi codice ATECO" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rifiuta un codice ATECO già inserito", () => {
    const onChange = mostra({ ...VUOTO, codici_ateco: [{ codice: "85.31.20", principale: true }] });
    fireEvent.change(screen.getByLabelText(/Codici ATECO/), { target: { value: "85.31.20" } });
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi codice ATECO" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("togliendo il codice principale il successivo diventa principale", () => {
    const onChange = mostra({
      ...VUOTO,
      codici_ateco: [{ codice: "85.31.20", principale: true }, { codice: "47.11", principale: false }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Togli ATECO 85.31.20" }));
    expect(onChange).toHaveBeenCalledWith({ ...VUOTO, codici_ateco: [{ codice: "47.11", principale: true }] });
  });

  it("mostra RLS e Primo Soccorso dal numero dei lavoratori e quanti sono in forza nel programma", () => {
    mostra({ ...VUOTO, n_lavoratori_dichiarato: "85" }, vi.fn(), 4);
    expect(screen.getByText("1 RLS")).toBeTruthy();
    expect(screen.getByText("Gruppo B")).toBeTruthy();
    expect(screen.getByText(/In forza nel programma/).textContent).toContain("4");
  });

  it("i campi della scuola compaiono solo se è una scuola, con livello antincendio e idoneità suggeriti", () => {
    mostra(VUOTO);
    expect(screen.queryByLabelText(/Persone presenti/)).toBeNull();
    cleanup();
    mostra({ ...VUOTO, e_scuola: true, presenze_contemporanee_max: "450" });
    expect(screen.getByLabelText(/Persone presenti/)).toBeTruthy();
    expect(screen.getByText("Livello 2")).toBeTruthy();
    expect(screen.getByText("Richiesta")).toBeTruthy();
  });
});

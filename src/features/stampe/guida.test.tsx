/*
 * File:      guida.test.tsx
 * Percorso:  src/features/stampe/guida.test.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Test della guida (indice, ricette «Applica questi filtri»), del totale in fondo e dei suggerimenti.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { FILTRI_INIZIALI, testoTotale, TUTTI, type RigaStampa } from "./dati-stampa";
import { RICETTE } from "./guida-ricette";
import { GuidaStampe } from "./components/GuidaStampe";
import { SUGGERIMENTI, SUGGERIMENTI_MODELLO } from "./suggerimenti";

const ruolo = (id: string, nome: string, macro: string): RuoloSicurezza =>
  ({ id, nome, descrizione: null, macro_categoria: macro, obbligatorio_tutti: false, attivo: true, ordine: 0 }) as RuoloSicurezza;
const RUOLI = [ruolo("r1", "Preposto", "Preposto"), ruolo("r3", "Addetto Antincendio", "Antincendio")];

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function apri(ruoli = RUOLI) {
  const onApplica = vi.fn();
  render(<GuidaStampe ruoli={ruoli} onApplica={onApplica} />);
  fireEvent.click(screen.getByRole("button", { name: /guida a stampe e report/i }));
  return onApplica;
}

describe("Guida a Stampe & Report", () => {
  it("in cima c'è l'indice con le sezioni e con ogni ricetta", () => {
    apri();
    const indice = screen.getByRole("navigation", { name: /indice della guida/i });
    expect(within(indice).getByText("Attestato o incarico?")).toBeTruthy();
    expect(within(indice).getByText("Come leggere le colonne")).toBeTruthy();
    for (const r of RICETTE) expect(within(indice).getByText(r.titolo)).toBeTruthy();
  });
  it("un clic sull'indice porta alla ricetta", () => {
    apri();
    const indice = screen.getByRole("navigation", { name: /indice della guida/i });
    fireEvent.click(within(indice).getByText("Stampa solo l'elenco dei preposti con incarico assegnato"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
  it("spiega la differenza tra attestato e incarico e il neretto", () => {
    apri();
    expect(screen.getByText(/Attestato \(storico\)/)).toBeTruthy();
    expect(screen.getByText(/Incarico \(oggi\)/)).toBeTruthy();
    expect(screen.getAllByText(/Data in neretto/).length).toBeGreaterThan(0);
  });
  it("«Applica questi filtri» imposta preposti con incarico assegnato", () => {
    const onApplica = apri();
    const scheda = document.getElementById("guida-ricetta-preposti-incarico")!;
    fireEvent.click(within(scheda).getByRole("button", { name: /applica questi filtri/i }));
    expect(onApplica).toHaveBeenCalledTimes(1);
    const [filtri, titolo] = onApplica.mock.calls[0]!;
    expect(filtri).toMatchObject({ modello: "gruppo", gruppo: "preposti", soloIncarichi: true, ruoloId: TUTTI });
    expect(titolo).toBe("Stampa solo l'elenco dei preposti con incarico assegnato");
  });
  it("la ricetta «incarico senza attestato» imposta il ruolo Preposto trovato nella Matrice", () => {
    const onApplica = apri();
    const scheda = document.getElementById("guida-ricetta-incarico-senza-attestato")!;
    fireEvent.click(within(scheda).getByRole("button", { name: /applica questi filtri/i }));
    expect(onApplica.mock.calls[0]![0]).toMatchObject({ modello: "lavoratori", ruoloId: "r1" });
  });
  it("senza ruolo Preposto nella Matrice quella ricetta è spenta e lo dice", () => {
    apri([ruolo("r3", "Addetto Antincendio", "Antincendio")]);
    const scheda = document.getElementById("guida-ricetta-incarico-senza-attestato")!;
    expect((within(scheda).getByRole("button", { name: /applica questi filtri/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(scheda).getByText(/non c'è un ruolo «Preposto» attivo/)).toBeTruthy();
  });
  it("ogni ricetta disponibile parte dai filtri iniziali e ha un modello valido", () => {
    for (const r of RICETTE) {
      const f = r.applica(RUOLI);
      if (!f) continue;
      expect(f.modello).toBeTruthy();
      expect(f.includiCessati).toBe(FILTRI_INIZIALI.includiCessati);
    }
  });
});

describe("totale in fondo e suggerimenti", () => {
  const riga = (id: string, dip: string) => ({ id, dipendenteId: dip }) as RigaStampa;
  it("elenco lavoratori: solo i lavoratori", () => {
    expect(testoTotale("lavoratori", [riga("1", "a"), riga("2", "b")])).toBe("2 lavoratori");
  });
  it("altri documenti: righe e lavoratori distinti", () => {
    expect(testoTotale("registro", [riga("1", "a"), riga("2", "a"), riga("3", "b")])).toBe("3 righe · 2 lavoratori");
  });
  it("i suggerimenti dei due filtri chiave distinguono attestato e incarico", () => {
    expect(SUGGERIMENTI.gruppo).toContain("ATTESTATO");
    expect(SUGGERIMENTI.ruolo).toContain("INCARICO");
  });
  it("«Elenco incaricati per gruppo» non dice di elencare i nominati", () => {
    expect(SUGGERIMENTI_MODELLO.gruppo).toContain("Non è l'elenco dei nominati");
  });
});

/*
 * File:      TabellaStampa.ordine.test.tsx
 * Percorso:  src/features/stampe/components/TabellaStampa.ordine.test.tsx
 * Data creaz: 06/11/2026
 * Verifica che il clic sull'intestazione chieda l'ordinamento e che le righe seguano l'ordine scelto.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TabellaStampa } from "./TabellaStampa";
import type { RigaStampa } from "../dati-stampa";

const riga = (id: string, cognome: string): RigaStampa => ({
  id, dipendenteId: id, cognome, nome: "X", cf: "", reparto: "Docente", sottoreparto: "", materia: "", mansione: "", ruoli: "",
  assunzione: null, luogoNascita: "", dataNascita: null, formazione: {}, mancanti: [], fineContratto: null, cessazione: null,
  corso: "Preposto", codice: "PRP", gruppo: "g", gruppoTitolo: "G", ore: 8, numero: "", dataCorso: "2020-01-01",
  scadenza: "2024-01-01", stato: "valido", giorniAllaScadenza: null,
});
const nomi = () => Array.from(document.querySelectorAll("tbody tr")).map((tr) => tr.children[1]?.textContent);

afterEach(() => cleanup());

describe("intestazioni ordinabili", () => {
  it("il clic sul titolo chiama onOrdina con la colonna", () => {
    const onOrdina = vi.fn();
    render(<TabellaStampa righe={[riga("1", "Rossi")]} colonne={["lavoratore", "scadenza"]} onOrdina={onOrdina} />);
    fireEvent.click(screen.getByRole("button", { name: /Lavoratore/ }));
    expect(onOrdina).toHaveBeenCalledWith("lavoratore");
  });

  it("mostra le righe nell'ordine scelto e segna la colonna ordinata", () => {
    const righe = [riga("1", "Rossi"), riga("2", "Bianchi"), riga("3", "Verdi")];
    const { rerender } = render(
      <TabellaStampa righe={righe} colonne={["lavoratore"]} ordine={{ colonna: "lavoratore", direzione: "asc" }} onOrdina={() => {}} />,
    );
    expect(nomi()).toEqual(["Bianchi X", "Rossi X", "Verdi X"]);
    expect(screen.getByRole("columnheader", { name: /Lavoratore/ }).getAttribute("aria-sort")).toBe("ascending");
    rerender(<TabellaStampa righe={righe} colonne={["lavoratore"]} ordine={{ colonna: "lavoratore", direzione: "desc" }} onOrdina={() => {}} />);
    expect(nomi()).toEqual(["Verdi X", "Rossi X", "Bianchi X"]);
  });
});

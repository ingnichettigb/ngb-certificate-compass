/*
 * File:      TabellaStampa.colonne.test.tsx
 * Percorso:  src/features/stampe/components/TabellaStampa.colonne.test.tsx
 * Data creaz: 07/11/2026
 * Verifica il «+» delle colonne, le maniglie di larghezza (trascinamento e doppio clic) e che senza le nuove proprietà non cambi nulla.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { TabellaStampa } from "./TabellaStampa";
import { gruppiColonne, type RigaStampa } from "../dati-stampa";

const riga = (id: string, cognome: string, cf = ""): RigaStampa => ({
  id, dipendenteId: id, cognome, nome: "X", cf, reparto: "Docente", sottoreparto: "", materia: "", mansione: "", ruoli: "",
  assunzione: null, luogoNascita: "", dataNascita: null, formazione: {}, mancanti: [], fineContratto: null, cessazione: null,
  corso: "Preposto", codice: "PRP", gruppo: "g", gruppoTitolo: "G", ore: 8, numero: "", dataCorso: "2020-01-01",
  scadenza: "2024-01-01", stato: "valido", giorniAllaScadenza: null,
});

beforeAll(() => {
  // jsdom non ha il canvas: la tabella usa allora una misura stimata.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => cleanup());

const righe = [riga("1", "Rossi", "RSSMRA80A01H501U"), riga("2", "Bianchi", "BNCLGI75B02F205X")];

describe("senza le nuove proprietà la tabella è quella di prima", () => {
  it("niente «+», niente maniglie, larghezza automatica", () => {
    const { container } = render(<TabellaStampa righe={righe} colonne={["lavoratore", "cf"]} onRimuoviColonna={() => {}} />);
    expect(screen.queryByRole("button", { name: /Aggiungi o togli colonne/ })).toBeNull();
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
    const tabella = container.querySelector("table")!;
    expect(tabella.style.tableLayout).toBe("");
    expect(tabella.querySelector("colgroup")).toBeNull();
    expect(container.querySelectorAll("thead th")).toHaveLength(3); // N° + 2 colonne
  });
});

describe("«+» in fondo all'intestazione", () => {
  it("compare come ultima cella, non si stampa e apre l'elenco per gruppi in ordine alfabetico", () => {
    const onAlterna = vi.fn();
    const { container } = render(
      <TabellaStampa righe={righe} colonne={["lavoratore", "cf"]} gruppiColonne={gruppiColonne("registro")} onAlternaColonna={onAlterna} />,
    );
    const celle = container.querySelectorAll("thead th");
    const ultima = celle[celle.length - 1]!;
    expect(ultima.className).toContain("print:hidden");
    expect(within(ultima as HTMLElement).getByRole("button", { name: /Aggiungi o togli colonne/ })).toBeTruthy();
    // La riga dei dati ha la cella corrispondente (nascosta in stampa): la griglia resta allineata.
    expect(container.querySelectorAll("tbody tr")[0]!.querySelectorAll("td")).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: /Aggiungi o togli colonne/ }));
    const titoli = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(titoli).toEqual(["Anagrafica", "Attestato", "Contratto", "Controllo dati"]);
  });

  it("le colonne mostrate sono spuntate e spuntarne un'altra chiama onAlternaColonna", () => {
    const onAlterna = vi.fn();
    render(<TabellaStampa righe={righe} colonne={["lavoratore", "cf"]} gruppiColonne={gruppiColonne("registro")} onAlternaColonna={onAlterna} />);
    fireEvent.click(screen.getByRole("button", { name: /Aggiungi o togli colonne/ }));
    expect(screen.getByRole("checkbox", { name: "Codice fiscale" }).getAttribute("data-state")).toBe("checked");
    expect(screen.getByRole("checkbox", { name: "Giorni alla scadenza" }).getAttribute("data-state")).toBe("unchecked");
    fireEvent.click(screen.getByRole("checkbox", { name: "Giorni alla scadenza" }));
    expect(onAlterna).toHaveBeenCalledWith("giorni");
  });

  it("l'ultima colonna rimasta non si può togliere", () => {
    render(<TabellaStampa righe={righe} colonne={["lavoratore"]} gruppiColonne={gruppiColonne("registro")} onAlternaColonna={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Aggiungi o togli colonne/ }));
    expect((screen.getByRole("checkbox", { name: "Lavoratore" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("larghezza delle colonne", () => {
  it("con una colonna ridimensionata usa larghezze fisse e in stampa le ripartisce in percentuale", () => {
    const { container } = render(
      <TabellaStampa righe={righe} colonne={["lavoratore", "cf"]} larghezze={{ lavoratore: 200 }} onLarghezze={() => {}} />,
    );
    const tabella = container.querySelector("table")!;
    expect(tabella.style.tableLayout).toBe("fixed");
    expect(tabella.className).toContain("print:w-full");
    const cols = Array.from(container.querySelectorAll("col"));
    expect(cols).toHaveLength(3); // N° + 2 colonne
    expect(cols[1]!.style.getPropertyValue("--w")).toBe("200px");
    const percentuali = cols.map((c) => parseFloat(c.style.getPropertyValue("--p")));
    expect(percentuali.reduce((a, b) => a + b, 0)).toBeGreaterThan(99.9);
    expect(percentuali.reduce((a, b) => a + b, 0)).toBeLessThan(100.1);
  });

  it("c'è una maniglia per colonna e il trascinamento cambia solo quella colonna", () => {
    const onLarghezze = vi.fn();
    render(<TabellaStampa righe={righe} colonne={["lavoratore", "cf"]} larghezze={{ lavoratore: 100, cf: 140 }} onLarghezze={onLarghezze} />);
    const maniglie = screen.getAllByRole("separator");
    expect(maniglie).toHaveLength(2);
    fireEvent(maniglie[0]!, new MouseEvent("pointerdown", { bubbles: true, clientX: 300 }));
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 340 }));
    expect(onLarghezze).toHaveBeenLastCalledWith({ lavoratore: 140, cf: 140 });
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 250 }));
    expect(onLarghezze).toHaveBeenLastCalledWith({ lavoratore: 50, cf: 140 });
    window.dispatchEvent(new MouseEvent("pointerup"));
    onLarghezze.mockClear();
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 400 }));
    expect(onLarghezze).not.toHaveBeenCalled(); // finito il trascinamento non ascolta più
  });

  it("il trascinamento non scende sotto il minimo", () => {
    const onLarghezze = vi.fn();
    render(<TabellaStampa righe={righe} colonne={["lavoratore"]} larghezze={{ lavoratore: 100 }} onLarghezze={onLarghezze} />);
    fireEvent(screen.getByRole("separator"), new MouseEvent("pointerdown", { bubbles: true, clientX: 300 }));
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 0 }));
    expect(onLarghezze).toHaveBeenLastCalledWith({ lavoratore: 48 });
    window.dispatchEvent(new MouseEvent("pointerup"));
  });

  it("il doppio clic adatta la colonna al contenuto più lungo, anche di altre sezioni, e lascia le altre colonne com'erano", () => {
    const onLarghezze = vi.fn();
    const altreSezioni = [riga("9", "Rossi", "UN-CODICE-FISCALE-MOLTO-MOLTO-LUNGO-1234567890")];
    render(
      <TabellaStampa
        righe={righe} righeMisura={[...righe, ...altreSezioni]} colonne={["lavoratore", "cf"]}
        larghezze={{ lavoratore: 100, cf: 300 }} onLarghezze={onLarghezze}
      />,
    );
    fireEvent.doubleClick(screen.getAllByRole("separator")[1]!);
    const chiamata = onLarghezze.mock.calls[0]![0] as Record<string, number>;
    expect(chiamata["lavoratore"]).toBe(100);
    // La cella più lunga (47 caratteri) sta in un'altra sezione: con le sole righe di questa tabella (16 caratteri) si sarebbe
    // ottenuta una larghezza di circa 115 px.
    expect(chiamata["cf"]).toBeGreaterThan(250);
    expect(chiamata["cf"]).toBeLessThanOrEqual(640);
  });

  it("senza onLarghezze non ci sono maniglie neanche se le larghezze sono salvate", () => {
    render(<TabellaStampa righe={righe} colonne={["lavoratore"]} larghezze={{ lavoratore: 100 }} />);
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
  });
});

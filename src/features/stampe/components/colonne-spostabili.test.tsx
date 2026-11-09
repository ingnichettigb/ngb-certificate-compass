/*
 * File:      colonne-spostabili.test.tsx
 * Percorso:  src/features/stampe/components/colonne-spostabili.test.tsx
 * Data creaz: 08/11/2026
 * Verifica lo spostamento delle colonne (trascinamento dell'intestazione e frecce nel «+»), l'ordine ricordato,
 * la barra Tutti / Solo docenti / Solo ATA e che senza le nuove proprietà nulla cambi.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { TabellaStampa } from "./TabellaStampa";
import { BarraDestinatari } from "./BarraDestinatari";
import { gruppiColonne, type Colonna, type RigaStampa } from "../dati-stampa";
import { applicaPreferenze, leggiPreferenze, PREFERENZE_VUOTE, salvaPreferenze, senzaModifiche, spostaColonna, spostaDi, type PreferenzeColonne } from "../preferenze-colonne";

const riga = (id: string, cognome: string): RigaStampa => ({
  id, dipendenteId: id, cognome, nome: "X", cf: "CF", reparto: "Docente", sottoreparto: "", materia: "", mansione: "", ruoli: "",
  assunzione: null, luogoNascita: "", dataNascita: null, formazione: {}, mancanti: [], fineContratto: null, cessazione: null,
  corso: "Preposto", codice: "PRP", gruppo: "g", gruppoTitolo: "G", ore: 8, numero: "", dataCorso: "2020-01-01",
  scadenza: "2024-01-01", stato: "valido", giorniAllaScadenza: null,
});

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => cleanup());

const BASE: Colonna[] = ["lavoratore", "cf", "reparto", "scadenza"];

describe("ordine delle colonne ricordato", () => {
  it("senza ordine scelto le colonne restano com'erano", () => {
    expect(applicaPreferenze(BASE, PREFERENZE_VUOTE, "scadenze")).toEqual(BASE);
  });
  it("spostaColonna porta una colonna nella posizione di un'altra", () => {
    const p = spostaColonna(BASE, PREFERENZE_VUOTE, "scadenza", "cf");
    expect(applicaPreferenze(BASE, p, "scadenze")).toEqual(["lavoratore", "scadenza", "cf", "reparto"]);
  });
  it("spostaDi sposta di una posizione e si ferma ai bordi", () => {
    const p = spostaDi(BASE, PREFERENZE_VUOTE, "cf", -1);
    expect(applicaPreferenze(BASE, p, "scadenze")).toEqual(["cf", "lavoratore", "reparto", "scadenza"]);
    expect(spostaDi(BASE, PREFERENZE_VUOTE, "lavoratore", -1)).toBe(PREFERENZE_VUOTE);
    expect(spostaDi(BASE, PREFERENZE_VUOTE, "scadenza", 1)).toBe(PREFERENZE_VUOTE);
  });
  it("una colonna tolta sparisce dall'ordine, una aggiunta dopo va in fondo", () => {
    const p: PreferenzeColonne = { ...spostaColonna(BASE, PREFERENZE_VUOTE, "scadenza", "lavoratore"), tolte: ["cf"], aggiunte: ["stato"] };
    expect(applicaPreferenze(BASE, p, "scadenze")).toEqual(["scadenza", "lavoratore", "reparto", "stato"]);
  });
  it("l'ordine si salva e si rilegge; «Ripristina» (preferenze vuote) lo cancella", () => {
    const memoria = new Map<string, string>();
    const archivio = { getItem: (k: string) => memoria.get(k) ?? null, setItem: (k: string, v: string) => void memoria.set(k, v), removeItem: (k: string) => void memoria.delete(k) };
    const p = spostaColonna(BASE, PREFERENZE_VUOTE, "scadenza", "cf");
    expect(senzaModifiche(p)).toBe(false);
    salvaPreferenze("pre:scadenze-privacy", p, archivio as never);
    expect(leggiPreferenze("pre:scadenze-privacy", archivio as never).ordine).toEqual(["lavoratore", "scadenza", "cf", "reparto"]);
    salvaPreferenze("pre:scadenze-privacy", PREFERENZE_VUOTE, archivio as never);
    expect(leggiPreferenze("pre:scadenze-privacy", archivio as never).ordine).toBeUndefined();
  });
  it("preferenze vecchie, senza ordine, si leggono come prima", () => {
    const archivio = { getItem: () => JSON.stringify({ v: { tolte: ["cf"], aggiunte: [], larghezze: {} } }), setItem: () => {}, removeItem: () => {} };
    expect(leggiPreferenze("v", archivio as never)).toEqual({ tolte: ["cf"], aggiunte: [], larghezze: {} });
  });
});

describe("trascinamento dell'intestazione", () => {
  const righe = [riga("1", "Rossi")];
  const colonne: Colonna[] = ["lavoratore", "cf", "scadenza"];

  it("senza onSposta non c'è nessuna maniglia", () => {
    render(<TabellaStampa righe={righe} colonne={colonne} />);
    expect(screen.queryByTitle("Trascina per spostare la colonna")).toBeNull();
  });
  it("una maniglia per colonna, nascosta in stampa", () => {
    render(<TabellaStampa righe={righe} colonne={colonne} onSposta={() => {}} />);
    const maniglie = screen.getAllByTitle("Trascina per spostare la colonna");
    expect(maniglie).toHaveLength(3);
    expect(maniglie[0]!.className).toContain("print:hidden");
  });
  it("prendere «Scadenza» e lasciarla su «Codice fiscale» chiama onSposta(scadenza, cf)", () => {
    const onSposta = vi.fn();
    const { container } = render(<TabellaStampa righe={righe} colonne={colonne} onSposta={onSposta} />);
    const dati = new Map<string, string>();
    const dataTransfer = { setData: (k: string, v: string) => void dati.set(k, v), getData: (k: string) => dati.get(k) ?? "", effectAllowed: "", dropEffect: "" };
    const maniglia = screen.getByLabelText("Sposta la colonna Scadenza");
    fireEvent.dragStart(maniglia, { dataTransfer });
    const cf = container.querySelector('th[data-col="cf"]')!;
    fireEvent.dragOver(cf, { dataTransfer });
    fireEvent.drop(cf, { dataTransfer });
    expect(onSposta).toHaveBeenCalledWith("scadenza", "cf");
  });
  it("lasciare la colonna su se stessa non fa nulla", () => {
    const onSposta = vi.fn();
    const { container } = render(<TabellaStampa righe={righe} colonne={colonne} onSposta={onSposta} />);
    const dati = new Map<string, string>();
    const dataTransfer = { setData: (k: string, v: string) => void dati.set(k, v), getData: (k: string) => dati.get(k) ?? "", effectAllowed: "", dropEffect: "" };
    fireEvent.dragStart(screen.getByLabelText("Sposta la colonna Codice fiscale"), { dataTransfer });
    fireEvent.drop(container.querySelector('th[data-col="cf"]')!, { dataTransfer });
    expect(onSposta).not.toHaveBeenCalled();
  });
});

describe("frecce nel «+»", () => {
  it("compaiono con onSpostaDi e spostano la colonna scelta", () => {
    const onSpostaDi = vi.fn();
    const { container } = render(
      <TabellaStampa righe={[riga("1", "Rossi")]} colonne={["lavoratore", "cf", "scadenza"]} gruppiColonne={gruppiColonne("scadenze")} onAlternaColonna={() => {}} onSpostaDi={onSpostaDi} />,
    );
    const ultima = container.querySelectorAll("thead th");
    fireEvent.click(within(ultima[ultima.length - 1] as HTMLElement).getByRole("button", { name: /Aggiungi o togli colonne/ }));
    const ordine = screen.getByRole("region", { name: "Ordine delle colonne" });
    fireEvent.click(within(ordine).getByRole("button", { name: "Sposta Codice fiscale a sinistra" }));
    expect(onSpostaDi).toHaveBeenCalledWith("cf", -1);
    fireEvent.click(within(ordine).getByRole("button", { name: "Sposta Codice fiscale a destra" }));
    expect(onSpostaDi).toHaveBeenCalledWith("cf", 1);
    expect((within(ordine).getByRole("button", { name: "Sposta Lavoratore a sinistra" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(ordine).getByRole("button", { name: "Sposta Scadenza a destra" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("barra Tutti / Solo docenti / Solo ATA", () => {
  it("mostra i conteggi e segnala la scelta", () => {
    render(<BarraDestinatari scelto="tutti" conteggi={{ tutti: 48, docenti: 31, ata: 17 }} onSeleziona={() => {}} />);
    expect(screen.getByRole("button", { name: /Tutti.*48/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Solo docenti.*31/ }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /Solo ATA.*17/ })).toBeTruthy();
    expect(screen.getByText(/Docenti e ATA su pagine separate/)).toBeTruthy();
  });
  it("il clic sceglie il pubblico", () => {
    const onSeleziona = vi.fn();
    render(<BarraDestinatari scelto="tutti" conteggi={{ tutti: 4, docenti: 2, ata: 2 }} onSeleziona={onSeleziona} />);
    fireEvent.click(screen.getByRole("button", { name: /Solo ATA/ }));
    expect(onSeleziona).toHaveBeenCalledWith("ata");
  });
});

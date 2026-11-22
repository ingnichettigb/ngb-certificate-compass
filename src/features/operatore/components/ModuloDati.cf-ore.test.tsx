/*
 * File:      ModuloDati.cf-ore.test.tsx
 * Percorso:  src/features/operatore/components/ModuloDati.cf-ore.test.tsx
 * Data creazione: 22/11/2026
 * Test del modulo dati: riconoscimento del lavoratore dal Codice Fiscale, ore proposte dal corso ed elenco corsi con categorie.
 * Revisioni:
 *   rev 1 — 22/11/2026 — Riconoscimento dal CF e ore proposte dal corso.
 *   rev 2 — 22/11/2026 — Il corso si sceglie dal nuovo elenco (SelettoreCorso): aggiornata la procedura di scelta;
 *                        aggiunti i test su categorie, ricerca, ultimo scelto per primo e aggiornamenti in fondo.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";

const { cerca, ateco, toast } = vi.hoisted(() => ({
  cerca: vi.fn(),
  ateco: vi.fn(async () => "85"),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/dipendenti", () => ({ cercaDipendentePerAnagrafica: cerca, recuperaAtecoPredefinito: ateco }));
vi.mock("./SelezioneRepartoModulo", () => ({
  SelezioneRepartoModulo: ({ value }: { value: string }) => <input id="rep" readOnly value={value} />,
}));

import { ModuloDati } from "./ModuloDati";
import { VUOTA, type Riga, type TipoCorso } from "../types";

const TIPI: TipoCorso[] = [
  { id: "t1", nome_corso: "Antincendio livello 1", macro_categoria: "Antincendio", livello_specifico: "Base", ore_minime_legge: 4, codice: "ANT1", durata_validita_anni: 5 },
  { id: "t2", nome_corso: "Primo soccorso", macro_categoria: "Primo Soccorso", livello_specifico: "Base", ore_minime_legge: 12, codice: "PS", durata_validita_anni: 3 },
  { id: "t3", nome_corso: "Corso senza ore", macro_categoria: "Altro", livello_specifico: "Base", ore_minime_legge: null, codice: "X", durata_validita_anni: null },
];

function Pagina({ iniziale = {} }: { iniziale?: Partial<Omit<Riga, "id">> }) {
  const [form, setForm] = useState<Omit<Riga, "id">>({ ...VUOTA, ...iniziale });
  return (
    <ModuloDati
      form={form}
      set={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
      tipi={TIPI}
      campoOcr={null}
      setCampoOcr={() => {}}
      haAnteprima={false}
      totPagine={0}
      pagine=""
      setPagine={() => {}}
      idInModifica={null}
      salvando={false}
      archiviando={false}
      onSvuota={() => {}}
      onSalva={() => {}}
    />
  );
}
const campo = (id: string) => document.getElementById(id) as HTMLInputElement;
const scrivi = (id: string, value: string) => act(async () => void fireEvent.change(campo(id), { target: { value } }));

beforeEach(() => {
  window.localStorage.clear();
  // Il menu «Esito» è un Radix Select: in jsdom servono questi tre metodi, assenti nel DOM simulato.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  vi.clearAllMocks();
  ateco.mockResolvedValue("85");
});

describe("ModuloDati: riconoscimento dal Codice Fiscale", () => {
  it("con CF completo trovato compila cognome, nome, reparto, email e ATECO", async () => {
    cerca.mockResolvedValue({ cognome: "Rossi", nome: "Mario", codice_fiscale: "RSSMRA80A01H501U", reparto: "Docente", email: "m@x.it", codice_ateco: "85.20", data_nascita: null, luogo_nascita: null });
    render(<Pagina />);
    await scrivi("cf", "rssmra80a01h501u");
    await waitFor(() => expect(campo("cog").value).toBe("ROSSI"));
    expect(campo("nom").value).toBe("MARIO");
    expect(campo("rep").value).toBe("Docente");
    expect(campo("email").value).toBe("m@x.it");
    expect(campo("ateco").value).toBe("85.20");
    expect(cerca).toHaveBeenCalledWith({ codice_fiscale: "RSSMRA80A01H501U" });
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("senza ATECO del lavoratore propone quello predefinito dell'azienda", async () => {
    cerca.mockResolvedValue({ cognome: "ROSSI", nome: "MARIO", codice_fiscale: "RSSMRA80A01H501U", reparto: null, email: null, codice_ateco: null });
    render(<Pagina />);
    await scrivi("cf", "RSSMRA80A01H501U");
    await waitFor(() => expect(campo("ateco").value).toBe("85"));
  });

  it("non cerca finché il CF non è completo e non cerca due volte lo stesso CF", async () => {
    cerca.mockResolvedValue(null);
    render(<Pagina />);
    await scrivi("cf", "RSSMRA80A01");
    expect(cerca).not.toHaveBeenCalled();
    await scrivi("cf", "RSSMRA80A01H501U");
    await waitFor(() => expect(cerca).toHaveBeenCalledTimes(1));
    await scrivi("cf", "RSSMRA80A01H501U");
    expect(cerca).toHaveBeenCalledTimes(1);
  });

  it("CF non in anagrafica: nessun dato inventato e nessun avviso", async () => {
    cerca.mockResolvedValue(null);
    render(<Pagina iniziale={{ cognome: "BIANCHI", nome: "ANNA" }} />);
    await scrivi("cf", "BNCNNA85B41F205X");
    await waitFor(() => expect(cerca).toHaveBeenCalled());
    expect(campo("cog").value).toBe("BIANCHI");
    expect(campo("ateco").value).toBe("");
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("non sovrascrive email, reparto e ATECO già compilati", async () => {
    cerca.mockResolvedValue({ cognome: "ROSSI", nome: "MARIO", codice_fiscale: "RSSMRA80A01H501U", reparto: "ATA", email: "db@x.it", codice_ateco: "99" });
    render(<Pagina iniziale={{ email: "mio@x.it", reparto: "Docente", codice_ateco: "85.59" }} />);
    await scrivi("cf", "RSSMRA80A01H501U");
    await waitFor(() => expect(campo("cog").value).toBe("ROSSI"));
    expect(campo("email").value).toBe("mio@x.it");
    expect(campo("rep").value).toBe("Docente");
    expect(campo("ateco").value).toBe("85.59");
  });
});

describe("ModuloDati: ore proposte dal corso", () => {
  async function scegliCorso(nome: string) {
    const trigger = screen.getAllByRole("combobox")[0]!; // il primo menu del modulo è «Corso identificato»
    await act(async () => void fireEvent.click(trigger));
    const voce = await screen.findByRole("option", { name: new RegExp(nome) });
    await act(async () => void fireEvent.click(voce));
  }

  it("campo vuoto: propone le ore di legge del corso scelto", async () => {
    render(<Pagina />);
    await scegliCorso("Antincendio livello 1");
    await waitFor(() => expect(campo("ore").value).toBe("4"));
  });

  it("ore già modificate a mano: il cambio di corso non le tocca", async () => {
    render(<Pagina iniziale={{ tipo_corso_id: "t1", ore: 6 }} />);
    await scegliCorso("Primo soccorso");
    expect(campo("ore").value).toBe("6");
  });

  it("ore ancora quelle automatiche del corso precedente: passano a quelle del nuovo corso", async () => {
    render(<Pagina iniziale={{ tipo_corso_id: "t1", ore: 4 }} />);
    await scegliCorso("Primo soccorso");
    await waitFor(() => expect(campo("ore").value).toBe("12"));
  });

  it("corso senza ore a catalogo: lascia il campo com'è", async () => {
    render(<Pagina />);
    await scegliCorso("Corso senza ore");
    expect(campo("ore").value).toBe("");
  });
});

describe("ModuloDati: elenco corsi con categorie", () => {
  const apri = async () => act(async () => void fireEvent.click(screen.getAllByRole("combobox")[0]!));
  const nomiVisibili = () => screen.queryAllByRole("option").map((o) => o.textContent ?? "");

  it("in alto ci sono le categorie lette dai corsi, in ordine alfabetico, con «Tutte»", async () => {
    render(<Pagina />);
    await apri();
    const gruppo = screen.getByRole("group", { name: "Categorie" });
    const testi = Array.from(gruppo.querySelectorAll("button")).map((b) => b.textContent);
    expect(testi).toEqual(["Tutte (3)", "Altro (1)", "Antincendio (1)", "Primo Soccorso (1)"]);
  });

  it("scegliendo una categoria restano solo i suoi corsi; due categorie: i corsi di entrambe", async () => {
    render(<Pagina />);
    await apri();
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: /^Primo Soccorso/ })));
    expect(nomiVisibili()).toHaveLength(1);
    expect(nomiVisibili()[0]).toMatch(/Primo soccorso/);
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: /^Antincendio/ })));
    expect(nomiVisibili()).toHaveLength(2);
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: /^Tutte/ })));
    expect(nomiVisibili()).toHaveLength(3);
  });

  it("la ricerca filtra per codice o nome", async () => {
    render(<Pagina />);
    await apri();
    await act(async () => void fireEvent.change(screen.getByLabelText("Cerca corso"), { target: { value: "ant1" } }));
    expect(nomiVisibili()).toHaveLength(1);
    expect(nomiVisibili()[0]).toMatch(/Antincendio livello 1/);
  });

  it("l'ultimo corso scelto viene riproposto per primo", async () => {
    const { unmount } = render(<Pagina />);
    await apri();
    await act(async () => void fireEvent.click(await screen.findByRole("option", { name: /Primo soccorso/ })));
    unmount();
    render(<Pagina />);
    await apri();
    expect(nomiVisibili()[0]).toMatch(/Primo soccorso/);
    expect(screen.getByRole("group", { name: "Ultimo scelto" })).toBeTruthy();
  });
});

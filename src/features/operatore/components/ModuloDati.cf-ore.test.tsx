/*
 * File:      ModuloDati.cf-ore.test.tsx
 * Percorso:  src/features/operatore/components/ModuloDati.cf-ore.test.tsx
 * Data creazione: 22/11/2026
 * Test del modulo dati: riconoscimento del lavoratore dal Codice Fiscale e ore proposte dal corso.
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
  // Il menu del corso è un Radix Select: in jsdom servono questi tre metodi, assenti nel DOM simulato.
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
    await act(async () => void fireEvent.keyDown(trigger, { key: "ArrowDown" }));
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

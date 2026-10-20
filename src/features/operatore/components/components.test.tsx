/*
 * Test dei componenti della Postazione Operatore: collegamento di pulsanti e callback.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { ModaleEmail } from "./ModaleEmail";
import { ModuloDati } from "./ModuloDati";
import { RigaCoda } from "./RigaCoda";
import { VUOTA, type CodaRiga, type StatoModaleEmail } from "../types";

const riga: CodaRiga = {
  ...VUOTA,
  id: "1",
  cognome: "ROSSI",
  nome: "MARIO",
  codice_fiscale: "RSSMRA80A01H501U",
  tipo_corso_nome: "Antincendio",
  data_corso: "2026-03-15",
  ore: 8,
  percorso_file: null,
  mime_file: null,
  nome_file: null,
  archiviato: false,
  inviato: false,
  argomenti_mancanti: [],
};

describe("RigaCoda", () => {
  function disegna(parziale: Partial<CodaRiga> = {}) {
    const h = {
      onToggle: vi.fn(),
      onCopiaAnagrafica: vi.fn(),
      onModifica: vi.fn(),
      onArchivia: vi.fn(),
      onDuplica: vi.fn(),
      onSalvaLocale: vi.fn(),
      onEmail: vi.fn(),
      onCancella: vi.fn(),
    };
    render(
      <table>
        <tbody>
          <RigaCoda r={{ ...riga, ...parziale }} selezionata={false} archiviando={false} inviandoEmail={false} {...h} />
        </tbody>
      </table>,
    );
    return h;
  }
  it("mostra i dati del lavoratore", () => {
    disegna({ email: "mario@x.it" });
    expect(screen.getByText("ROSSI MARIO")).toBeTruthy();
    expect(screen.getByText("mario@x.it")).toBeTruthy();
    expect(screen.getByText("15/03/2026")).toBeTruthy();
    expect(screen.getByText("Bozza")).toBeTruthy();
  });
  it("ogni pulsante richiama la sua azione", () => {
    const h = disegna();
    fireEvent.click(screen.getByLabelText("Copia dati anagrafici nel modulo per nuovo documento"));
    fireEvent.click(screen.getByLabelText("Modifica"));
    fireEvent.click(screen.getByLabelText("Aggiungi al database"));
    fireEvent.click(screen.getByLabelText("Duplica (altro corso nello stesso file)"));
    fireEvent.click(screen.getByLabelText("Salva sul PC con nome"));
    fireEvent.click(screen.getByLabelText("Invia email con Resend (apre anteprima)"));
    fireEvent.click(screen.getByLabelText("Elimina dalla coda"));
    for (const k of ["onCopiaAnagrafica", "onModifica", "onArchivia", "onDuplica", "onSalvaLocale", "onEmail", "onCancella"] as const) {
      expect(h[k], k).toHaveBeenCalledTimes(1);
    }
  });
  it("riga già archiviata: pulsante archivia disabilitato e stato visibile", () => {
    disegna({ archiviato: true, inviato: true });
    expect((screen.getByLabelText("Già archiviato nel database") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Archiviato nel DB ✓")).toBeTruthy();
    expect(screen.getByText("Email inviata ✓")).toBeTruthy();
  });
});

describe("ModaleEmail", () => {
  function Prova({ iniziale, onConferma }: { iniziale: StatoModaleEmail; onConferma: () => void }) {
    const [stato, setStato] = useState(iniziale);
    return <ModaleEmail stato={stato} setStato={setStato} inviando={false} onConferma={onConferma} />;
  }
  const base: StatoModaleEmail = { aperta: true, righe: [], destinatari: "", oggetto: "Oggetto", testoCorpo: "Corpo" };

  it("senza destinatario: avviso e invio disabilitato", () => {
    render(<Prova iniziale={base} onConferma={vi.fn()} />);
    expect(screen.getByText(/Email mancante/)).toBeTruthy();
    expect((screen.getByText("Invia adesso con Resend").closest("button") as HTMLButtonElement).disabled).toBe(true);
  });
  it("scrivendo il destinatario si abilita l'invio e il clic richiama la conferma", () => {
    const conferma = vi.fn();
    render(<Prova iniziale={base} onConferma={conferma} />);
    fireEvent.change(screen.getByLabelText(/Destinatari/), { target: { value: "a@x.it" } });
    const invia = screen.getByText("Invia adesso con Resend").closest("button") as HTMLButtonElement;
    expect(invia.disabled).toBe(false);
    fireEvent.click(invia);
    expect(conferma).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Email mancante/)).toBeNull();
  });
  it("oggetto e corpo sono modificabili", () => {
    render(<Prova iniziale={{ ...base, destinatari: "a@x.it" }} onConferma={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Oggetto email"), { target: { value: "Nuovo" } });
    expect((screen.getByLabelText("Oggetto email") as HTMLInputElement).value).toBe("Nuovo");
    expect((screen.getByLabelText("Testo del messaggio") as HTMLTextAreaElement).value).toBe("Corpo");
  });
  it("chiusa: non mostra nulla", () => {
    render(<Prova iniziale={{ ...base, aperta: false }} onConferma={vi.fn()} />);
    expect(screen.queryByText("Verifica e invia email esito attestati")).toBeNull();
  });
});

describe("ModuloDati: mirino OCR e pulsanti", () => {
  function disegna(haAnteprima: boolean, campoOcr: "cognome" | null = null) {
    const h = { setCampoOcr: vi.fn(), onSvuota: vi.fn(), onSalva: vi.fn(), set: vi.fn(), setPagine: vi.fn() };
    render(
      <ModuloDati
        form={{ ...VUOTA, cognome: "ROSSI" }}
        tipi={[]}
        campoOcr={campoOcr}
        haAnteprima={haAnteprima}
        totPagine={0}
        pagine=""
        idInModifica={null}
        salvando={false}
        archiviando={false}
        {...h}
      />,
    );
    return h;
  }
  it("mirino disabilitato senza anteprima", () => {
    disegna(false);
    expect((screen.getByTitle("Cattura Cognome dal documento") as HTMLButtonElement).disabled).toBe(true);
  });
  it("clic sul mirino attiva il campo; secondo clic lo disattiva", () => {
    const h1 = disegna(true);
    fireEvent.click(screen.getByTitle("Cattura Cognome dal documento"));
    expect(h1.setCampoOcr).toHaveBeenCalledWith("cognome");
  });
  it("campo già attivo: il clic lo disattiva", () => {
    const h = disegna(true, "cognome");
    fireEvent.click(screen.getByTitle("Cattura Cognome dal documento"));
    expect(h.setCampoOcr).toHaveBeenCalledWith(null);
  });
  it("digitare il cognome lo rende maiuscolo; i pulsanti richiamano le azioni", () => {
    const h = disegna(false);
    fireEvent.change(document.getElementById("cog")!, { target: { value: "verdi" } });
    expect(h.set).toHaveBeenCalledWith("cognome", "VERDI");
    fireEvent.click(screen.getByText("Svuota"));
    fireEvent.click(screen.getByText("Archivia subito nel DB"));
    fireEvent.click(screen.getByText("Aggiungi alla coda"));
    expect(h.onSvuota).toHaveBeenCalledTimes(1);
    expect(h.onSalva).toHaveBeenNthCalledWith(1, true);
    expect(h.onSalva).toHaveBeenNthCalledWith(2, false);
  });
});

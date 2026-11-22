/*
 * File:          ZonaLavoratore.test.tsx
 * Percorso:      src/features/dipendenti/aggancia-allegato/ZonaLavoratore.test.tsx
 * Data creazione: 2026-11-22
 * Maschera «Aggancia attestato come allegato», zona lavoratore: il corso si sceglie per identificativo (base e aggiornamento hanno lo stesso
 * nome), si propone dal nome del file e dai ruoli del lavoratore, e non scavalca mai una scelta fatta a mano.
 * I menu a tendina Radix sono sostituiti da elenchi semplici: in jsdom non si aprono come nel browser.
 * Revisioni:
 *   - Rev 1 (2026-11-22): Prima stesura.
 */
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { dati } = vi.hoisted(() => {
  const regola = (ordine: number, ruolo_codice: string, parametro: string, valore: string, corso_base: string | null, corso_aggiornamento: string | null) => ({
    id: `g${ordine}`, ordine, ruolo_codice, parametro, valore, corso_base, corso_aggiornamento, applica: false,
  });
  return {
    dati: {
      singoli: { ditta: { id: true, rischio_ditta: "medio" } } as Record<string, unknown>,
      tabelle: {
        tipi_corso: [
          { id: "c-gen", ordine: 1, codice: "SIC-GEN-04", nome_corso: "Formazione generale", durata_validita_anni: null },
          { id: "c-spe", ordine: 2, codice: "SIC-SPE-08", nome_corso: "Specifica rischio medio", durata_validita_anni: 5 },
          { id: "c-cp", ordine: 3, codice: "LAV-CAR-CP-II-8311", nome_corso: "Carriponte (CP) CABINA", durata_validita_anni: 5 },
          { id: "c-cp-agg", ordine: 4, codice: "LAV-CAR-CP-II-8311-AGG", nome_corso: "Carriponte (CP) CABINA", durata_validita_anni: 2 },
        ],
        ruoli_sicurezza: [
          { id: "r-lav", ordine: 1, nome: "Lavoratore", codice: "LAVORATORE", attivo: true, obbligatorio_tutti: true },
          { id: "r-cp", ordine: 2, nome: "OPERATORE CARRIPONTE CP", codice: "OPER_CAR_CP_II_8311", attivo: true, obbligatorio_tutti: false },
        ],
        dipendenti_ruoli: [{ id: "as1", dipendente_id: "d1", ruolo_id: "r-cp" }],
        regole_ruolo_corso: [
          regola(1, "LAVORATORE", "nessuno", "—", "SIC-GEN-04", null),
          regola(2, "LAVORATORE", "rischio ATECO", "medio", "SIC-SPE-08", null),
          regola(3, "OPER_CAR_CP_II_8311", "nessuno", "—", "LAV-CAR-CP-II-8311", "LAV-CAR-CP-II-8311-AGG"),
        ],
        attestati_caricati: [
          { id: "a1", dipendente_id: "d1", stato_validazione: "Approvato", data_corso: "2020-01-10", data_scadenza_calcolata: null, tipi_corso: { codice: "SIC-GEN-04", nome_corso: "Formazione generale" } },
        ],
      } as Record<string, unknown[]>,
    },
  };
});

vi.mock("@/integrations/supabase/client", async () => {
  const { creaClientFinto } = await import("@/test/registratore-supabase");
  return { supabase: creaClientFinto(dati) };
});
vi.mock("@/components/ui/select", async () => {
  const React = await import("react");
  const SelectTrigger = () => null;
  const SelectValue = () => null;
  const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const SelectItem = ({ value }: { value: string }) => <option value={value}>{value}</option>;
  const Select = ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children?: React.ReactNode }) => (
    <select aria-label="Corso" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {React.Children.map(children, (c) => (React.isValidElement(c) && c.type === SelectContent ? c : null))}
    </select>
  );
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

import { ZonaLavoratore, type DatiAllegato } from "./ZonaLavoratore";

const lavoratore = { id: "d1", cognome: "Rossi", nome: "Mario", codice_fiscale: "RSSMRA80A01H501Z", reparto: "Officina" } as never;
const VUOTI: DatiAllegato = { tipo: "", tipoCorsoId: "", altro: "", dataCorso: "", scadenza: "" };
const ultimi: { dati: DatiAllegato } = { dati: VUOTI };

function Prova({ nomeFile }: { nomeFile: string | null }) {
  const [d, setD] = useState<DatiAllegato>(VUOTI);
  ultimi.dati = d;
  return <ZonaLavoratore dipendente={lavoratore} dati={d} onCambia={setD} nomeFile={nomeFile} />;
}

const attendi = () => act(async () => { await new Promise((r) => setTimeout(r, 80)); });
async function monta(nomeFile: string | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const vista = render(<QueryClientProvider client={qc}><Prova nomeFile={nomeFile} /></QueryClientProvider>);
  await attendi();
  await attendi();
  return {
    vista,
    cambiaFile: async (f: string | null) => {
      vista.rerender(<QueryClientProvider client={qc}><Prova nomeFile={f} /></QueryClientProvider>);
      await attendi();
    },
  };
}
const scegli = async (valore: string) => { fireEvent.change(screen.getByLabelText("Corso"), { target: { value: valore } }); await attendi(); };

afterEach(cleanup);

describe("scelta del corso per identificativo", () => {
  it("base e aggiornamento con lo stesso nome restano distinti", async () => {
    await monta();
    await scegli("c-cp-agg");
    expect(ultimi.dati.tipoCorsoId).toBe("c-cp-agg");
    expect(ultimi.dati.tipo).toBe("Carriponte (CP) CABINA [LAV-CAR-CP-II-8311-AGG]");
    await scegli("c-cp");
    expect(ultimi.dati.tipo).toBe("Carriponte (CP) CABINA [LAV-CAR-CP-II-8311]");
  });

  it("un corso dal nome unico resta col suo nome, senza codice nel testo", async () => {
    await monta();
    await scegli("c-gen");
    expect(ultimi.dati.tipo).toBe("Formazione generale");
  });

  it("la scadenza si calcola sugli anni del corso scelto, non del primo con quel nome", async () => {
    await monta();
    await scegli("c-cp-agg");
    fireEvent.change(document.querySelector('input[type="date"]')!, { target: { value: "2026-03-10" } });
    await attendi();
    expect(ultimi.dati.scadenza).toBe("2028-03-10");
    await scegli("c-cp");
    expect(ultimi.dati.scadenza).toBe("2031-03-10");
  });

  it("«Altro» chiede la descrizione a mano", async () => {
    await monta();
    await scegli("Altro");
    expect(ultimi.dati).toMatchObject({ tipo: "Altro", tipoCorsoId: "Altro" });
    expect(screen.getByText("Descrizione attestato personalizzato")).toBeTruthy();
  });
});

describe("corsi proposti dai ruoli del lavoratore", () => {
  it("propone la specifica del rischio della ditta e il corso dell'attrezzatura del suo ruolo; non il corso base già svolto", async () => {
    await monta();
    const area = screen.getByLabelText("Corsi proposti per questo lavoratore");
    expect(area.textContent).toContain("SIC-SPE-08");
    expect(area.textContent).toContain("LAV-CAR-CP-II-8311");
    expect(area.textContent).toContain("OPERATORE CARRIPONTE CP: da svolgere");
    expect(area.textContent).not.toContain("SIC-GEN-04");
  });

  it("un clic sul corso proposto lo sceglie", async () => {
    await monta();
    const bottone = [...screen.getByLabelText("Corsi proposti per questo lavoratore").querySelectorAll("button")].find((b) => b.textContent!.includes("SIC-SPE-08"))!;
    fireEvent.click(bottone);
    await attendi();
    expect(ultimi.dati).toMatchObject({ tipoCorsoId: "c-spe", tipo: "Specifica rischio medio" });
  });
});

describe("corso proposto dal nome del file", () => {
  it("il codice nel nome del file sceglie il corso e lo dice", async () => {
    await monta("2026-03_ROSSI_MARIO_RSSMRA80A01H501Z_SIC_SPE_08.pdf");
    expect(ultimi.dati.tipoCorsoId).toBe("c-spe");
    expect(screen.getByText(/Proposto dal codice nel nome del file \(SIC-SPE-08\)/)).toBeTruthy();
  });

  it("scegliendo un altro file cambia la proposta, finché non si sceglie a mano", async () => {
    const { cambiaFile } = await monta("2026-03_ROSSI_SIC_SPE_08.pdf");
    await cambiaFile("2026-04_ROSSI_LAV_CAR_CP_II_8311_AGG.pdf");
    expect(ultimi.dati.tipoCorsoId).toBe("c-cp-agg");
  });

  it("non scavalca una scelta fatta a mano", async () => {
    const { cambiaFile } = await monta();
    await scegli("c-gen");
    await cambiaFile("2026-03_ROSSI_SIC_SPE_08.pdf");
    expect(ultimi.dati.tipoCorsoId).toBe("c-gen");
  });

  it("un file senza corso riconoscibile non propone nulla", async () => {
    await monta("scansione_0001.pdf");
    expect(ultimi.dati.tipoCorsoId).toBe("");
    expect(screen.queryByText(/Proposto dal/)).toBeNull();
  });

  it("se la data del corso è già scritta, la scadenza si calcola con il corso proposto", async () => {
    const { cambiaFile } = await monta();
    fireEvent.change(document.querySelector('input[type="date"]')!, { target: { value: "2026-03-10" } });
    await attendi();
    await cambiaFile("2026-03_ROSSI_SIC_SPE_08.pdf");
    expect(ultimi.dati.scadenza).toBe("2031-03-10");
  });
});

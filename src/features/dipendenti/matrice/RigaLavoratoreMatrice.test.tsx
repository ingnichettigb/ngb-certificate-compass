/*
 * File:          RigaLavoratoreMatrice.test.tsx
 * Percorso:      src/features/dipendenti/matrice/RigaLavoratoreMatrice.test.tsx
 * Data creazione: 2026-11-22
 * Casella della Matrice: svolto, da svolgere, «in attesa» del prerequisito (attrezzature di chi non ha completato la formazione Lavoratore), esente.
 * Revisioni:
 *   - Rev 1 (2026-11-22): Prima stesura.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import type { Dipendente, RuoloSicurezza, TipoCorso } from "@/lib/api";
import { RigaLavoratoreMatrice } from "./RigaLavoratoreMatrice";

const dip = { id: "d1", cognome: "Rossi", nome: "Mario", codice_fiscale: "RSSMRA80A01H501Z", reparto: "Officina" } as unknown as Dipendente;
const corso = (codice: string) => ({ id: `c-${codice}`, codice, nome_corso: `Corso ${codice}`, macro_categoria: "Sicurezza Lavoratori" }) as unknown as TipoCorso;
const ruoli = [{ id: "r1", nome: "OPERATORE CARRIPONTE", codice: "OPER-CAR-CP-II-8311", attivo: true, obbligatorio_tutti: false, richiede: "LAVORATORE" }] as unknown as RuoloSicurezza[];
const corsi = [corso("A-FATTO"), corso("B-DA-FARE"), corso("C-ATTESA"), corso("D-ESENTE"), corso("E-NON-DOVUTO")];

function monta(extra: { motivoInAttesa?: (d: string, c: TipoCorso) => string | null } = {}) {
  render(
    <table>
      <tbody>
        <RigaLavoratoreMatrice
          dip={dip}
          indice={0}
          attiva={false}
          corsiVisibili={corsi}
          ruoli={ruoli}
          mappaAssegnazioni={new Set()}
          haObbligoCorso={(_, c) => c.codice !== "E-NON-DOVUTO"}
          motivoEsenzione={(_, c) => (c.codice === "D-ESENTE" ? "RSPP valido" : null)}
          haAttestatoCorso={(_, c) => c.codice === "A-FATTO"}
          onSeleziona={() => {}}
          onToggleObbligo={() => {}}
          {...extra}
        />
      </tbody>
    </table>,
  );
  return [...document.querySelectorAll("tbody tr td button")] as HTMLButtonElement[];
}

describe("casella della Matrice", () => {
  it("senza prerequisiti: svolto spunta, da svolgere «!», esente «E», non dovuto vuota", () => {
    const b = monta();
    expect(b.map((x) => x.textContent)).toEqual(["", "!", "!", "E", ""]);
    expect(b[0]!.querySelector("svg")).not.toBeNull();
  });

  it("dovuto, non svolto e «in attesa»: «…» grigio con il motivo nel suggerimento", () => {
    const b = monta({ motivoInAttesa: (_, c) => (c.codice === "C-ATTESA" ? "manca il corso base (SIC-GEN-04)" : null) });
    expect(b.map((x) => x.textContent)).toEqual(["", "!", "…", "E", ""]);
    expect(b[2]!.className).toContain("slate");
    expect(b[1]!.className).toContain("amber");
    expect(b[2]!.closest("td")!.getAttribute("title")).toContain("In attesa della formazione Lavoratore: manca il corso base (SIC-GEN-04)");
  });

  it("già svolto ha la precedenza sull'attesa; esente pure", () => {
    const b = monta({ motivoInAttesa: () => "manca il corso base" });
    expect(b[0]!.querySelector("svg")).not.toBeNull();
    expect(b[3]!.textContent).toBe("E");
    expect(b[4]!.textContent).toBe("");
  });
});

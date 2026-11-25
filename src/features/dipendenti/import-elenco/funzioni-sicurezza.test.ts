/*
 * File:          funzioni-sicurezza.test.ts
 * Percorso:      src/features/dipendenti/import-elenco/funzioni-sicurezza.test.ts
 * Data creazione: 2026-11-21
 * Verifica che le funzioni dell'import (X nel file) trovino il ruolo per CODICE: un ruolo rinominato non ne fa creare un
 * doppione; senza codice resta il vecchio riconoscimento per nome.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura.
 */
import { describe, expect, it } from "vitest";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { FUNZIONI, trovaRuoloFunzione } from "./funzioni-sicurezza";
import { trovaRuoliNuoviIngressi } from "./ruoli-nuovi-ingressi";

let n = 0;
const r = (codice: string | null, nome: string, extra: Partial<RuoloSicurezza> = {}): RuoloSicurezza => ({
  id: `r-${nome}`, nome, codice, descrizione: null, macro_categoria: null, obbligatorio_tutti: false, attivo: true, ordine: ++n, ...extra,
});

describe("trovaRuoloFunzione: per codice", () => {
  it("ogni funzione ha un codice ruolo diverso", () => {
    const codici = FUNZIONI.map((f) => f.codiceRuolo);
    expect(new Set(codici).size).toBe(FUNZIONI.length);
  });

  it("trova il ruolo anche se il nome è stato cambiato", () => {
    const ruoli = [r("ADD-ANTINCENDIO", "Squadra emergenza fuoco"), r("INC-PRIVACY", "Privacy")];
    expect(trovaRuoloFunzione(ruoli, "antincendio")?.codice).toBe("ADD-ANTINCENDIO");
    expect(trovaRuoloFunzione(ruoli, "privacy")?.codice).toBe("INC-PRIVACY");
  });

  it("il codice vince sul nome quando due ruoli potrebbero andare bene", () => {
    const ruoli = [r(null, "Addetto Antincendio vecchio"), r("ADD-ANTINCENDIO", "Squadra fuoco")];
    expect(trovaRuoloFunzione(ruoli, "antincendio")?.codice).toBe("ADD-ANTINCENDIO");
  });

  it("senza codici nel catalogo resta il riconoscimento per nome", () => {
    expect(trovaRuoloFunzione([r(null, "Addetto Antincendio")], "antincendio")?.nome).toBe("Addetto Antincendio");
  });

  it("le attrezzature non vengono scambiate per una funzione", () => {
    const ruoli = [r("OPER-PLE-II-831", "OPERATORE PLE", { macro_categoria: "Attrezzature" })];
    for (const f of FUNZIONI) expect(trovaRuoloFunzione(ruoli, f.chiave)).toBeUndefined();
  });
});

describe("trovaRuoliNuoviIngressi: Lavoratore per codice", () => {
  it("trova il Lavoratore per codice anche se rinominato", () => {
    const ruoli = [r("LAVORATORE", "Formazione di base", { obbligatorio_tutti: false })];
    expect(trovaRuoliNuoviIngressi(ruoli).ruoloBase?.codice).toBe("LAVORATORE");
  });

  it("dopo la bonifica non c'è più un ruolo «specifica medio»: non assegna nulla", () => {
    const ruoli = [r("LAVORATORE", "Lavoratore", { obbligatorio_tutti: true }), r("PREPOSTO", "Preposto")];
    expect(trovaRuoliNuoviIngressi(ruoli).ruoloSpecificaMedio).toBeUndefined();
  });
});

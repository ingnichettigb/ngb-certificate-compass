/*
 * File:      ruoli-nuovi-ingressi.ts
 * Percorso:  src/features/dipendenti/import-elenco/ruoli-nuovi-ingressi.ts
 * Creato:    05/11/2026
 * Individua nel catalogo i due ruoli assegnati d'ufficio a ogni nuovo ingresso:
 * Formazione Base (Lavoratore) e Formazione Specifica rischio medio (8 ore).
 * Usato sia dall'importazione «solo nuovi» sia da quella di aggiornamento.
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura: logica estratta da DialogImportaElenco.tsx (nessun cambio di regola).
 */
import type { RuoloSicurezza } from "@/lib/api/ruoli";

export function trovaRuoliNuoviIngressi(ruoli: RuoloSicurezza[]) {
  const ruoloBase = ruoli.find(
    (r) => r.attivo && (r.obbligatorio_tutti || r.nome.trim().toLowerCase() === "lavoratore"),
  );
  const ruoloSpecificaMedio = ruoli.find(
    (r) =>
      r.attivo &&
      r.nome.toLowerCase().includes("specifica") &&
      r.nome.toLowerCase().includes("medio") &&
      !r.nome.toLowerCase().includes("integrazione"),
  );
  return { ruoloBase, ruoloSpecificaMedio };
}

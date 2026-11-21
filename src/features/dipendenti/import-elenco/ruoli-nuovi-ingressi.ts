/*
 * File:      ruoli-nuovi-ingressi.ts
 * Percorso:  src/features/dipendenti/import-elenco/ruoli-nuovi-ingressi.ts
 * Creato:    05/11/2026
 * Individua nel catalogo i due ruoli assegnati d'ufficio a ogni nuovo ingresso:
 * Formazione Base (Lavoratore) e Formazione Specifica rischio medio (8 ore).
 * Usato sia dall'importazione «solo nuovi» sia da quella di aggiornamento.
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura: logica estratta da DialogImportaElenco.tsx (nessun cambio di regola).
 *   rev 2 — 21/11/2026 — Il ruolo Lavoratore si trova per codice (LAVORATORE); nome e «obbligatorio per tutti» restano come ripiego.
 *     La formazione specifica non è più un ruolo a sé: la sceglie il rischio della ditta (Tabella 02); il ruolo «specifica medio»
 *     resta cercato solo per i cataloghi vecchi e oggi non esiste, quindi non assegna nulla.
 */
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { CODICE_RUOLO, trovaRuoloPerCodice } from "@/lib/api/codici-ruoli";

export function trovaRuoliNuoviIngressi(ruoli: RuoloSicurezza[]) {
  const ruoloBase =
    trovaRuoloPerCodice(ruoli, CODICE_RUOLO.LAVORATORE) ??
    ruoli.find((r) => r.attivo && (r.obbligatorio_tutti || r.nome.trim().toLowerCase() === "lavoratore"));
  const ruoloSpecificaMedio = ruoli.find(
    (r) =>
      r.attivo &&
      r.nome.toLowerCase().includes("specifica") &&
      r.nome.toLowerCase().includes("medio") &&
      !r.nome.toLowerCase().includes("integrazione"),
  );
  return { ruoloBase, ruoloSpecificaMedio };
}

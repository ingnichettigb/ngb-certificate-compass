/*
 * File:      MassivoPage.tsx
 * Percorso:  src/features/massivo/MassivoPage.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Pagina «Inserimento massivo»: scheda lavoratore con i comandi di carico in blocco
 *            nella barra fissa in alto (stessa logica di prima, prima dentro il Cruscotto HR).
 */
import { DipendentiPage } from "@/features/dipendenti/DipendentiPage";
import { IntestazioneMassivo } from "./IntestazioneMassivo";

export function MassivoPage() {
  return (
    <div className="min-h-screen bg-background">
      <IntestazioneMassivo />
      <DipendentiPage senzaIntestazione bottoniInBarra />
    </div>
  );
}

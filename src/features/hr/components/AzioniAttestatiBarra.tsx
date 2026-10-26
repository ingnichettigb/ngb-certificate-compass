/*
 * File:      AzioniAttestatiBarra.tsx
 * Percorso:  src/features/hr/components/AzioniAttestatiBarra.tsx
 * Data creaz: 26/10/2026
 * Revisioni:
 *   rev 1 — 26/10/2026 20:10 — Creazione: bottoni «Aggancia attestato come allegato» e «Aggiungi
 *            attestato» nella barra fissa del Cruscotto HR, nello stile verde standard.
 *
 * I due comandi agiscono sul lavoratore attualmente aperto nella scheda
 * (pubblicato da DocumentiAttestati tramite barra-azioni.ts).
 */
import { Paperclip, Plus } from "lucide-react";
import { eseguiComando, usaDipendenteBarra } from "@/features/documenti/barra-azioni";

// Stile standard: verde tenue a riposo, verde scuro al passaggio, bordo verde scuro.
const BASE =
  "inline-flex items-center gap-2 rounded-lg border-2 border-primary px-4 py-2 text-sm font-semibold transition-all";
const ATTIVO = "bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground";
const DISATTIVO = "cursor-not-allowed bg-primary/10 text-primary opacity-60";

export function AzioniAttestatiBarra() {
  const dipendente = usaDipendenteBarra();
  const attivo = dipendente !== null;
  const stile = `${BASE} ${attivo ? ATTIVO : DISATTIVO}`;
  const suggerimento = attivo ? undefined : "Apri prima un lavoratore nella scheda";

  return (
    <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-end gap-2 px-5 pb-3">
      <button
        type="button"
        disabled={!attivo}
        title={suggerimento}
        onClick={() => eseguiComando("aggancio")}
        className={stile}
      >
        <Paperclip className="size-4" /> Aggancia attestato come allegato
      </button>
      <button
        type="button"
        disabled={!attivo}
        title={suggerimento}
        onClick={() => eseguiComando("caricamento")}
        className={stile}
      >
        <Plus className="size-4" /> Aggiungi attestato
      </button>
    </div>
  );
}

/*
 * File:      BarraGruppiPredefinite.tsx
 * Percorso:  src/features/stampe/components/BarraGruppiPredefinite.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 2 — 09/11/2026 20:00 — Etichette facoltative («Squadra» / «Tutte le squadre») per l'Organigramma.
 *   rev 1 — 08/11/2026 14:40 — Barra orizzontale a pillole: «Tutti i gruppi» o selezione rapida di un gruppo (Preposti, Antincendio, Primo soccorso, Defibrillatore, Evacuazione, Privacy, Sicurezza lavoratori), con stile verde brand.
 */
import { Layers } from "lucide-react";
import type { InfoGruppo } from "../stampa-gruppi";

type Props = {
  gruppi: InfoGruppo[];
  totaleLavoratori: number;
  gruppoScelto: string | null;
  onSeleziona: (gruppo: string | null) => void;
  /** Testo davanti alle pillole (predefinito «Gruppo») e della pillola «Tutti» (predefinito «Tutti i gruppi»). */
  etichetta?: string;
  etichettaTutti?: string;
};

const STILE_PILLOLA_ATTIVA =
  "bg-emerald-700 text-white border-emerald-800 shadow-sm ring-1 ring-emerald-500 font-semibold";
const STILE_PILLOLA_RIPOSO =
  "border-emerald-600/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-700 hover:shadow-sm";

export function BarraGruppiPredefinite({
  gruppi,
  totaleLavoratori,
  gruppoScelto,
  onSeleziona,
  etichetta = "Gruppo",
  etichettaTutti = "Tutti i gruppi",
}: Props) {
  if (!gruppi.length) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 print:hidden">
      <span className="flex items-center gap-1 text-xs font-semibold text-foreground/80 mr-1">
        <Layers className="size-3.5 text-emerald-600" /> {etichetta}:
      </span>

      {/* Pillola Tutti */}
      <button
        type="button"
        onClick={() => onSeleziona(null)}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
          gruppoScelto === null ? STILE_PILLOLA_ATTIVA : STILE_PILLOLA_RIPOSO
        }`}
      >
        <span>{etichettaTutti}</span>
        <span className="opacity-80">({totaleLavoratori})</span>
      </button>

      {/* Pillole per singolo gruppo */}
      {gruppi.map((g) => {
        const selezionata = gruppoScelto === g.nome;
        return (
          <button
            key={g.nome}
            type="button"
            onClick={() => onSeleziona(selezionata ? null : g.nome)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              selezionata ? STILE_PILLOLA_ATTIVA : STILE_PILLOLA_RIPOSO
            }`}
          >
            <span>{g.nome}</span>
            <span className="opacity-80">({g.conteggio})</span>
          </button>
        );
      })}
    </div>
  );
}

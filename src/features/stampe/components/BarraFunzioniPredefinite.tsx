/*
 * File:      BarraFunzioniPredefinite.tsx
 * Percorso:  src/features/stampe/components/BarraFunzioniPredefinite.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 14:30 — Barra orizzontale a pillole: «Tutte le funzioni» o selezione rapida singola funzione, con stile verde brand.
 */
import { Shield } from "lucide-react";
type InfoFunzione = { nome: string; conteggio: number };

type Props = {
  funzioni: InfoFunzione[];
  totaleLavoratori: number;
  funzioneScelta: string | null;
  onSeleziona: (funzione: string | null) => void;
};

const STILE_PILLOLA_ATTIVA =
  "bg-emerald-700 text-white border-emerald-800 shadow-sm ring-1 ring-emerald-500 font-semibold";
const STILE_PILLOLA_RIPOSO =
  "border-emerald-600/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-700 hover:shadow-sm";

export function BarraFunzioniPredefinite({
  funzioni,
  totaleLavoratori,
  funzioneScelta,
  onSeleziona,
}: Props) {
  if (!funzioni.length) return null;

  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-1.5 print:hidden">
      <span className="flex items-center gap-1 text-xs font-semibold text-foreground/80 mr-1">
        <Shield className="size-3.5 text-emerald-600" /> Funzione:
      </span>

      {/* Pillola Tutte */}
      <button
        type="button"
        onClick={() => onSeleziona(null)}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
          funzioneScelta === null ? STILE_PILLOLA_ATTIVA : STILE_PILLOLA_RIPOSO
        }`}
      >
        <span>Tutte le funzioni</span>
        <span className="opacity-80">({totaleLavoratori})</span>
      </button>

      {/* Pillole per singola funzione */}
      {funzioni.map((f) => {
        const selezionata = funzioneScelta === f.nome;
        return (
          <button
            key={f.nome}
            type="button"
            onClick={() => onSeleziona(selezionata ? null : f.nome)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              selezionata ? STILE_PILLOLA_ATTIVA : STILE_PILLOLA_RIPOSO
            }`}
          >
            <span>{f.nome}</span>
            <span className="opacity-80">({f.conteggio})</span>
          </button>
        );
      })}
    </div>
  );
}

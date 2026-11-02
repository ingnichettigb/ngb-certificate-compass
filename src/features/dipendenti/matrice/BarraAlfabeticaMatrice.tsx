/*
 * File:         BarraAlfabeticaMatrice.tsx
 * Percorso:     src/features/dipendenti/matrice/BarraAlfabeticaMatrice.tsx
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 21:55): Prima stesura componente modulare per indice alfabetico A-Z:
 *     barra orizzontale e barra laterale verticale fissa, conteggio lavoratori per iniziale e stile brand.
 *   - Rev 2 (2026-11-01 22:00): Corretto errore di compilazione: rinominata la variabile "let"
 *     (parola riservata) in "lettera" in entrambe le barre.
 *   - Rev 3 (2026-11-02 10:45): Protezione runtime: dipendenti reso opzionale con fallback su letterePresenti
 *     (Set), prevenendo crash TypeError se passato uno o l'altro.
 */
import { useMemo } from "react";
import type { Dipendente } from "@/lib/api";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export interface BarraAlfabeticaProps {
  dipendenti?: Dipendente[];
  letterePresenti?: Set<string>;
  letteraAttiva?: string | null;
  onSelezionaLettera: (lettera: string) => void;
}

/**
 * Calcola la mappa delle iniziali presenti tra i lavoratori visualizzati.
 * Supporta sia la lista dipendenti (con conteggio esatto) che il Set letterePresenti.
 */
function useConteggiIniziali(
  dipendenti: Dipendente[] = [],
  letterePresenti?: Set<string>,
) {
  return useMemo(() => {
    const conteggi: Record<string, number> = {};
    if (Array.isArray(dipendenti) && dipendenti.length > 0) {
      for (const d of dipendenti) {
        const iniziale = (d.cognome || "").trim().charAt(0).toUpperCase();
        if (iniziale && /[A-Z]/.test(iniziale)) {
          conteggi[iniziale] = (conteggi[iniziale] || 0) + 1;
        }
      }
    } else if (letterePresenti && typeof letterePresenti.has === "function") {
      for (const l of ALFABETO) {
        if (letterePresenti.has(l)) {
          conteggi[l] = 1;
        }
      }
    }
    return conteggi;
  }, [dipendenti, letterePresenti]);
}

/**
 * Barra orizzontale con tutte le lettere da A a Z, posizionata sopra la tabella
 */
export function BarraAlfabeticaOrizzontale({
  dipendenti = [],
  letterePresenti,
  letteraAttiva,
  onSelezionaLettera,
}: BarraAlfabeticaProps) {
  const conteggi = useConteggiIniziali(dipendenti, letterePresenti);

  return (
    <div className="flex items-center gap-1 overflow-x-auto px-6 py-1.5 bg-surface/90 border-b border-border/80 text-xs shrink-0 select-none shadow-xs">
      <span className="text-[11px] font-semibold text-muted-foreground mr-1.5 uppercase tracking-wider shrink-0">
        Indice:
      </span>

      <div className="flex items-center gap-1 flex-wrap">
        {ALFABETO.map((lettera) => {
          const n = conteggi[lettera] || 0;
          const presente = n > 0;
          const isSelezionata = letteraAttiva === lettera;

          return (
            <button
              key={lettera}
              type="button"
              disabled={!presente}
              onClick={() => onSelezionaLettera(lettera)}
              title={
                presente
                  ? `${lettera}: ${n > 1 ? `${n} lavoratori` : `${n} lavoratore`}`
                  : `Nessun lavoratore con la ${lettera}`
              }
              className={`min-w-6 h-6 px-1 rounded text-[11px] font-bold transition-all border flex items-center justify-center ${
                !presente
                  ? "opacity-30 border-transparent text-muted-foreground/60 cursor-not-allowed"
                  : isSelezionata
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/40"
                    : "border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-700 hover:shadow-sm"
              }`}
            >
              {lettera}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Barra laterale verticale sempre in vista, fluttuante sul lato destro della schermata
 */
export function BarraAlfabeticaVerticale({
  dipendenti = [],
  letterePresenti,
  letteraAttiva,
  onSelezionaLettera,
}: BarraAlfabeticaProps) {
  const conteggi = useConteggiIniziali(dipendenti, letterePresenti);

  return (
    <aside
      aria-label="Indice alfabetico verticale rapido"
      className="fixed right-3 top-44 z-[130] flex flex-col items-center gap-0.5 rounded-lg border border-border/80 bg-surface/90 backdrop-blur p-1 shadow-md select-none max-h-[calc(100vh-14rem)] overflow-y-auto"
    >
      <span className="text-[9px] font-mono font-bold text-muted-foreground mb-0.5">A-Z</span>
      {ALFABETO.map((lettera) => {
        const n = conteggi[lettera] || 0;
        const presente = n > 0;
        const isSelezionata = letteraAttiva === lettera;

        return (
          <button
            key={lettera}
            type="button"
            disabled={!presente}
            onClick={() => onSelezionaLettera(lettera)}
            title={
              presente
                ? `${lettera}: ${n > 1 ? `${n} lavoratori` : `${n} lavoratore`}`
                : `Nessuno con la ${lettera}`
            }
            className={`size-5 rounded text-[10px] font-bold transition-all flex items-center justify-center ${
              !presente
                ? "opacity-25 text-muted-foreground/50 cursor-not-allowed"
                : isSelezionata
                  ? "bg-emerald-600 text-white shadow-xs scale-110"
                  : "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white"
            }`}
          >
            {lettera}
          </button>
        );
      })}
    </aside>
  );
}

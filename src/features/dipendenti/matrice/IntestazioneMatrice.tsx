/*
 * File:      IntestazioneMatrice.tsx
 * Percorso:  src/features/dipendenti/matrice/IntestazioneMatrice.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: testata a schermo intero con titolo, ricerca ed esportazione CSV. Nessun cambio di comportamento.
 */
import { ArrowLeft, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  totale: number;
  ricerca: string;
  onRicerca: (testo: string) => void;
  onEsporta: () => void;
  onClose: () => void;
}

export function IntestazioneMatrice({ totale, ricerca, onRicerca, onEsporta, onClose }: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3 shrink-0">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Torna a Dipendenti
        </Button>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">
            Piano Fabbisogno Formativo e Ruoli
          </h1>
          <p className="text-xs text-muted-foreground">
            {totale} lavoratori attivi • Clicca sulle caselle per assegnare o togliere il ruolo
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca per nominativo, CF, reparto..."
            value={ricerca}
            onChange={(e) => onRicerca(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEsporta}
          className="h-8 gap-1.5 text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
        >
          <Download className="size-3.5" /> Esporta CSV
        </Button>
      </div>
    </header>
  );
}

/*
 * File:      SelettoreColonne.tsx
 * Percorso:  src/features/stampe/components/SelettoreColonne.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Pulsante «+» in fondo all'intestazione: elenco a spunte delle colonne, per gruppi funzionali in ordine alfabetico.
 */
import { useId } from "react";
import { Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { INTESTAZIONI, type Colonna, type GruppoColonne } from "../dati-stampa";

type Props = {
  gruppi: GruppoColonne[];
  /** Colonne oggi mostrate nel documento. */
  visibili: Colonna[];
  onAlterna: (c: Colonna) => void;
};

export function SelettoreColonne({ gruppi, visibili, onAlterna }: Props) {
  const prefisso = useId();
  const ultima = visibili.length <= 1;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Aggiungi o togli colonne"
          aria-label="Aggiungi o togli colonne"
          className="mx-auto flex size-6 items-center justify-center rounded text-primary hover:bg-primary/15 print:hidden"
        >
          <Plus className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 print:hidden">
        <div className="border-b px-3 py-2 text-xs font-semibold">Colonne del documento</div>
        <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
          {gruppi.map((g) => (
            <section key={g.titolo} className="mb-2.5 last:mb-0">
              <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{g.titolo}</h4>
              {g.colonne.map((c) => {
                const acceso = visibili.includes(c);
                const id = `${prefisso}-${c}`;
                return (
                  <label key={c} htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted">
                    <Checkbox id={id} checked={acceso} disabled={acceso && ultima} onCheckedChange={() => onAlterna(c)} />
                    {INTESTAZIONI[c]}
                  </label>
                );
              })}
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

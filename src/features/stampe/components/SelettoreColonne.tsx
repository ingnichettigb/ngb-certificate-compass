/*
 * File:      SelettoreColonne.tsx
 * Percorso:  src/features/stampe/components/SelettoreColonne.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Pulsante «+» in fondo all'intestazione: elenco a spunte delle colonne, per gruppi funzionali in ordine alfabetico.
 */
import { useId } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { INTESTAZIONI, type Colonna, type GruppoColonne } from "../dati-stampa";

type Props = {
  gruppi: GruppoColonne[];
  /** Colonne oggi mostrate nel documento. */
  visibili: Colonna[];
  onAlterna: (c: Colonna) => void;
  /** Frecce per spostare una colonna a sinistra (-1) o a destra (+1). */
  onSpostaDi?: ((c: Colonna, passo: -1 | 1) => void) | undefined;
};

export function SelettoreColonne({ gruppi, visibili, onAlterna, onSpostaDi }: Props) {
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
          {onSpostaDi && (
            <section className="mb-3 border-b pb-2" aria-label="Ordine delle colonne">
              <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Ordine delle colonne</h4>
              {visibili.map((c, i) => (
                <div key={c} className="flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-muted">
                  <span className="w-4 text-right font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{INTESTAZIONI[c]}</span>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => onSpostaDi(c, -1)}
                    aria-label={`Sposta ${INTESTAZIONI[c]} a sinistra`}
                    title="Sposta a sinistra"
                    className="rounded p-0.5 hover:bg-primary/15 disabled:opacity-25"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={i === visibili.length - 1}
                    onClick={() => onSpostaDi(c, 1)}
                    aria-label={`Sposta ${INTESTAZIONI[c]} a destra`}
                    title="Sposta a destra"
                    className="rounded p-0.5 hover:bg-primary/15 disabled:opacity-25"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              ))}
            </section>
          )}
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

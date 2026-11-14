/*
 * File:      IntestazioneColonna.tsx
 * Percorso:  src/components/tabella-comune/IntestazioneColonna.tsx
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 21:50 — Intestazione standard delle tabelle: clic ordina (A→Z, Z→A, originale), trascinamento
 *            per spostare la colonna, maniglia sul bordo destro per la larghezza (doppio clic = larghezza originale).
 */
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColonneTabella } from "./useColonneTabella";

type Props = {
  chiave: string;
  etichetta: string;
  colonne: ColonneTabella;
  className?: string;
};

export function IntestazioneColonna({ chiave, etichetta, colonne, className }: Props) {
  const ord = colonne.ordinamento?.chiave === chiave ? colonne.ordinamento.verso : null;
  const larghezza = colonne.larghezze[chiave];
  const Icona = ord === "asc" ? ArrowUp : ord === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <th
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        colonne.setTrascinata(chiave);
      }}
      onDragOver={(e) => colonne.trascinata && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (colonne.trascinata) colonne.sposta(colonne.trascinata, chiave);
        colonne.setTrascinata(null);
      }}
      onDragEnd={() => colonne.setTrascinata(null)}
      aria-sort={ord === "asc" ? "ascending" : ord === "desc" ? "descending" : "none"}
      style={larghezza ? { width: larghezza, minWidth: larghezza, maxWidth: larghezza } : undefined}
      className={cn(
        "group relative sticky top-0 z-10 select-none border-b border-border bg-muted px-3 py-2 text-left font-semibold",
        colonne.trascinata === chiave && "opacity-50",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => colonne.cliccaOrdina(chiave)}
        className="flex w-full cursor-pointer items-center gap-1 text-left hover:text-primary"
        title="Clic: ordina A→Z, poi Z→A, poi ordine originale. Trascina per spostare la colonna."
      >
        <span className="truncate">{etichetta}</span>
        <Icona className={cn("size-3.5 shrink-0", ord ? "text-primary" : "opacity-30 group-hover:opacity-70")} />
      </button>
      <span
        role="separator"
        aria-label={`Larghezza colonna ${etichetta}`}
        onPointerDown={(e) => colonne.iniziaResize(chiave, e)}
        onDoubleClick={() => colonne.ripristinaLarghezza(chiave)}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/40"
      />
    </th>
  );
}

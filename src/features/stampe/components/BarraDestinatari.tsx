/*
 * File:      BarraDestinatari.tsx
 * Percorso:  src/features/stampe/components/BarraDestinatari.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Pillole «Tutti / Solo docenti / Solo ATA» con i lavoratori di ciascuna scelta, stile verde brand come le altre barre.
 */
import { Users } from "lucide-react";
import { ETICHETTA_PUBBLICO, type Pubblico } from "../stampa-pubblico";

type Props = {
  scelto: Pubblico;
  conteggi: Record<Pubblico, number>;
  onSeleziona: (p: Pubblico) => void;
};

const STILE_ATTIVA = "bg-emerald-700 text-white border-emerald-800 shadow-sm ring-1 ring-emerald-500 font-semibold";
const STILE_RIPOSO =
  "border-emerald-600/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-700 hover:shadow-sm";

const SCELTE: Pubblico[] = ["tutti", "docenti", "ata"];

export function BarraDestinatari({ scelto, conteggi, onSeleziona }: Props) {
  return (
    <div role="group" aria-label="Chi stampare" className="mb-2 flex flex-wrap items-center gap-1.5 print:hidden">
      <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-foreground/80">
        <Users className="size-3.5 text-emerald-600" /> Stampa per:
      </span>
      {SCELTE.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={scelto === p}
          onClick={() => onSeleziona(p)}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${scelto === p ? STILE_ATTIVA : STILE_RIPOSO}`}
        >
          <span>{ETICHETTA_PUBBLICO[p]}</span>
          <span className="opacity-80">({conteggi[p]})</span>
        </button>
      ))}
      {scelto === "tutti" && <span className="text-[11px] text-muted-foreground">Docenti e ATA su pagine separate.</span>}
    </div>
  );
}

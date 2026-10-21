/*
 * File:      ListaDipendenti.tsx
 * Percorso:  src/features/dipendenti/components/ListaDipendenti.tsx
 * Elenco dei dipendenti filtrati.
 */
import { Loader2 } from "lucide-react";
import { type Dipendente, type Attestato } from "@/lib/api";
import { RigaDipendente } from "./RigaDipendente";

export function ListaDipendenti({
  isLoading,
  filtrati,
  attestati,
  sel,
  setSel,
}: {
  isLoading: boolean;
  filtrati: Dipendente[];
  attestati: Attestato[];
  sel: string | null;
  setSel: (id: string) => void;
}) {
  return (
    <>
    {isLoading ? (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Caricamento…
      </div>
    ) : (
      <ul className="mt-4 max-h-[65vh] divide-y divide-border overflow-auto rounded-lg border border-border">
        {filtrati.map((d) => (
          <RigaDipendente
            key={d.id}
            d={d}
            attestatiDip={attestati.filter((a) => a.dipendente_id === d.id)}
            selezionato={sel === d.id}
            onSel={() => setSel(d.id)}
          />
        ))}
        {!filtrati.length && (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">
            Nessun dipendente trovato
          </li>
        )}
      </ul>
    )}
    </>
  );
}

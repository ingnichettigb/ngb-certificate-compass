/*
 * File:      ListaAttestatiHr.tsx
 * Percorso:  src/features/hr/components/ListaAttestatiHr.tsx
 * Elenco degli attestati (caricamento, vuoto o schede).
 */
import { Loader2 } from "lucide-react";
import { type Attestato } from "@/lib/api";
import { RigaAttestatoHr } from "./RigaAttestatoHr";

export function ListaAttestatiHr({
  attestati,
  isLoading,
  sel,
  setSel,
}: {
  attestati: Attestato[];
  isLoading: boolean;
  sel: string | null;
  setSel: (id: string) => void;
}) {
  return (
  <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
    {isLoading && (
      <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Caricamento…
      </p>
    )}
    {!isLoading && attestati.length === 0 && (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nessun attestato in questo stato.
      </p>
    )}
    {attestati.map((a) => (
      <RigaAttestatoHr key={a.id} a={a} selezionato={sel === a.id} onSel={() => setSel(a.id)} />
    ))}
  </div>
  );
}

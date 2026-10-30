/*
 * File:      ListaAttestatiHr.tsx
 * Percorso:  src/features/hr/components/ListaAttestatiHr.tsx
 * Elenco degli attestati (caricamento, vuoto o schede).
 * Revisioni:
 *   - Rev 2 (2026-10-30 10:35): Evidenziazione doppioni.
 */
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { trovaDuplicati, type Attestato } from "@/lib/api";
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
  const doppioni = useMemo(() => trovaDuplicati(attestati), [attestati]);
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
      <RigaAttestatoHr key={a.id} a={a} selezionato={sel === a.id} onSel={() => setSel(a.id)} doppioni={doppioni.get(a.id) ?? 0} />
    ))}
  </div>
  );
}

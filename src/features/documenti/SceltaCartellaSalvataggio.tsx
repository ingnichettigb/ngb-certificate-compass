/*
 * File:          SceltaCartellaSalvataggio.tsx
 * Percorso:      src/features/documenti/SceltaCartellaSalvataggio.tsx
 * Data creazione: 2026-10-27
 * Revisioni:
 *   - Rev 1 (2026-10-27 21:05): Menu per scegliere la cartella di salvataggio, preselezionata sull'ultima usata.
 */
import { useEffect, useState } from "react";
import { elencoCartelle } from "@/lib/api/cartelle-multiple";

export function SceltaCartellaSalvataggio({
  valore,
  onChange,
}: {
  valore: string | null;
  onChange: (v: string) => void;
}) {
  const [nomi, setNomi] = useState<string[]>([]);
  useEffect(() => {
    elencoCartelle().then((l) => {
      const n = l.map((c) => c.nome);
      setNomi(n);
      if (n.length && (!valore || !n.includes(valore))) onChange(n[0]!);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (nomi.length === 0) {
    return <p className="text-xs text-muted-foreground">Nessuna cartella collegata: impostala in Impostazioni generali → Archivio.</p>;
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      Salva nella cartella:
      <select
        value={valore ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1"
      >
        {nomi.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </label>
  );
}

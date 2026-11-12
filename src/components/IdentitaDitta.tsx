/*
 * File: IdentitaDitta.tsx
 * Percorso: src/components/IdentitaDitta.tsx
 * Data creazione: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 06:53 — Testata aziendale da anagrafica, condivisa da tutte le pagine.
 */
import { useQuery } from "@tanstack/react-query";
import { CHIAVE_DITTA, getDitta } from "@/lib/api/ditta";
import { indirizzoDitta, logoDitta, nomeDitta } from "@/lib/identita-ditta";

export function IdentitaDitta({ compatta = false }: { compatta?: boolean }) {
  const { data } = useQuery({ queryKey: CHIAVE_DITTA, queryFn: getDitta });
  const logo = logoDitta(data);
  return (
    <div className="flex min-w-0 items-center gap-3">
      {logo && <img src={logo} alt={`Logo ${nomeDitta(data)}`} className={compatta ? "h-8 max-w-20 object-contain" : "h-12 max-w-40 object-contain"} />}
      <div className="min-w-0">
        <p className={compatta ? "text-xs font-semibold break-words" : "text-sm font-semibold break-words"}>{nomeDitta(data)}</p>
        {!compatta && <p className="text-xs text-muted-foreground">{indirizzoDitta(data)}</p>}
      </div>
    </div>
  );
}
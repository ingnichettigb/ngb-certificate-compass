/*
 * File:      RigaDipendente.tsx
 * Percorso:  src/features/dipendenti/components/RigaDipendente.tsx
 * Una riga dell'elenco dipendenti: nominativo, reparto, ruoli con scadenza e numero attestati.
 */
import { riepilogoIncarichi, scadenzaBadgeClass, type Dipendente, type Attestato } from "@/lib/api";

export function RigaDipendente({
  d,
  attestatiDip,
  selezionato,
  onSel,
}: {
  d: Dipendente;
  attestatiDip: Attestato[];
  selezionato: boolean;
  onSel: () => void;
}) {
  const suoiD = attestatiDip;
  const ruoli = riepilogoIncarichi(suoiD).filter((r) => r.ricoperto);
  return (
    <li>
      <button
        onClick={onSel}
        className={`flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 ${
          selezionato ? "bg-muted" : ""
        }`}
      >
        <span>
          <span className="font-medium">
            {d.cognome} {d.nome}
          </span>
          <span className="block text-xs text-muted-foreground">
            {d.codice_fiscale}
            {d.reparto ? ` · ${d.reparto}` : ""}
          </span>
          <span className="mt-1 flex flex-wrap gap-1">
            {ruoli.map((r) => (
              <span
                key={r.incarico.key}
                className={`rounded-full border px-1.5 py-0.5 text-[10px] ${scadenzaBadgeClass(
                  r.peggiore,
                )}`}
              >
                {r.incarico.label}
              </span>
            ))}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {suoiD.length} attestati
        </span>
      </button>
    </li>
  );
}

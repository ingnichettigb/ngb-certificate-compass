/*
 * File:      RigaAttestatoHr.tsx
 * Percorso:  src/features/hr/components/RigaAttestatoHr.tsx
 * Scheda di un attestato nella lista: nominativo, stato, corso, reparto e date.
 * Revisioni:
 *   - Rev 2 (2026-10-30 10:35): Sfondo arancione per i doppioni e numero attestato.
 */
import { formatData, scaduto, statoBadgeClass, type Attestato } from "@/lib/api";

export function RigaAttestatoHr({
  a,
  selezionato,
  onSel,
  doppioni = 0,
}: {
  a: Attestato;
  selezionato: boolean;
  onSel: () => void;
  doppioni?: number;
}) {
  return (
  <button
    onClick={onSel}
    className={`w-full rounded-xl border p-3 text-left transition-colors ${
      selezionato
        ? "border-primary bg-accent/50"
        : doppioni > 1
          ? "border-warning bg-warning/20 hover:bg-warning/30"
          : "border-border bg-surface hover:bg-accent/30"
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm font-semibold">
        {a.dipendenti?.cognome} {a.dipendenti?.nome}
      </span>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${statoBadgeClass(a.stato_validazione)}`}
      >
        {a.stato_validazione}
      </span>
    </div>
    <p className="mt-1 text-xs text-muted-foreground">
      {a.tipi_corso?.nome_corso ?? "—"}
      {a.numero_attestato && <span className="ml-1 font-mono">· N. {a.numero_attestato}</span>}
    </p>
    {doppioni > 1 && (
      <p className="mt-1 text-xs font-semibold">⚠ Possibile doppione ({doppioni} registrazioni identiche)</p>
    )}
    {a.dipendenti?.reparto && (
      <p className="mt-1 text-xs text-muted-foreground">
        Reparto: {a.dipendenti.reparto}
      </p>
    )}
    <p className="mt-1 text-xs text-muted-foreground">
      Corso del {formatData(a.data_corso)} · scadenza{" "}
      <span className={scaduto(a.data_scadenza_calcolata) ? "text-destructive" : ""}>
        {formatData(a.data_scadenza_calcolata)}
      </span>
    </p>
  </button>
  );
}

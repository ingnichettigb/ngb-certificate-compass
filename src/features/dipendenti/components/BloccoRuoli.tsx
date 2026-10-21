/*
 * File:      BloccoRuoli.tsx
 * Percorso:  src/features/dipendenti/components/BloccoRuoli.tsx
 * Ruoli e incarichi assegnati al dipendente, con i corsi ancora da svolgere.
 */
import { Checkbox } from "@/components/ui/checkbox";
import {
  type Dipendente,
  type AssegnazioneRuolo,
  type Attestato,
  type RuoloSicurezza,
} from "@/lib/api";

export function BloccoRuoli({
  corrente,
  ruoliAttivi,
  assegnazioni,
  ruoliCorrente,
  suoi,
  onSpunta,
}: {
  corrente: Dipendente;
  ruoliAttivi: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  ruoliCorrente: RuoloSicurezza[];
  suoi: Attestato[];
  onSpunta: (ruoloId: string, v: boolean) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <h3 className="text-sm font-semibold">Ruoli e incarichi assegnati</h3>
      {ruoliAttivi.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {ruoliAttivi.map((r) => {
            const spuntato =
              r.obbligatorio_tutti ||
              assegnazioni.some((a) => a.dipendente_id === corrente.id && a.ruolo_id === r.id);
            return (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={spuntato}
                  disabled={r.obbligatorio_tutti}
                  onCheckedChange={(v) => onSpunta(r.id, v === true)}
                />
                {r.nome}
                {r.obbligatorio_tutti && (
                  <span className="text-[10px] text-muted-foreground">(per tutti)</span>
                )}
              </label>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nessun ruolo: aggiungili da Impostazioni → Ruoli.
        </p>
      )}
      {ruoliCorrente
        .filter(
          (r) =>
            r.macro_categoria &&
            !suoi.some((a) => a.tipi_corso?.macro_categoria === r.macro_categoria),
        )
        .map((r) => (
          <p
            key={r.id}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive"
          >
            Da svolgere: corso {r.macro_categoria} per il ruolo {r.nome}
          </p>
        ))}
    </div>
  );
}

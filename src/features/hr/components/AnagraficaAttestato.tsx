/*
 * File:      AnagraficaAttestato.tsx
 * Percorso:  src/features/hr/components/AnagraficaAttestato.tsx
 * Nome, codice fiscale e dati anagrafici del lavoratore dell'attestato.
 */
import { formatData, type Attestato } from "@/lib/api";
import { Info } from "./Info";

export function AnagraficaAttestato({ attestato }: { attestato: Attestato }) {
  const d = attestato.dipendenti;
  return (
    <>
      <div>
        <h2 className="font-display text-xl font-semibold">
          {d?.cognome} {d?.nome}
        </h2>
        <p className="text-sm text-muted-foreground">{d?.codice_fiscale}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-sm">
        <Info label="Email" value={d?.email ?? "—"} />
        <Info label="Reparto" value={d?.reparto ?? "—"} />
        <Info label="Luogo di nascita" value={d?.luogo_nascita ?? "—"} />
        <Info label="Data di nascita" value={formatData(d?.data_nascita)} />
        <Info label="Stato" value={attestato.stato_validazione} />
        <Info label="Scadenza" value={formatData(attestato.data_scadenza_calcolata)} />
      </dl>
    </>
  );
}

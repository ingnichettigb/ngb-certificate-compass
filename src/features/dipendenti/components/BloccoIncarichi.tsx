/*
 * File:      BloccoIncarichi.tsx
 * Percorso:  src/features/dipendenti/components/BloccoIncarichi.tsx
 * Integrazioni DVR aperte e stato degli incarichi di formazione.
 */
import { Button } from "@/components/ui/button";
import {
  etichettaStato,
  formatData,
  riepilogoIncarichi,
  scadenzaBadgeClass,
  type IntegrazioneDvr,
  type Attestato,
} from "@/lib/api";

export function BloccoIncarichi({
  integAperte,
  suoi,
  categorieRichieste,
  onSegnaCompletata,
}: {
  integAperte: IntegrazioneDvr[];
  suoi: Attestato[];
  categorieRichieste: Set<string | null>;
  onSegnaCompletata: (i: IntegrazioneDvr) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Incarichi e formazione</h3>
      {integAperte.map((i) => (
        <div key={i.id} className="rounded-xl border border-warning/50 bg-warning/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Integrazione DVR: {i.ore ? `${i.ore} ore` : i.descrizione}
            </span>
            <span className="rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[11px] text-warning-foreground">
              Da completare
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {i.tipo_corso_nome ? `Dal corso: ${i.tipo_corso_nome} · ` : ""}richiesta il {formatData(i.data_richiesta)}
          </p>
          {i.argomenti_mancanti.length > 0 && (
            <p className="mt-1 text-xs">Argomenti da integrare: {i.argomenti_mancanti.join(", ")}</p>
          )}
          <Button size="sm" variant="outline" className="mt-2" onClick={() => onSegnaCompletata(i)}>
            Segna completata
          </Button>
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        {riepilogoIncarichi(suoi).map((r) => (
          <div
            key={r.incarico.key}
            className={`rounded-xl border p-3 ${
              r.ricoperto
                ? "border-border bg-background"
                : "border-dashed border-border/70"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{r.incarico.label}</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] ${scadenzaBadgeClass(
                  r.peggiore,
                )}`}
              >
                {r.ricoperto
                  ? etichettaStato(r.peggiore)
                  : categorieRichieste.has(r.incarico.categoria)
                    ? "Da svolgere"
                    : "Non incaricato"}
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {r.voci.map((v) => (
                <li
                  key={v.livello}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-muted-foreground">{v.livello}</span>
                  {v.attestato ? (
                    <span className="text-right">
                      {formatData(v.attestato.data_corso)}
                      <span
                        className={`ml-2 rounded-full border px-1.5 py-0.5 ${scadenzaBadgeClass(
                          v.stato,
                        )}`}
                      >
                        {v.attestato.data_scadenza_calcolata
                          ? `scade ${formatData(v.attestato.data_scadenza_calcolata)}`
                          : "senza scadenza"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70">assente</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

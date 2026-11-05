/*
 * File:      AnagraficaDipendente.tsx
 * Percorso:  src/features/dipendenti/components/AnagraficaDipendente.tsx
 * Dati anagrafici del dipendente selezionato.
 * Revisioni:
 *   - Rev 2 — 05/11/2026 17:50 — Pulsante «Modifica anagrafica» e avviso CF da verificare.
 */
import { Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatData, type Dipendente } from "@/lib/api";
import { analizzaCodiceFiscale } from "../codice-fiscale/controllo-cf";

export function AnagraficaDipendente({
  corrente,
  onModifica,
}: {
  corrente: Dipendente;
  onModifica?: (() => void) | undefined;
}) {
  const esito = analizzaCodiceFiscale(corrente.codice_fiscale);
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">
          {corrente.cognome} {corrente.nome}
        </h2>
        <p className="text-sm text-muted-foreground">
          {corrente.codice_fiscale}
          {corrente.reparto ? ` · ${corrente.reparto}` : ""}
        </p>
        {!esito.valido && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
            <AlertTriangle className="size-3.5" /> Codice fiscale da verificare: {esito.problemi.join("; ")}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Nato/a a {corrente.luogo_nascita || "—"} il {formatData(corrente.data_nascita)} ·{" "}
          {corrente.email || "email non presente"}
          {corrente.codice_ateco ? ` · ATECO ${corrente.codice_ateco}` : ""}
        </p>
      </div>
      {onModifica && (
        <Button size="sm" variant="outline" onClick={onModifica} className="shrink-0">
          <Pencil className="size-4" /> Modifica anagrafica
        </Button>
      )}
    </div>
  );
}

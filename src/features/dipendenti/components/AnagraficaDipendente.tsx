/*
 * File:      AnagraficaDipendente.tsx
 * Percorso:  src/features/dipendenti/components/AnagraficaDipendente.tsx
 * Dati anagrafici del dipendente selezionato.
 */
import { formatData, type Dipendente } from "@/lib/api";

export function AnagraficaDipendente({ corrente }: { corrente: Dipendente }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">
        {corrente.cognome} {corrente.nome}
      </h2>
      <p className="text-sm text-muted-foreground">
        {corrente.codice_fiscale}
        {corrente.reparto ? ` · ${corrente.reparto}` : ""}
      </p>
      <p className="text-sm text-muted-foreground">
        Nato/a a {corrente.luogo_nascita || "—"} il {formatData(corrente.data_nascita)} ·{" "}
        {corrente.email || "email non presente"}
        {corrente.codice_ateco ? ` · ATECO ${corrente.codice_ateco}` : ""}
      </p>
    </div>
  );
}

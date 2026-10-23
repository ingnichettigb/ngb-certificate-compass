/*
 * File:      InsegnamentoTab.tsx
 * Percorso:  src/features/impostazioni/InsegnamentoTab.tsx
 * Scheda Classi di concorso e materie.
 * Le parti sono in src/features/impostazioni/insegnamento/ (dati e azioni, ricerca, elenchi, nuova classe).
 */
import { ErroreTabelle } from "./ErroreTabelle";
import { ElencoClassiConcorso } from "./insegnamento/ElencoClassiConcorso";
import { ElencoMaterie } from "./insegnamento/ElencoMaterie";
import { NuovaClasseConcorso } from "./insegnamento/NuovaClasseConcorso";
import { useInsegnamentoTab } from "./insegnamento/useInsegnamentoTab";

export function InsegnamentoTab() {
  const t = useInsegnamentoTab();

  if (t.error) return <ErroreTabelle messaggio={(t.error as Error).message} />;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Elenco proposto ai docenti nel modulo. Ogni valore nuovo scritto da un lavoratore viene
        aggiunto qui in automatico, così col tempo l'elenco si completa da solo.
      </p>

      <div className="space-y-2">
        <ElencoClassiConcorso
          totale={t.classi.length}
          classi={t.classiFiltrate}
          isLoading={t.isLoading}
          filtro={t.filtro}
          onFiltro={t.setFiltro}
          busy={t.busy}
          onCambiaAttiva={t.cambiaAttiva}
          onRimuovi={t.rimuovi}
        />
        <NuovaClasseConcorso
          codice={t.codice}
          onCodice={t.setCodice}
          denominazione={t.denominazione}
          onDenominazione={t.setDenominazione}
          onAggiungi={t.aggiungi}
          occupato={t.busy === "nuovo"}
        />
      </div>

      <ElencoMaterie materie={t.materie} busy={t.busy} onRimuovi={t.rimuoviMateria} />
    </div>
  );
}

/*
 * File:      ScadenzePage.tsx
 * Percorso:  src/features/scadenze/ScadenzePage.tsx
 * Pagina Scadenze attestati: compone filtri e tabella con la logica dell'hook.
 */
import { Loader2 } from "lucide-react";
import { IntestazioneScadenze } from "./components/IntestazioneScadenze";
import { FiltriScadenze } from "./components/FiltriScadenze";
import { TabellaScadenze } from "./components/TabellaScadenze";
import { useScadenze } from "./hooks/useScadenze";

export function ScadenzePage() {
  const {
    vista,
    setVista,
    q,
    setQ,
    reparto,
    setReparto,
    corsoSelezionato,
    setCorsoSelezionato,
    sortCol,
    sortDir,
    isLoading,
    reparti,
    corsi,
    righe,
    cambiaOrdinamento,
  } = useScadenze();

  return (
    <main className="min-h-screen bg-background">
      <IntestazioneScadenze totale={righe.length} vista={vista} />

      <section className="mx-auto max-w-[1400px] px-5 py-6">
        <FiltriScadenze
          vista={vista}
          setVista={setVista}
          corsoSelezionato={corsoSelezionato}
          setCorsoSelezionato={setCorsoSelezionato}
          corsi={corsi}
          reparto={reparto}
          setReparto={setReparto}
          reparti={reparti}
          q={q}
          setQ={setQ}
        />

        {isLoading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Caricamento…
          </div>
        ) : (
          /* Contenitore vincolato alla finestra: scrollbar orizzontale SEMPRE a vista */
          <TabellaScadenze righe={righe} sortCol={sortCol} sortDir={sortDir} onOrdina={cambiaOrdinamento} />
        )}
      </section>
    </main>
  );
}

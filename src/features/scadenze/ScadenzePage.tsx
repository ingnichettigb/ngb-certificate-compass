/*
 * File:      ScadenzePage.tsx
 * Percorso:  src/features/scadenze/ScadenzePage.tsx
 * Revisione: 4 — 28/11/2026 10:01
 * Pagina Scadenze attestati: compone filtri e tabella con la logica dell'hook.
 * Revisioni:
 * - Rev 2 (2026-11-06 18:30): Connessione del filtro «Solo incarichi attualmente assegnati».
 * - Rev 3 (28/11/2026 09:11): Filtro «Ruolo»; barra con «Esporta» (Excel/CSV) e «Stampa» dell'elenco filtrato;
 *   l'intestazione riporta reparto, ruolo e corso scelti.
 * - Rev 4 (28/11/2026 10:01): Vista «Da formare / Mancanti»: messaggio di elenco vuoto dedicato; Esporta e Stampa includono le righe.
 */
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PulsanteEsporta } from "@/components/tabella-comune/PulsanteEsporta";
import { TUTTI, VISTA_DA_FORMARE } from "./types";
import { esportaScadenze } from "./esporta-scadenze";
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
    ruoloSelezionato,
    cambiaRuolo,
    ruoli,
    ruolo,
    corsoSelezionato,
    setCorsoSelezionato,
    sortCol,
    sortDir,
    isLoading,
    reparti,
    corsi,
    righe,
    cambiaOrdinamento,
    soloIncarichiAssegnati,
    setSoloIncarichiAssegnati,
  } = useScadenze();

  const dettaglio = [
    reparto !== TUTTI ? `Reparto: ${reparto}` : "",
    ruolo ? `Ruolo: ${ruolo.nome}` : "",
    corsoSelezionato !== TUTTI ? `Corso: ${corsoSelezionato}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="min-h-screen bg-background">
      <IntestazioneScadenze totale={righe.length} vista={vista} dettaglio={dettaglio} />

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
          ruoloSelezionato={ruoloSelezionato}
          cambiaRuolo={cambiaRuolo}
          ruoli={ruoli}
          q={q}
          setQ={setQ}
          soloIncarichiAssegnati={soloIncarichiAssegnati}
          setSoloIncarichiAssegnati={setSoloIncarichiAssegnati}
        />

        {/* Esporta e stampa l'elenco così com'è filtrato e ordinato */}
        <div className="mt-3 flex items-center justify-end gap-2 print:hidden">
          <PulsanteEsporta
            disabled={isLoading || righe.length === 0}
            onEsporta={(formato) => esportaScadenze(righe, formato, { vista, ruoloNome: ruolo?.nome })}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || righe.length === 0}
            onClick={() => window.print()}
            data-aiuto="Stampa l'elenco mostrato (senza menù e filtri)"
          >
            <Printer className="size-4" /> Stampa
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Caricamento…
          </div>
        ) : (
          /* Contenitore vincolato alla finestra: scrollbar orizzontale SEMPRE a vista */
          <TabellaScadenze
            righe={righe}
            sortCol={sortCol}
            sortDir={sortDir}
            onOrdina={cambiaOrdinamento}
            messaggioVuoto={vista === VISTA_DA_FORMARE ? "Nessun lavoratore da formare con questi filtri" : "Nessun attestato in questa vista"}
          />
        )}
      </section>
    </main>
  );
}

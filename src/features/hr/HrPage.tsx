/*
 * File:      HrPage.tsx
 * Percorso:  src/features/hr/HrPage.tsx
 * Revisioni:
 *   rev 2 — 26/10/2026 15:10 — Aggiunte sezioni «ricevuti» e «archiviati».
 *   rev 3 — 26/10/2026 20:10 — Blocco in alto fisso durante lo scorrimento; bottoni
 *            «Aggancia/Aggiungi attestato» inclusi nella barra fissa.
 * Dashboard HR: compone lista, filtri e dettaglio con la logica degli hook.
 */
import { useState } from "react";
import { IntestazioneHr } from "./components/IntestazioneHr";
import { FiltriStatoHr } from "./components/FiltriStatoHr";
import { ListaAttestatiHr } from "./components/ListaAttestatiHr";
import { DettaglioAttestato } from "./components/DettaglioAttestato";
import { SelettoreSezioniHr, type SezioneHr } from "./components/SelettoreSezioniHr";
import { AzioniAttestatiBarra } from "./components/AzioniAttestatiBarra";
import { useDatiHr } from "./hooks/useDatiHr";
import { DipendentiPage } from "@/features/dipendenti/DipendentiPage";

export function HrPage() {
  const { filtro, cambiaFiltro, sel, setSel, attestati, isLoading, corsi, corrente, refresh } = useDatiHr();
  const [sezione, setSezione] = useState<SezioneHr>("ricevuti");

  return (
    <main className="min-h-screen bg-background">
      {/* Blocco in alto sempre visibile durante lo scorrimento */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <IntestazioneHr onImported={refresh} />
        <SelettoreSezioniHr sezione={sezione} onCambia={setSezione} />
        {sezione === "archiviati" ? <AzioniAttestatiBarra /> : null}
      </div>

      {sezione === "archiviati" ? (
        <DipendentiPage senzaIntestazione bottoniInBarra />
      ) : (
        <div className="mx-auto grid max-w-[1600px] gap-5 px-5 py-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-3">
            <FiltriStatoHr filtro={filtro} onCambia={cambiaFiltro} />
            <ListaAttestatiHr attestati={attestati} isLoading={isLoading} sel={sel} setSel={setSel} />
          </aside>

          {corrente ? (
            <DettaglioAttestato key={corrente.id} attestato={corrente} corsi={corsi} onChanged={refresh} />
          ) : (
            <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              Seleziona un attestato dalla lista per validarlo.
            </div>
          )}
        </div>
      )}
    </main>
  );
}

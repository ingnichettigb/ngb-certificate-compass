/*
 * File:      DittaTab.tsx
 * Percorso:  src/features/impostazioni/DittaTab.tsx
 * Data creaz: 01/11/2026
 * Revisioni:
 *   rev 1 — 01/11/2026 12:00 — Scheda Ditta con anagrafica, figure sicurezza, ATECO, rischio e presenze.
 *   rev 2 — 01/11/2026 14:00 — Mostra i lavoratori in forza nel programma accanto al numero dichiarato.
 *   rev 2 — 01/11/2026 12:15 — Evidenziazione gialla e avviso rosso se il dato inserito differisce dal D.Lgs. 81/08.
 *   rev 3 — 06/11/2026 — Secondo pulsante «Salva modifiche DB» in fondo; Invio nel campo ATECO aggiunge il codice;
 *                        controlli (isDirty/salva/scarta) esposti alla finestra Impostazioni tramite tabHandleRef.
 *   rev 4 — 07/11/2026 — Diviso in file per responsabilità (cartella ditta/): un file per riquadro, calcolo dei fabbisogni e pulsante Salva. Nessun cambio di comportamento.
 *   rev 5 — 13/11/2026 — Riquadro «Sedi e plessi» sotto l'anagrafica.
 */
import { useEffect } from "react";
import { Building2, Loader2 } from "lucide-react";
import { useDittaTab } from "./ditta/useDittaTab";
import { useLavoratoriInForza } from "@/features/ditta/useDitta";
import { calcolaFabbisogniDitta } from "./ditta/calcola-fabbisogni-ditta";
import { BottoneSalvaDitta } from "./ditta/BottoneSalvaDitta";
import { RiquadroAnagrafica } from "./ditta/RiquadroAnagrafica";
import { RiquadroSedi } from "./ditta/RiquadroSedi";
import { RiquadroFigureSicurezza } from "./ditta/RiquadroFigureSicurezza";
import { RiquadroAtecoRischio } from "./ditta/RiquadroAtecoRischio";
import { RiquadroOrganico } from "./ditta/RiquadroOrganico";
import { RiquadroFabbisogni } from "./ditta/RiquadroFabbisogni";

export type DittaTabHandle = {
  isDirty: () => boolean;
  salva: () => Promise<boolean>;
  scarta: () => void;
};

export function DittaTab({
  tabHandleRef,
}: {
  tabHandleRef?: React.MutableRefObject<DittaTabHandle | null>;
} = {}) {
  const {
    form,
    soglie,
    isLoading,
    isSaving,
    isDirty,
    salvaAdesso,
    reimpostaForm,
    nuovoAteco,
    setNuovoAteco,
    updateCampo,
    aggiungiAteco,
    rimuoviAteco,
    handleSubmit,
  } = useDittaTab();
  const { data: lavoratoriInForza } = useLavoratoriInForza();

  // Sempre aggiornato all'ultimo render: la finestra padre legge i valori correnti senza stale closure.
  const handle: DittaTabHandle = {
    isDirty: () => isDirty,
    salva: salvaAdesso,
    scarta: reimpostaForm,
  };
  useEffect(() => {
    if (!tabHandleRef) return;
    tabHandleRef.current = handle;
  });
  useEffect(() => {
    if (!tabHandleRef) return;
    return () => {
      tabHandleRef.current = null;
    };
  }, [tabHandleRef]);

  if (isLoading || !form) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground justify-center">
        <Loader2 className="size-5 animate-spin" /> Caricamento dati ditta dal database…
      </div>
    );
  }

  // Calcolo delle deduzioni automatiche in base alle soglie D.Lgs. 81/08
  const {
    esitoRls,
    esitoPs,
    esitoAntincendio,
    esitoIdoneita,
    livelloPropostoNum,
    antincendioDifferisce,
  } = calcolaFabbisogniDitta(soglie, form);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="size-5 text-primary" /> Anagrafica Ditta & Parametri di Sicurezza
          </h2>
          <p className="text-xs text-muted-foreground">
            I dati sono salvati nel database centralizzato e guidano la determinazione dei
            fabbisogni formativi.
          </p>
        </div>
        <BottoneSalvaDitta isSaving={isSaving} />
      </div>

      {/* Riquadro 1: Dati Anagrafici e Contatti */}
      <RiquadroAnagrafica form={form} updateCampo={updateCampo} />

      {/* Sedi e plessi: salvano da sole (non dipendono dal pulsante Salva della Ditta) */}
      <RiquadroSedi />

      {/* Riquadro 2: Figure della Sicurezza D.Lgs. 81/08 */}
      <RiquadroFigureSicurezza form={form} updateCampo={updateCampo} />

      {/* Riquadro 3: Attività, ATECO e Livello di Rischio */}
      <RiquadroAtecoRischio
        form={form}
        updateCampo={updateCampo}
        nuovoAteco={nuovoAteco}
        setNuovoAteco={setNuovoAteco}
        aggiungiAteco={aggiungiAteco}
        rimuoviAteco={rimuoviAteco}
      />

      {/* Riquadro 4: Organico, Presenze e Sintesi Fabbisogni Normativi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RiquadroOrganico
          form={form}
          updateCampo={updateCampo}
          lavoratoriInForza={lavoratoriInForza}
          esitoRls={esitoRls}
          esitoPs={esitoPs}
          esitoAntincendio={esitoAntincendio}
          livelloPropostoNum={livelloPropostoNum}
          antincendioDifferisce={antincendioDifferisce}
        />
        <RiquadroFabbisogni
          form={form}
          updateCampo={updateCampo}
          esitoRls={esitoRls}
          esitoPs={esitoPs}
          esitoAntincendio={esitoAntincendio}
          esitoIdoneita={esitoIdoneita}
          antincendioDifferisce={antincendioDifferisce}
        />
      </div>

      {/* Barra inferiore: secondo pulsante Salva per chi termina la compilazione in basso */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <BottoneSalvaDitta isSaving={isSaving} />
      </div>
    </form>
  );
}

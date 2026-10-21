/*
 * File:      SchedaDipendente.tsx
 * Percorso:  src/features/dipendenti/components/SchedaDipendente.tsx
 * Scheda del dipendente selezionato: anagrafica, reparto, ruoli, incarichi, PDF e tabella attestati.
 */
import { useMemo } from "react";
import {
  ruoliDelDipendente,
  type Dipendente,
  type IntegrazioneDvr,
  type AssegnazioneRuolo,
  type Attestato,
  type RuoloSicurezza,
} from "@/lib/api";
import { DocumentiAttestati } from "@/features/documenti/DocumentiAttestati";
import { costruisciRigheAttestati } from "../ordinamento";
import { AnagraficaDipendente } from "./AnagraficaDipendente";
import { SelezioneReparto } from "./SelezioneReparto";
import { BloccoRuoli } from "./BloccoRuoli";
import { BloccoIncarichi } from "./BloccoIncarichi";
import { TabellaAttestati } from "./TabellaAttestati";
import { useOrdinamentoAttestati } from "../hooks/useOrdinamentoAttestati";

export function SchedaDipendente({
  corrente,
  attestati,
  integrazioni,
  ruoliCatalogo,
  assegnazioni,
  ruoliAttivi,
  repartiAttivi,
  ordinamento,
  onCambiaReparto,
  onSpuntaRuolo,
  onSegnaCompletata,
}: {
  corrente: Dipendente;
  attestati: Attestato[];
  integrazioni: IntegrazioneDvr[];
  ruoliCatalogo: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  ruoliAttivi: RuoloSicurezza[];
  repartiAttivi: string[];
  ordinamento: ReturnType<typeof useOrdinamentoAttestati>;
  onCambiaReparto: (valore: string) => void;
  onSpuntaRuolo: (ruoloId: string, v: boolean) => void;
  onSegnaCompletata: (i: IntegrazioneDvr) => void;
}) {
  const { attestatiSortCol, attestatiSortDir, cambiaOrdinamentoAttestati } = ordinamento;
  const suoi = attestati.filter((a) => a.dipendente_id === corrente.id);
  const suoiInteg = integrazioni.filter((i) => i.dipendente_id === corrente.id);
  const integAperte = suoiInteg.filter((i) => i.stato === "Da completare");
  const ruoliCorrente = ruoliDelDipendente(corrente.id, ruoliCatalogo, assegnazioni);
  const categorieRichieste = new Set(ruoliCorrente.map((r) => r.macro_categoria).filter(Boolean));

  // Righe unificate (attestati + eventuali integrazioni DVR) con ordinamento dinamico
  const righeAttestati = useMemo(
    () => costruisciRigheAttestati({ suoi, suoiInteg, colonna: attestatiSortCol, direzione: attestatiSortDir }),
    [suoi, suoiInteg, attestatiSortCol, attestatiSortDir],
  );

  return (
    <div className="space-y-4">
      <AnagraficaDipendente corrente={corrente} />
      <SelezioneReparto corrente={corrente} repartiAttivi={repartiAttivi} onCambia={onCambiaReparto} />
      <BloccoRuoli
        corrente={corrente}
        ruoliAttivi={ruoliAttivi}
        assegnazioni={assegnazioni}
        ruoliCorrente={ruoliCorrente}
        suoi={suoi}
        onSpunta={onSpuntaRuolo}
      />
      <BloccoIncarichi
        integAperte={integAperte}
        suoi={suoi}
        categorieRichieste={categorieRichieste}
        onSegnaCompletata={onSegnaCompletata}
      />

      {/* Riquadro Gestione PDF Attestati */}
      <DocumentiAttestati dipendente={corrente} />

      <TabellaAttestati
        righe={righeAttestati}
        colonna={attestatiSortCol}
        direzione={attestatiSortDir}
        onOrdina={cambiaOrdinamentoAttestati}
      />
    </div>
  );
}

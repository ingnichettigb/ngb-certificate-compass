/*
 * File:          SchermoVerificaAttestato.tsx
 * Percorso:      src/features/dipendenti/verifica-attestato/SchermoVerificaAttestato.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 21:35): Schermata a tutto schermo per verifica documento e aggancio nel database.
 *   - Rev 2 (2026-10-25 21:45): Vista intera (100vw x 100vh) con suddivisione a 2 colonne reali (PDF 70% e dati 30%).
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { apriFileLocale, type FileTrovato } from "@/lib/api/cartella-locale";
import { type Attestato, type Dipendente } from "@/lib/api";
import { VisualizzatorePdfVerifica } from "./VisualizzatorePdfVerifica";
import { PannelloDatiVerifica, type DatiVerifica } from "./PannelloDatiVerifica";

export function SchermoVerificaAttestato({
  attestato,
  dipendente,
  fileTrovato,
  onChiudi,
  onConfermato,
}: {
  attestato: Attestato;
  dipendente: Dipendente;
  fileTrovato: FileTrovato;
  onChiudi: () => void;
  onConfermato: (percorso: string) => void;
}) {
  const [dati, setDati] = useState<DatiVerifica>({
    dataCorso: attestato.data_corso || "",
    dataScadenza: attestato.data_scadenza_calcolata || "",
    senzaScadenza: !attestato.data_scadenza_calcolata,
    ore: attestato.ore_dichiarate ?? "",
  });
  const [salvataggio, setSalvataggio] = useState(false);

  async function conferma() {
    if (!dati.dataCorso) {
      toast.error("Inserisci la data di svolgimento del corso prima di confermare");
      return;
    }
    try {
      setSalvataggio(true);
      const { error } = await supabase
        .from("attestati_caricati")
        .update({
          url_foto_fronte: fileTrovato.percorsoRelativo,
          data_corso: dati.dataCorso,
          data_scadenza_calcolata: dati.senzaScadenza ? null : dati.dataScadenza || null,
          ore_dichiarate: dati.ore === "" ? null : Number(dati.ore),
        })
        .eq("id", attestato.id);
      if (error) throw error;
      toast.success(`Attestato collegato correttamente: ${fileTrovato.nome}`);
      onConfermato(fileTrovato.percorsoRelativo);
    } catch (e) {
      toast.error("Errore durante il salvataggio", { description: (e as Error).message });
    } finally {
      setSalvataggio(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex h-screen w-screen flex-col bg-background">
      {/* Intestazione fissa in alto */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onChiudi}
            disabled={salvataggio}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" /> Torna all'elenco file
          </Button>
          <div>
            <h1 className="text-sm font-bold text-foreground">Verifica documento e aggancio all'archivio</h1>
            <p className="text-xs text-muted-foreground">
              {dipendente.cognome} {dipendente.nome} • {attestato.tipi_corso?.nome_corso ?? "Corso"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={conferma}
          disabled={salvataggio}
          className="gap-2 bg-success px-6 py-2.5 font-bold text-success-foreground hover:bg-success/90 shadow ring-2 ring-success/30"
        >
          {salvataggio ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Conferma e aggancia al database
        </Button>
      </header>

      {/* Corpo a tutto schermo diviso orizzontalmente */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:flex-row">
        {/* Documento PDF: occupa la maggior parte dello schermo (70-75%) */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden md:w-3/4">
          <VisualizzatorePdfVerifica
            fileHandle={fileTrovato.handle}
            nomeFile={fileTrovato.nome}
            onApriEsterno={() => apriFileLocale(fileTrovato.handle)}
          />
        </section>

        {/* Pannello dati: occupa la colonna destra (25-30%) */}
        <section className="min-h-0 overflow-y-auto md:w-1/4">
          <PannelloDatiVerifica
            attestato={attestato}
            dipendente={dipendente}
            nomeFile={fileTrovato.nome}
            percorsoRelativo={fileTrovato.percorsoRelativo}
            dati={dati}
            onCambia={setDati}
          />
        </section>
      </main>
    </div>,
    document.body,
  );
}

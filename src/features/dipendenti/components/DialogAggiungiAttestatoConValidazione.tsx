/*
 * File:          DialogAggiungiAttestatoConValidazione.tsx
 * Percorso:      src/features/dipendenti/components/DialogAggiungiAttestatoConValidazione.tsx
 * Data creazione: 2026-11-06
 * Revisioni:
 *   - Rev 1 (2026-11-06 17:15): Flusso unificato di caricamento attestato da archivio con validazione immediata tramite DettaglioAttestato.
 * Descrizione:   Seleziona un PDF dalle cartelle collegate, crea il record in attesa e apre direttamente la maschera di validazione HR.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  creaAttestato,
  getTipiCorso,
  type Attestato,
  type Dipendente,
  type TipoCorso,
} from "@/lib/api";
import { apriFileLocale } from "@/lib/api/cartella-locale";
import { useRicercaArchivio } from "@/features/dipendenti/aggancia-allegato/useRicercaArchivio";
import { MascheraRicerca } from "@/features/dipendenti/aggancia-allegato/MascheraRicerca";
import { ElencoFileTrovati } from "@/features/dipendenti/aggancia-allegato/ElencoFileTrovati";
import { VisualizzatorePdfVerifica } from "@/features/dipendenti/verifica-attestato/VisualizzatorePdfVerifica";
import { DettaglioAttestato } from "@/features/hr/components/DettaglioAttestato";

export function DialogAggiungiAttestatoConValidazione({
  open,
  dipendente,
  onChiudi,
  onCompletato,
}: {
  open: boolean;
  dipendente: Dipendente;
  onChiudi: () => void;
  onCompletato: () => void;
}) {
  const [fase, setFase] = useState<"scelta_file" | "validazione">("scelta_file");
  const [attestatoCreato, setAttestatoCreato] = useState<Attestato | null>(null);
  const [busy, setBusy] = useState(false);

  // Ricerca automatica nell'archivio locale prefiltrata sul cognome del dipendente
  const r = useRicercaArchivio(open && fase === "scelta_file", dipendente.cognome || "");

  const { data: corsi = [] } = useQuery<TipoCorso[]>({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
    enabled: open,
  });

  if (!open) return null;

  async function procediConFileScelto() {
    if (!r.selezionato) return;
    try {
      setBusy(true);

      // Corso generico iniziale o primo corso disponibile per creare la bozza "In attesa"
      const corsoDefault = corsi[0]?.id || "";
      const oggi = new Date().toISOString().split("T")[0];

      // Crea il record in stato "In attesa", esattamente come se fosse arrivato dal Modulo di auto-invio
      const nuovo = await creaAttestato({
        dipendente_id: dipendente.id,
        codice_fiscale: dipendente.codice_fiscale,
        tipo_corso_id: corsoDefault,
        data_corso: oggi,
        ore_dichiarate: 4,
        url_foto_fronte: r.selezionato.percorsoRelativo || r.selezionato.nome,
        stato_validazione: "In attesa",
      });

      // Associa i dati completi del dipendente per la visualizzazione nel pannello HR
      const attestatoCompleto: Attestato = {
        ...nuovo,
        dipendenti: dipendente,
        tipi_corso: corsi.find((c) => c.id === corsoDefault) || null,
      };

      setAttestatoCreato(attestatoCompleto);
      setFase("validazione");
    } catch (e) {
      toast.error("Errore nella preparazione dell'attestato", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function handleChiudi() {
    setFase("scelta_file");
    setAttestatoCreato(null);
    onChiudi();
  }

  function handleFineValidazione() {
    toast.success("Attestato convalidato con successo");
    onCompletato();
    handleChiudi();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-background">
      {/* Header generale */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          {fase === "validazione" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFase("scelta_file")}
              disabled={busy}
            >
              <ArrowLeft className="size-4" /> Torna a scelta file
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleChiudi} disabled={busy}>
              <ArrowLeft className="size-4" /> Annulla
            </Button>
          )}
          <h1 className="text-base font-bold">
            {fase === "scelta_file"
              ? `Aggiungi attestato: ${dipendente.cognome} ${dipendente.nome}`
              : `Validazione attestato: ${dipendente.cognome} ${dipendente.nome}`}
          </h1>
        </div>

        {fase === "scelta_file" && (
          <Button
            disabled={!r.selezionato || busy}
            onClick={procediConFileScelto}
            className={r.selezionato ? "bg-success text-success-foreground hover:bg-success/90" : ""}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Procedi alla validazione
          </Button>
        )}

        {fase === "validazione" && (
          <Button variant="ghost" size="sm" onClick={handleChiudi}>
            <X className="size-4" /> Chiudi
          </Button>
        )}
      </header>

      {/* Corpo: Fase 1 Ricerca file */}
      {fase === "scelta_file" && (
        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(360px,40%)_1fr]">
          <aside className="space-y-4 overflow-y-auto border-r border-border p-4">
            <MascheraRicerca
              dipendente={dipendente}
              chiave={r.chiave}
              setChiave={r.setChiave}
              inRicerca={r.inRicerca}
              statoCartelle={r.statoCartelle}
              onCerca={r.cerca}
              onScegliCartella={r.scegliCartella}
              onAutorizza={r.autorizzaCartelle}
            />
            <ElencoFileTrovati
              risultati={r.risultati}
              chiave={r.chiave}
              selezionato={r.selezionato}
              onScegli={r.scegli}
            />
          </aside>
          <section className="flex min-h-[60vh] flex-col overflow-hidden">
            {r.selezionato ? (
              <VisualizzatorePdfVerifica
                key={r.selezionato.percorsoRelativo}
                fileHandle={r.selezionato.handle}
                nomeFile={r.selezionato.nome}
                onApriEsterno={() => r.selezionato && apriFileLocale(r.selezionato.handle)}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <FileText className="size-10" />
                Seleziona un file dall&apos;elenco a sinistra per visualizzarlo in anteprima
              </div>
            )}
          </section>
        </div>
      )}

      {/* Corpo: Fase 2 DettaglioAttestato con tutti i controlli HR */}
      {fase === "validazione" && attestatoCreato && (
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
          <div className="mx-auto max-w-7xl">
            <DettaglioAttestato
              key={attestatoCreato.id}
              attestato={attestatoCreato}
              corsi={corsi}
              onChanged={handleFineValidazione}
            />
          </div>
        </main>
      )}
    </div>,
    document.body,
  );
}

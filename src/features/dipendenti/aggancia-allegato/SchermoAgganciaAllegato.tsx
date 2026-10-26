/*
 * File:          SchermoAgganciaAllegato.tsx
 * Percorso:      src/features/dipendenti/aggancia-allegato/SchermoAgganciaAllegato.tsx
 * Data creazione: 2026-10-26
 * Revisioni:
 *   - Rev 1 (2026-10-26 15:40): Schermata a tutto schermo "Aggancia attestato come allegato".
 *   - Rev 2 (2026-10-26 16:45): z-index corretto a z-40 per apertura visibile dei menu a tendina.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { caricaDocumento, type Dipendente } from "@/lib/api";
import { apriFileLocale } from "@/lib/api/cartella-locale";
import { VisualizzatorePdfVerifica } from "../verifica-attestato/VisualizzatorePdfVerifica";
import { useRicercaArchivio } from "./useRicercaArchivio";
import { MascheraRicerca } from "./MascheraRicerca";
import { ElencoFileTrovati } from "./ElencoFileTrovati";
import { ZonaLavoratore, type DatiAllegato } from "./ZonaLavoratore";

const VUOTI: DatiAllegato = { tipo: "", altro: "", dataCorso: "", scadenza: "" };

export function SchermoAgganciaAllegato({
  open,
  onChiudi,
  dipendente,
  onAgganciato,
}: {
  open: boolean;
  onChiudi: () => void;
  dipendente: Dipendente;
  onAgganciato: () => void;
}) {
  const r = useRicercaArchivio(open, dipendente.cognome || "");
  const [dati, setDati] = useState<DatiAllegato>(VUOTI);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setDati(VUOTI);
  }, [open]);

  if (!open) return null;

  async function conferma() {
    if (!r.selezionato) return;
    if (!dati.tipo || (dati.tipo === "Altro" && !dati.altro.trim())) {
      toast.error("Scegli il tipo di attestato");
      return;
    }
    if (!dati.dataCorso) {
      toast.error("Inserisci la data del corso");
      return;
    }
    try {
      setBusy(true);
      const file = await r.selezionato.handle.getFile();
      await caricaDocumento({
        dipendente,
        tipo: dati.tipo,
        tipoPersonalizzato: dati.altro || null,
        dataCorso: dati.dataCorso,
        dataScadenza: dati.scadenza,
        file,
      });
      toast.success(`Allegato agganciato: ${r.selezionato.nome}`);
      onAgganciato();
      onChiudi();
    } catch (e) {
      toast.error("Aggancio non riuscito", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex h-screen w-screen flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onChiudi} disabled={busy}>
            <ArrowLeft className="size-4" /> Torna indietro
          </Button>
          <h1 className="text-base font-bold">Aggancia attestato come allegato</h1>
        </div>
        <Button
          disabled={!r.selezionato || busy}
          onClick={conferma}
          className={r.selezionato ? "bg-success text-success-foreground hover:bg-success/90" : ""}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Aggancia al lavoratore
        </Button>
      </header>

      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(340px,38%)_1fr]">
        <aside className="space-y-4 overflow-y-auto border-r border-border p-4">
          <MascheraRicerca
            dipendente={dipendente}
            chiave={r.chiave}
            setChiave={r.setChiave}
            inRicerca={r.inRicerca}
            haCartella={r.haCartella}
            onCerca={r.cerca}
            onScegliCartella={r.scegliCartella}
          />
          <ElencoFileTrovati risultati={r.risultati} chiave={r.chiave} selezionato={r.selezionato} onScegli={r.scegli} />
          <ZonaLavoratore dipendente={dipendente} dati={dati} onCambia={setDati} />
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
              Spunta un file a sinistra per vederlo qui
            </div>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}

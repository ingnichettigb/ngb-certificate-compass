/*
 * File:          ImageViewer.tsx
 * Percorso:      src/components/ImageViewer.tsx
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Visualizzatore base immagini fronte/retro da storage.
 *   - Rev 2 (2026-10-28 10:00): Supporto completo a file PDF (anteprima iframe), risoluzione
 *     dei file locali da cartelle collegate, rotazione a 90° e controlli per autorizzare la cartella locale.
 */
import { useEffect, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  ImageOff,
  ExternalLink,
  FileText,
  FolderSearch,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  risolviDocumentoAttestato,
  type EsitoRisoluzioneDocumento,
  elencoCartelle,
  aggiungiCartella,
  verificaPermessi,
} from "@/lib/api/cartelle-multiple";
import { toast } from "sonner";

export function ImageViewer({
  fronte,
  retro,
}: {
  fronte: string | null;
  retro: string | null;
}) {
  const [esitoFronte, setEsitoFronte] = useState<EsitoRisoluzioneDocumento | null>(null);
  const [esitoRetro, setEsitoRetro] = useState<EsitoRisoluzioneDocumento | null>(null);
  const [inCaricamento, setInCaricamento] = useState(true);
  const [lato, setLato] = useState<"fronte" | "retro">("fronte");
  const [zoom, setZoom] = useState(1);
  const [rotazione, setRotazione] = useState(0);
  const [haCartelleCollegate, setHaCartelleCollegate] = useState(false);
  const [inConnessione, setInConnessione] = useState(false);

  async function caricaDocumenti() {
    setInCaricamento(true);
    try {
      const cartelle = await elencoCartelle();
      setHaCartelleCollegate(cartelle.length > 0);

      const [f, r] = await Promise.all([
        risolviDocumentoAttestato(fronte),
        risolviDocumentoAttestato(retro),
      ]);
      setEsitoFronte(f);
      setEsitoRetro(r);
    } finally {
      setInCaricamento(false);
    }
  }

  useEffect(() => {
    setZoom(1);
    setRotazione(0);
    setLato("fronte");
    caricaDocumenti();

    return () => {
      // Revoca URL blob se generati localmente
      if (esitoFronte?.sorgente === "locale" && esitoFronte.url?.startsWith("blob:")) {
        URL.revokeObjectURL(esitoFronte.url);
      }
      if (esitoRetro?.sorgente === "locale" && esitoRetro.url?.startsWith("blob:")) {
        URL.revokeObjectURL(esitoRetro.url);
      }
    };
  }, [fronte, retro]);

  const esitoAttuale = lato === "fronte" ? esitoFronte : esitoRetro;
  const percorsoGrezzo = lato === "fronte" ? fronte : retro;

  async function handleAutorizzaCartelle() {
    setInConnessione(true);
    try {
      const cartelle = await elencoCartelle();
      let autorizzata = false;
      for (const c of cartelle) {
        const ok = await verificaPermessi(c.handle, true);
        if (ok) autorizzata = true;
      }
      if (autorizzata) {
        toast.success("Accesso alla cartella autorizzato con successo");
        await caricaDocumenti();
      } else {
        toast.error("Permesso negato per la cartella locale");
      }
    } catch (e) {
      toast.error("Errore durante l'autorizzazione", { description: (e as Error).message });
    } finally {
      setInConnessione(false);
    }
  }

  async function handleCollegaNuovaCartella() {
    setInConnessione(true);
    try {
      const nuova = await aggiungiCartella();
      if (nuova) {
        toast.success(`Cartella "${nuova.name}" collegata`);
        await caricaDocumenti();
      }
    } catch (e) {
      toast.error("Errore nel collegamento cartella", { description: (e as Error).message });
    } finally {
      setInConnessione(false);
    }
  }

  function handleApriEsterno() {
    if (esitoAttuale?.url) {
      window.open(esitoAttuale.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Barra superiore: Fronte/Retro e controlli Zoom/Rotazione */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          {(["fronte", "retro"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLato(l);
                setZoom(1);
                setRotazione(0);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                lato === l
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRotazione((r) => (r + 90) % 360)}
            className="h-8 gap-1.5 text-xs"
            title="Ruota di 90 gradi"
          >
            <RotateCw className="size-3.5" />
            <span className="hidden sm:inline">Ruota</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            aria-label="Riduci zoom"
          >
            <ZoomOut className="size-4" />
          </Button>

          <span className="w-14 text-center font-mono text-sm tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
            aria-label="Aumenta zoom"
          >
            <ZoomIn className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => {
              setZoom(1);
              setRotazione(0);
            }}
            aria-label="Reimposta zoom"
            title="Reimposta zoom e rotazione"
          >
            <RotateCcw className="size-4" />
          </Button>

          {esitoAttuale?.url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApriEsterno}
              className="h-8 gap-1 text-xs"
              title="Apri in un'altra scheda del browser"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">Apri</span>
            </Button>
          )}
        </div>
      </div>

      {/* Riquadro visualizzazione documento */}
      <div className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-auto rounded-xl border border-border bg-muted/40 p-2">
        {inCaricamento ? (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Caricamento attestato...</span>
          </div>
        ) : esitoAttuale?.url ? (
          esitoAttuale.isPdf ? (
            <div
              className="h-full min-h-[420px] w-full transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotazione}deg)`,
                transformOrigin: "center center",
              }}
            >
              <iframe
                src={`${esitoAttuale.url}#toolbar=0&view=FitH`}
                title={`Attestato ${lato}`}
                className="h-[65vh] w-full rounded-lg border border-border bg-background shadow-sm"
              />
            </div>
          ) : (
            <img
              src={esitoAttuale.url}
              alt={`Attestato ${lato}`}
              style={{
                transform: `scale(${zoom}) rotate(${rotazione}deg)`,
                transformOrigin: "center center",
              }}
              className="max-h-[65vh] w-auto max-w-full origin-center rounded-lg object-contain shadow-sm transition-transform"
            />
          )
        ) : esitoAttuale?.sorgente === "non_trovato" || (percorsoGrezzo && !esitoAttuale?.url) ? (
          /* File registrato su PC ma cartella non autorizzata o non collegata */
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-6 text-center shadow-sm">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <FileText className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">File registrato sul computer</p>
              <p
                className="line-clamp-2 font-mono text-xs text-muted-foreground"
                title={percorsoGrezzo || esitoAttuale?.nomeFile}
              >
                {esitoAttuale?.nomeFile || percorsoGrezzo}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {haCartelleCollegate
                ? "Il file si trova sul tuo computer ma il browser necessita dell'autorizzazione per leggere la cartella."
                : "Per aprire i PDF presenti sul tuo computer, collega la cartella in cui conservi gli attestati."}
            </p>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {haCartelleCollegate ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAutorizzaCartelle}
                  disabled={inConnessione}
                  className="gap-1.5"
                >
                  <FolderOpen className="size-4" />
                  Autorizza cartella archivio
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCollegaNuovaCartella}
                  disabled={inConnessione}
                  className="gap-1.5"
                >
                  <FolderSearch className="size-4" />
                  Collega cartella dal computer
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <ImageOff className="size-8" />
            Nessuna immagine {lato} caricata
          </div>
        )}
      </div>
    </div>
  );
}

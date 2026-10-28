/*
 * File:          ImageViewer.tsx
 * Percorso:      src/components/ImageViewer.tsx
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Visualizzatore base immagini fronte/retro da storage.
 *   - Rev 2 (2026-10-28 10:00): Supporto completo a file PDF, risoluzione cartelle collegate e permessi.
 *   - Rev 3 (2026-10-28 14:10): Rotazione reale via canvas per evitare restringimenti e vuoti laterali,
 *     adattamento geometrico 90°/270° e nuova modalità visualizzazione a schermo intero.
 *   - Rev 4 (2026-10-28 14:20): Nome del tipo di risoluzione corretto in RisoluzioneDocumento (export reale del modulo).
 */
import { useEffect, useState, useMemo } from "react";
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
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  risolviDocumentoAttestato,
  type RisoluzioneDocumento,
  elencoCartelle,
  aggiungiCartella,
  verificaPermessi,
} from "@/lib/api/cartelle-multiple";
import { ruotaDataUrl } from "@/components/cattura-ocr/ruota-immagine";
import { toast } from "sonner";

export function ImageViewer({
  fronte,
  retro,
}: {
  fronte: string | null;
  retro: string | null;
}) {
  const [esitoFronte, setEsitoFronte] = useState<RisoluzioneDocumento | null>(null);
  const [esitoRetro, setEsitoRetro] = useState<RisoluzioneDocumento | null>(null);
  const [inCaricamento, setInCaricamento] = useState(true);
  const [lato, setLato] = useState<"fronte" | "retro">("fronte");
  const [zoom, setZoom] = useState(1);
  const [rotazione, setRotazione] = useState(0);
  const [urlRuotato, setUrlRuotato] = useState<string | null>(null);
  const [inRotazione, setInRotazione] = useState(false);
  const [haCartelleCollegate, setHaCartelleCollegate] = useState(false);
  const [inConnessione, setInConnessione] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

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
    setUrlRuotato(null);
    setLato("fronte");
    caricaDocumenti();

    return () => {
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

  // Ruota fisicamente le immagini con Canvas per azzerare distorsioni e vuoti laterali
  useEffect(() => {
    let attivo = true;
    if (!esitoAttuale?.url || esitoAttuale.isPdf) {
      setUrlRuotato(null);
      return;
    }
    if (rotazione === 0) {
      setUrlRuotato(esitoAttuale.url);
      return;
    }
    setInRotazione(true);
    ruotaDataUrl(esitoAttuale.url, rotazione)
      .then((dataUrl) => {
        if (attivo) setUrlRuotato(dataUrl);
      })
      .catch(() => {
        if (attivo) setUrlRuotato(esitoAttuale.url);
      })
      .finally(() => {
        if (attivo) setInRotazione(false);
      });

    return () => {
      attivo = false;
    };
  }, [esitoAttuale?.url, esitoAttuale?.isPdf, rotazione]);

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

  const isRuotato90 = rotazione === 90 || rotazione === 270;

  // Controlli standard riutilizzabili sia nel riquadro sia nel modal fullscreen
  const controlliBarra = (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRotazione((r) => (r + 90) % 360)}
        className="h-8 gap-1.5 text-xs"
        title="Ruota di 90 gradi"
        disabled={inRotazione}
      >
        <RotateCw className="size-3.5" />
        <span>Ruota</span>
        {rotazione > 0 && <span className="font-mono text-[10px] opacity-70">{rotazione}°</span>}
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
        aria-label="Reimposta zoom e rotazione"
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

      {esitoAttuale?.url && (
        <Button
          type="button"
          variant={fullscreen ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFullscreen((v) => !v)}
          className="h-8 gap-1 text-xs"
          title={fullscreen ? "Riduci a dimensione normale (Esc)" : "Ingrandisci a tutto schermo"}
        >
          {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          <span className="hidden sm:inline">{fullscreen ? "Chiudi" : "Schermo intero"}</span>
        </Button>
      )}
    </div>
  );

  const renderingDocumento = (isInModal = false) => {
    if (inCaricamento || inRotazione) {
      return (
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>{inRotazione ? "Applicazione rotazione..." : "Caricamento attestato..."}</span>
        </div>
      );
    }

    if (esitoAttuale?.url) {
      if (esitoAttuale.isPdf) {
        return (
          <div
            className="flex h-full w-full items-center justify-center transition-all duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotazione}deg)`,
              transformOrigin: "center center",
            }}
          >
            <iframe
              src={`${esitoAttuale.url}#toolbar=0&view=FitH`}
              title={`Attestato ${lato}`}
              className={`rounded-lg border border-border bg-background shadow-md transition-all ${
                isInModal ? "h-[85vh] w-full" : isRuotato90 ? "h-[70vh] w-[80vw] max-w-full" : "h-[65vh] w-full"
              }`}
            />
          </div>
        );
      }

      const sorgenteImg = urlRuotato || esitoAttuale.url;
      return (
        <div className="flex h-full w-full items-center justify-center overflow-auto p-2">
          <img
            src={sorgenteImg}
            alt={`Attestato ${lato}`}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
            className={`rounded-lg object-contain shadow-sm transition-transform ${
              isInModal ? "max-h-[85vh] max-w-full" : "max-h-[68vh] w-auto max-w-full"
            }`}
          />
        </div>
      );
    }

    if (esitoAttuale?.sorgente === "non_trovato" || (percorsoGrezzo && !esitoAttuale?.url)) {
      return (
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
      );
    }

    return (
      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <ImageOff className="size-8" />
        Nessuna immagine {lato} caricata
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Barra superiore con selettore Fronte/Retro e comandi */}
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
                setUrlRuotato(null);
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

        {controlliBarra}
      </div>

      {/* Riquadro visualizzazione documento inline */}
      <div className="relative flex min-h-[460px] flex-1 items-center justify-center overflow-auto rounded-xl border border-border bg-muted/40 p-2">
        {renderingDocumento(false)}
      </div>

      {/* Modal a schermo intero reale (apribile con il tasto Schermo intero) */}
      {fullscreen && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-background/95 p-4 backdrop-blur-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                Visualizzazione attestato ({lato.toUpperCase()})
              </span>
              {esitoAttuale?.nomeFile && (
                <span className="font-mono text-xs text-muted-foreground">
                  — {esitoAttuale.nomeFile}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {controlliBarra}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setFullscreen(false)}
                title="Chiudi schermo intero (Esc)"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-auto p-4">
            {renderingDocumento(true)}
          </div>
        </div>
      )}
    </div>
  );
}

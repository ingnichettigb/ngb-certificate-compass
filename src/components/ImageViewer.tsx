/*
 * File:          ImageViewer.tsx
 * Percorso:      src/components/ImageViewer.tsx
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Creazione visualizzatore fronte/retro con zoom e rotazione CSS.
 *   - Rev 2 (2026-10-28 10:00): Supporto completo a file PDF, risoluzione cartelle collegate e permessi.
 *   - Rev 3 (2026-10-28 14:10): Rotazione reale via canvas per evitare restringimenti e vuoti laterali.
 *   - Rev 4 (2026-10-28 14:20): Tipo RisoluzioneDocumento allineato all'export reale.
 *   - Rev 5 (2026-10-28 14:35): Gestione distinta per documento mancante vs registrato su disco.
 *   - Rev 6 (2026-10-28 15:05): Aggiunta maniglie di resize su tutti e 4 i vertici e occupazione a piena dimensione.
 *   - Rev 7 (2026-10-30 21:00): Pannello «file non trovato» distinto per nessuna cartella / permesso mancante / file assente;
 *     controllo del popup bloccato in «Apri esterno».
 */
import { useEffect, useRef, useState } from "react";
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Loader2,
  FolderOpen,
  FolderSearch,
  Maximize2,
  Minimize2,
  FileText,
  FileQuestion,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { risolviDocumentoAttestato, type RisoluzioneDocumento } from "@/lib/api/cartelle-multiple";
import {
  autorizzaCartelle,
  collegaCartella,
  leggiStatoCartelle,
  type StatoCartelle,
} from "@/lib/api/stato-cartelle";
import { avvisoPopupBloccato } from "@/features/cartelle/avvisi-cartella";

function ruotaDataUrl(sorgenteUrl: string, gradi: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Contesto canvas non disponibile"));

      const rad = (gradi * Math.PI) / 180;
      const is90o270 = gradi === 90 || gradi === 270;
      canvas.width = is90o270 ? img.naturalHeight : img.naturalWidth;
      canvas.height = is90o270 ? img.naturalWidth : img.naturalHeight;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Impossibile caricare immagine per la rotazione"));
    img.src = sorgenteUrl;
  });
}

type VerticeResize = "nw" | "ne" | "sw" | "se";

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
  const [statoCartelle, setStatoCartelle] = useState<StatoCartelle | null>(null);
  const [inConnessione, setInConnessione] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Dimensioni personalizzabili tramite trascinamento dei 4 vertici
  const [altezzaCustom, setAltezzaCustom] = useState<number>(620);
  const [larghezzaCustom, setLarghezzaCustom] = useState<number | null>(null);
  const dragRef = useRef<{
    vertice: VerticeResize;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function caricaDocumenti() {
    setInCaricamento(true);
    try {
      setStatoCartelle(await leggiStatoCartelle());

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

  // Gestione trascinamento dei 4 vertici
  function iniziaResize(vertice: VerticeResize, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    const rect = el ? el.getBoundingClientRect() : { width: 500, height: altezzaCustom };

    dragRef.current = {
      vertice,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
    };

    function onMouseMove(moveEvent: MouseEvent) {
      if (!dragRef.current) return;
      const { vertice: v, startX, startY, startW, startH } = dragRef.current;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let nuovoH = startH;
      let nuovoW = startW;

      // Invertiamo il delta per i vertici superiori / sinistri
      if (v === "se") {
        nuovoW = startW + deltaX;
        nuovoH = startH + deltaY;
      } else if (v === "sw") {
        nuovoW = startW - deltaX;
        nuovoH = startH + deltaY;
      } else if (v === "ne") {
        nuovoW = startW + deltaX;
        nuovoH = startH - deltaY;
      } else if (v === "nw") {
        nuovoW = startW - deltaX;
        nuovoH = startH - deltaY;
      }

      setAltezzaCustom(Math.max(380, Math.min(1400, Math.round(nuovoH))));
      setLarghezzaCustom(Math.max(400, Math.min(1800, Math.round(nuovoW))));
    }

    function onMouseUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  async function handleAutorizzaCartelle() {
    setInConnessione(true);
    try {
      const stato = await autorizzaCartelle("read");
      if (stato.autorizzate > 0) {
        toast.success("Accesso alla cartella autorizzato con successo");
        await caricaDocumenti();
      } else {
        toast.error("Permesso negato per la cartella locale", {
          description: "Conferma la richiesta del browser per poter leggere i file.",
        });
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
      const nome = await collegaCartella();
      if (nome) {
        toast.success(`Cartella "${nome}" collegata`);
        await caricaDocumenti();
      }
    } catch (e) {
      toast.error("Errore nel collegamento cartella", { description: (e as Error).message });
    } finally {
      setInConnessione(false);
    }
  }

  function handleApriEsterno() {
    if (!esitoAttuale?.url) return;
    // Senza «noopener» window.open restituisce il riferimento, utile per accorgersi del blocco popup.
    const w = window.open(esitoAttuale.url, "_blank");
    if (!w) {
      avvisoPopupBloccato();
      return;
    }
    try {
      w.opener = null;
    } catch {
      /* ignora */
    }
  }

  const isRuotato90 = rotazione === 90 || rotazione === 270;

  const controlliBarra = (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRotazione((r) => (r + 90) % 360)}
        className="h-8 gap-1.5 text-xs"
        title="Ruota di 90 gradi in senso orario"
        disabled={inRotazione}
      >
        <RotateCw className="size-3.5" />
        <span>Ruota</span>
        {rotazione > 0 && <span className="font-mono text-[10px] font-semibold text-primary">{rotazione}°</span>}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
        aria-label="Riduci zoom"
        title="Riduci zoom"
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
        title="Aumenta zoom"
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
          setAltezzaCustom(620);
          setLarghezzaCustom(null);
        }}
        aria-label="Reimposta zoom, rotazione e dimensioni"
        title="Reimposta tutto al 100%"
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
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            <div
              className="flex h-full w-full items-center justify-center transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotazione}deg)`,
                transformOrigin: "center center",
              }}
            >
              <iframe
                src={`${esitoAttuale.url}#toolbar=0&view=FitH`}
                title={`Attestato ${lato}`}
                className={`rounded-lg border border-border bg-background shadow-md ${
                  isRuotato90 ? "h-[92vw] max-h-full w-[92vh] max-w-full" : "h-full w-full"
                }`}
              />
            </div>
          </div>
        );
      }

      const sorgenteImg = urlRuotato || esitoAttuale.url;
      return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden p-2">
          <img
            src={sorgenteImg}
            alt={`Attestato ${lato}`}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
            className="h-full w-full rounded-lg object-contain shadow-sm transition-transform"
          />
        </div>
      );
    }

    // Caso 1: C'era un percorso memorizzato ma il file non è stato aperto: si dice esattamente perché
    if (percorsoGrezzo && esitoAttuale?.sorgente === "non_trovato") {
      const stato = statoCartelle?.stato ?? "ok";
      const nomiSenza = (statoCartelle?.cartelle ?? []).filter((c) => !c.autorizzata).map((c) => c.nome);
      const nomiTutte = (statoCartelle?.cartelle ?? []).map((c) => c.nome);
      const titolo =
        stato === "nessuna"
          ? "Nessuna cartella collegata"
          : stato === "da_autorizzare"
            ? "Permesso alla cartella non concesso"
            : "File non trovato nelle cartelle collegate";
      const spiegazione =
        stato === "nessuna"
          ? "Per aprire i PDF presenti sul tuo computer, collega la cartella in cui conservi gli attestati."
          : stato === "da_autorizzare"
            ? `Il browser deve autorizzare la lettura di: ${nomiSenza.join(", ")}. Il file potrebbe trovarsi lì.`
            : `Cercato in: ${nomiTutte.join(", ")}. Il file potrebbe essere stato spostato o rinominato, oppure appartenere a un altro computer: usa l'icona di sostituzione per riagganciarlo.`;
      return (
        <div
          role="alert"
          className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-6 text-center shadow-sm"
        >
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <FileText className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{titolo}</p>
            <p
              className="line-clamp-2 font-mono text-xs text-muted-foreground"
              title={percorsoGrezzo || esitoAttuale?.nomeFile}
            >
              {esitoAttuale?.nomeFile || percorsoGrezzo}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{spiegazione}</p>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {stato === "da_autorizzare" && (
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
            )}
            {stato === "nessuna" && (
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
            {stato === "ok" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void caricaDocumenti()}
                disabled={inConnessione}
                className="gap-1.5"
              >
                <RotateCw className="size-4" />
                Ricontrolla
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Caso 2: Nessun documento registrato o link rimosso
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-8 text-center text-muted-foreground shadow-sm">
        <FileQuestion className="size-8 opacity-60" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Nessun documento PDF allegato</p>
          <p className="text-xs text-muted-foreground">
            I dati del corso sono salvati nell'anagrafica. Puoi approvare l'attestato senza allegato per archiviarlo.
          </p>
        </div>
      </div>
    );
  };

  // Stile maniglia vertice riutilizzabile
  const classeManiglia =
    "absolute z-30 size-4 rounded-sm border-2 border-primary bg-background shadow-md transition-colors hover:bg-primary hover:border-primary-foreground";

  return (
    <div className="flex h-full flex-col gap-3">
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
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                lato === l ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {controlliBarra}
      </div>

      {/* Riquadro visore con le maniglie di resize su tutti i 4 vertici */}
      <div
        ref={containerRef}
        style={{
          height: `${altezzaCustom}px`,
          width: larghezzaCustom ? `${larghezzaCustom}px` : "100%",
          maxWidth: "100%",
        }}
        className="group relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/20 p-2 transition-[border-color] hover:border-primary/50"
      >
        {/* Vertice 1: Alto-Sinistra (NW) */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Ridimensiona da alto sinistra"
          title="Trascina per allargare/alzare"
          onMouseDown={(e) => iniziaResize("nw", e)}
          className={`${classeManiglia} -top-1 -left-1 cursor-nwse-resize`}
        />

        {/* Vertice 2: Alto-Destra (NE) */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Ridimensiona da alto destra"
          title="Trascina per allargare/alzare"
          onMouseDown={(e) => iniziaResize("ne", e)}
          className={`${classeManiglia} -top-1 -right-1 cursor-nesw-resize`}
        />

        {/* Vertice 3: Basso-Sinistra (SW) */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Ridimensiona da basso sinistra"
          title="Trascina per allargare/abbassare"
          onMouseDown={(e) => iniziaResize("sw", e)}
          className={`${classeManiglia} -bottom-1 -left-1 cursor-nesw-resize`}
        />

        {/* Vertice 4: Basso-Destra (SE) */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Ridimensiona da basso destra"
          title="Trascina per allargare/abbassare"
          onMouseDown={(e) => iniziaResize("se", e)}
          className={`${classeManiglia} -bottom-1 -right-1 cursor-nwse-resize`}
        />

        {renderingDocumento(false)}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="font-semibold text-foreground">
              Visualizzazione documento ({lato})
            </span>
            {controlliBarra}
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
            {renderingDocumento(true)}
          </div>
        </div>
      )}
    </div>
  );
}

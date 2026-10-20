/*
 * File:      CatturaOcr.tsx
 * Percorso:  src/components/CatturaOcr.tsx
 * Visualizzatore interattivo documenti (PDF e foto) con rotazione oraria a scatti di 90°,
 * navigazione a mano (Pan), Zoom e selezione a mirino con OCR locale nel browser.
 */
import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  RotateCw,
  Hand,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { renderizzaPaginaPdf } from "@/lib/pdf-pagine";
import { Button } from "@/components/ui/button";

interface Props {
  file: Blob | null;
  url?: string | null;
  isPdf: boolean;
  totPagine: number;
  etichettaCampo?: string | null;
  onTesto?: (testo: string) => void;
  onChiudiOcr?: () => void;
}

type Rett = { x: number; y: number; w: number; h: number };

let workerPromise: Promise<any> | null = null;
async function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then((T) => T.createWorker("ita+eng"));
  }
  return workerPromise;
}

/** Ruota una sorgente dataURL PNG di un angolo multiplo di 90° */
async function ruotaDataUrl(dataUrl: string, gradi: number): Promise<string> {
  const angolo = ((gradi % 360) + 360) % 360;
  if (angolo === 0) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const rad = (angolo * Math.PI) / 180;
      const swap = angolo === 90 || angolo === 270;
      canvas.width = swap ? img.naturalHeight || img.height : img.naturalWidth || img.width;
      canvas.height = swap ? img.naturalWidth || img.width : img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.imageSmoothingQuality = "high";
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -(img.naturalWidth || img.width) / 2, -(img.naturalHeight || img.height) / 2);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function CatturaOcr({
  file,
  url,
  isPdf,
  totPagine,
  etichettaCampo,
  onTesto,
  onChiudiOcr,
}: Props) {
  const [baseSrc, setBaseSrc] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [rotazione, setRotazione] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [modalita, setModalita] = useState<"pan" | "ocr">("pan");

  const [rett, setRett] = useState<Rett | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [caricamento, setCaricamento] = useState(false);

  const inizio = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // Se c'è un campo OCR attivo, imposta automaticamente la modalità Mirino
  useEffect(() => {
    if (etichettaCampo) {
      setModalita("ocr");
    }
  }, [etichettaCampo]);

  // Caricamento e renderizzazione della pagina (PDF o immagine)
  useEffect(() => {
    let annullato = false;
    let urlBlobCreato: string | null = null;

    async function carica() {
      setCaricamento(true);
      setBaseSrc(null);
      setSrc(null);
      try {
        let sorgenteBlob: Blob | null = file;
        if (!sorgenteBlob && url) {
          const res = await fetch(url);
          sorgenteBlob = await res.blob();
        }

        if (isPdf && sorgenteBlob) {
          const rendered = await renderizzaPaginaPdf(sorgenteBlob, pagina).catch(() => null);
          if (!annullato && rendered) {
            setBaseSrc(rendered);
            const rotato = await ruotaDataUrl(rendered, rotazione);
            if (!annullato) setSrc(rotato);
          }
        } else if (sorgenteBlob) {
          urlBlobCreato = URL.createObjectURL(sorgenteBlob);
          if (!annullato) {
            setBaseSrc(urlBlobCreato);
            const rotato = await ruotaDataUrl(urlBlobCreato, rotazione);
            if (!annullato) setSrc(rotato);
          }
        } else if (url && !annullato) {
          setBaseSrc(url);
          const rotato = await ruotaDataUrl(url, rotazione);
          if (!annullato) setSrc(rotato);
        }
      } catch (err) {
        console.error("Errore nel rendering anteprima:", err);
      } finally {
        if (!annullato) setCaricamento(false);
      }
    }

    carica();

    return () => {
      annullato = true;
      if (urlBlobCreato) URL.revokeObjectURL(urlBlobCreato);
    };
  }, [file, url, isPdf, pagina]);

  // Rotazione a scatti di +90° in senso orario
  async function ruotaOrario() {
    const nuovaRot = (rotazione + 90) % 360;
    setRotazione(nuovaRot);
    if (!baseSrc) return;
    setCaricamento(true);
    try {
      const rotato = await ruotaDataUrl(baseSrc, nuovaRot);
      setSrc(rotato);
    } finally {
      setCaricamento(false);
    }
  }

  function resetVista() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // Calcolo coordinate normalizzate rispetto all'immagine interna
  function pos(e: React.PointerEvent) {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const r = img.getBoundingClientRect();
    const cx = Math.max(0, Math.min(r.width, e.clientX - r.left));
    const cy = Math.max(0, Math.min(r.height, e.clientY - r.top));
    return {
      x: cx / zoom,
      y: cy / zoom,
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (modalita === "pan") {
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } else {
      const p = pos(e);
      inizio.current = p;
      setRett({ x: p.x, y: p.y, w: 0, h: 0 });
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (modalita === "pan" && dragging.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    } else if (modalita === "ocr" && inizio.current) {
      const p = pos(e);
      const s = inizio.current;
      setRett({
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
      });
    }
  }

  async function handlePointerUp() {
    if (modalita === "pan") {
      dragging.current = false;
      return;
    }

    const r = rett;
    inizio.current = null;
    const img = imgRef.current;
    if (!r || !img || r.w < 5 || r.h < 5) {
      setRett(null);
      return;
    }

    const kx = img.naturalWidth / img.clientWidth;
    const ky = img.naturalHeight / img.clientHeight;
    const canvas = document.createElement("canvas");
    const scala = 2;
    canvas.width = r.w * kx * scala;
    canvas.height = r.h * ky * scala;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, r.x * kx, r.y * ky, r.w * kx, r.h * ky, 0, 0, canvas.width, canvas.height);

    setOccupato(true);
    try {
      const worker = await getWorker();
      const { data } = await worker.recognize(canvas);
      if (onTesto) {
        onTesto(String(data.text ?? "").replace(/\s+/g, " ").trim());
      }
    } catch {
      if (onTesto) onTesto("");
    } finally {
      setOccupato(false);
      setRett(null);
    }
  }

  return (
    <div className="w-full h-full min-h-[520px] flex flex-col bg-muted/20 select-none">
      {/* Barra degli strumenti superiore */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background/80 p-2 text-xs">
        {/* Gruppo Sinistra: Paginazione + Rotazione + Modalità Pan / OCR */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isPdf && totPagine > 1 && (
            <div className="flex items-center gap-1 border-r pr-2 mr-1">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
                title="Pagina precedente"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-mono px-1">
                {pagina}/{totPagine}
              </span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7"
                disabled={pagina >= totPagine}
                onClick={() => setPagina((p) => p + 1)}
                title="Pagina successiva"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          {/* Un solo pulsante ruota a destra a scatti di 90° */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={ruotaOrario}
            title="Ruota di 90° in senso orario (clicca per ruotare ancora)"
            className="gap-1.5 h-7 px-2.5 text-xs font-medium"
          >
            <RotateCw className="size-3.5" />
            <span>Ruota 90°</span>
            {rotazione > 0 && (
              <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary">
                {rotazione}°
              </span>
            )}
          </Button>

          {/* Modalità Sposta (Manina Pan) */}
          <Button
            type="button"
            size="sm"
            variant={modalita === "pan" ? "default" : "outline"}
            onClick={() => setModalita("pan")}
            title="Modalità Mano (Pan): trascina il documento per spostarlo"
            className="gap-1.5 h-7 px-2.5 text-xs font-medium"
          >
            <Hand className="size-3.5" />
            <span>Mano (Pan)</span>
          </Button>

          {/* Modalità Selezione Mirino OCR */}
          <Button
            type="button"
            size="sm"
            variant={modalita === "ocr" ? "default" : "outline"}
            onClick={() => setModalita("ocr")}
            title="Modalità Mirino: trascina un rettangolo sul testo per catturarlo"
            className="gap-1.5 h-7 px-2.5 text-xs font-medium"
          >
            <Crosshair className="size-3.5" />
            <span>Mirino OCR</span>
          </Button>
        </div>

        {/* Gruppo Destra: Zoom */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-7"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            title="Riduci zoom"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="w-12 text-center font-mono text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-7"
            onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
            title="Aumenta zoom"
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-7"
            onClick={resetVista}
            title="Reimposta vista (100% e centrata)"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Banner se il mirino OCR è attivo su un campo specifico */}
      {modalita === "ocr" && (
        <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary">
          <span>
            {etichettaCampo ? (
              <>
                Trascina un rettangolo sul testo da copiare nel campo: <b>{etichettaCampo}</b>
              </>
            ) : (
              "Trascina un rettangolo sul testo per riconoscerlo"
            )}
          </span>
          {onChiudiOcr && (
            <button
              type="button"
              onClick={() => {
                setModalita("pan");
                onChiudiOcr();
              }}
              className="text-muted-foreground hover:text-foreground"
              title="Esci dalla selezione OCR"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Area principale del visualizzatore con Pan e Zoom */}
      <div className="relative flex-1 min-h-[480px] overflow-hidden flex items-center justify-center p-3">
        {caricamento || !src ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-7 animate-spin text-primary" />
            <span className="text-xs">Caricamento documento in corso...</span>
          </div>
        ) : (
          <div
            className={`relative inline-block transition-transform duration-75 ${
              modalita === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
            }`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Documento attestato"
              draggable={false}
              className="max-h-[65vh] w-auto max-w-full block shadow-md select-none pointer-events-none"
            />

            {/* Rettangolo di selezione OCR */}
            {rett && modalita === "ocr" && (
              <div
                className="absolute border-2 border-primary bg-primary/25 pointer-events-none"
                style={{
                  left: rett.x,
                  top: rett.y,
                  width: rett.w,
                  height: rett.h,
                }}
              />
            )}

            {/* Overlay di elaborazione OCR */}
            {occupato && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center gap-2 text-sm font-medium">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span>Lettura testo dal rettangolo...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * File:      CatturaOcr.tsx
 * Percorso:  src/components/CatturaOcr.tsx
 * Visualizzatore interattivo documenti (PDF e foto) con rotazione oraria a scatti di 90°,
 * navigazione a mano (Pan), Zoom e selezione a mirino con OCR locale nel browser.
 *
 * Qui c'è solo il coordinamento; le parti sono in src/components/cattura-ocr/:
 *  - hooks/useCaricamentoDocumento  caricamento, pagina PDF e rotazione
 *  - hooks/useVistaPanZoom          zoom e spostamento
 *  - hooks/useSelezioneOcr          rettangolo del mirino e lettura del testo
 *  - BarraStrumenti, BannerMirino, AreaVisualizzatore   parti visive
 */
import { useEffect, useRef, useState } from "react";
import { BarraStrumenti } from "./cattura-ocr/BarraStrumenti";
import { BannerMirino } from "./cattura-ocr/BannerMirino";
import { AreaVisualizzatore } from "./cattura-ocr/AreaVisualizzatore";
import { useCaricamentoDocumento } from "./cattura-ocr/hooks/useCaricamentoDocumento";
import { useVistaPanZoom } from "./cattura-ocr/hooks/useVistaPanZoom";
import { useSelezioneOcr } from "./cattura-ocr/hooks/useSelezioneOcr";
import type { ModalitaVista } from "./cattura-ocr/types";

interface Props {
  file: Blob | null;
  url?: string | null;
  isPdf: boolean;
  totPagine: number;
  etichettaCampo?: string | null;
  onTesto?: (testo: string) => void;
  onChiudiOcr?: () => void;
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
  const [pagina, setPagina] = useState(1);
  const [modalita, setModalita] = useState<ModalitaVista>("pan");
  const imgRef = useRef<HTMLImageElement>(null);

  const { src, rotazione, caricamento, ruotaOrario } = useCaricamentoDocumento({
    file,
    url,
    isPdf,
    pagina,
  });
  const vista = useVistaPanZoom();
  const selezione = useSelezioneOcr({ imgRef, zoom: vista.zoom, onTesto });

  // Se c'è un campo OCR attivo, imposta automaticamente la modalità Mirino
  useEffect(() => {
    if (etichettaCampo) {
      setModalita("ocr");
    }
  }, [etichettaCampo]);

  function handlePointerDown(e: React.PointerEvent) {
    if (modalita === "pan") vista.iniziaPan(e);
    else selezione.iniziaSelezione(e);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (modalita === "pan") vista.muoviPan(e);
    else selezione.aggiornaSelezione(e);
  }

  async function handlePointerUp() {
    if (modalita === "pan") {
      vista.finisciPan();
      return;
    }
    await selezione.concludiSelezione();
  }

  return (
    <div className="w-full h-full min-h-[520px] flex flex-col bg-muted/20 select-none">
      <BarraStrumenti
        isPdf={isPdf}
        totPagine={totPagine}
        pagina={pagina}
        onPagina={setPagina}
        rotazione={rotazione}
        onRuota={ruotaOrario}
        modalita={modalita}
        onModalita={setModalita}
        zoom={vista.zoom}
        onRiduciZoom={vista.riduciZoom}
        onAumentaZoom={vista.aumentaZoom}
        onResetVista={vista.resetVista}
      />

      {/* Banner se il mirino OCR è attivo su un campo specifico */}
      {modalita === "ocr" && (
        <BannerMirino
          etichettaCampo={etichettaCampo}
          onChiudi={
            onChiudiOcr
              ? () => {
                  setModalita("pan");
                  onChiudiOcr();
                }
              : undefined
          }
        />
      )}

      <AreaVisualizzatore
        src={src}
        caricamento={caricamento}
        modalita={modalita}
        pan={vista.pan}
        zoom={vista.zoom}
        imgRef={imgRef}
        rett={selezione.rett}
        occupato={selezione.occupato}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}

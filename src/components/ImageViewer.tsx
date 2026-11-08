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
 *   - Rev 8 (2026-11-07): Diviso in file per responsabilità (cartella image-viewer/): rotazione, ridimensionamento, controlli, maniglie e pannelli. Nessun cambio di comportamento.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { risolviDocumentoAttestato, type RisoluzioneDocumento } from "@/lib/api/cartelle-multiple";
import {
  autorizzaCartelle,
  collegaCartella,
  leggiStatoCartelle,
  type StatoCartelle,
} from "@/lib/api/stato-cartelle";
import { avvisoPopupBloccato } from "@/features/cartelle/avvisi-cartella";
import { ruotaDataUrl } from "./image-viewer/ruota-immagine";
import { useRidimensionaVisore } from "./image-viewer/useRidimensionaVisore";
import { ControlliVisore } from "./image-viewer/ControlliVisore";
import { ManiglieVisore } from "./image-viewer/ManiglieVisore";
import { PannelloFileNonTrovato, PannelloNessunDocumento } from "./image-viewer/PannelliDocumento";

export function ImageViewer({ fronte, retro }: { fronte: string | null; retro: string | null }) {
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
  const { altezzaCustom, larghezzaCustom, containerRef, iniziaResize, reimpostaDimensioni } =
    useRidimensionaVisore();

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
    <ControlliVisore
      rotazione={rotazione}
      inRotazione={inRotazione}
      zoom={zoom}
      haUrl={Boolean(esitoAttuale?.url)}
      fullscreen={fullscreen}
      onRuota={() => setRotazione((r) => (r + 90) % 360)}
      onZoomMeno={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
      onZoomPiu={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
      onReimposta={() => {
        setZoom(1);
        setRotazione(0);
        reimpostaDimensioni();
      }}
      onApriEsterno={handleApriEsterno}
      onToggleFullscreen={() => setFullscreen((v) => !v)}
    />
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
      return (
        <PannelloFileNonTrovato
          percorsoGrezzo={percorsoGrezzo}
          nomeFile={esitoAttuale?.nomeFile}
          statoCartelle={statoCartelle}
          inConnessione={inConnessione}
          onAutorizza={handleAutorizzaCartelle}
          onCollega={handleCollegaNuovaCartella}
          onRicontrolla={() => void caricaDocumenti()}
        />
      );
    }

    // Caso 2: Nessun documento registrato o link rimosso
    return <PannelloNessunDocumento />;
  };

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
                lato === l
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
        <ManiglieVisore onResize={iniziaResize} />

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

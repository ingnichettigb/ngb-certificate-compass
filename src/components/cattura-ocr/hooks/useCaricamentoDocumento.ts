/*
 * File:      useCaricamentoDocumento.ts
 * Percorso:  src/components/cattura-ocr/hooks/useCaricamentoDocumento.ts
 * Carica il documento (PDF o foto), ne rende la pagina scelta e gestisce la rotazione a scatti di 90°.
 */
import { useEffect, useState } from "react";
import { renderizzaPaginaPdf } from "@/lib/pdf-pagine";
import { ruotaDataUrl } from "../ruota-immagine";

interface Opzioni {
  file: Blob | null;
  url?: string | null | undefined;
  isPdf: boolean;
  pagina: number;
}

export function useCaricamentoDocumento({ file, url, isPdf, pagina }: Opzioni) {
  const [baseSrc, setBaseSrc] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [rotazione, setRotazione] = useState(0);
  const [caricamento, setCaricamento] = useState(false);

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
    // La rotazione corrente si legge qui ma non rilancia il caricamento: la cambia ruotaOrario().
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return { src, rotazione, caricamento, ruotaOrario };
}

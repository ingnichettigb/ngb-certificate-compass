/*
 * File:      useLinkModulo.ts
 * Percorso:  src/features/home/hooks/useLinkModulo.ts
 * Link del modulo lavoratore: indirizzo, QR code e pulsante «Copia link».
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function useLinkModulo() {
  const [qr, setQr] = useState<string>("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/carica`;
    setLink(url);
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setQr);
  }, []);

  /** Copia il link negli appunti e mostra «Copiato» per un istante. */
  function copiaLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return { qr, link, copied, copiaLink };
}

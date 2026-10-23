/*
 * File:      useQrModuloLavoratore.ts
 * Percorso:  src/features/home/hooks/useQrModuloLavoratore.ts
 * Link del modulo lavoratore (/carica), relativo QR code e stato "Copiato".
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function useQrModuloLavoratore() {
  const [qr, setQr] = useState<string>("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/carica`;
    setLink(url);
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setQr);
  }, []);

  function copiaLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return { qr, link, copied, copiaLink };
}

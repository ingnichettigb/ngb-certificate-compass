/*
 * File: LogoDitta.tsx
 * Percorso: src/features/impostazioni/ditta/LogoDitta.tsx
 * Data creazione: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 06:53 — Carica/cancella logo aziendale, convertito in PNG per tutte le stampe.
 */
import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logoDitta, nomeDitta } from "@/lib/identita-ditta";
import type { DittaRecord } from "@/lib/api/ditta";
import type { AggiornaCampo } from "./tipi-ditta-tab";

export function LogoDitta({ form, updateCampo }: { form: DittaRecord; updateCampo: AggiornaCampo }) {
  const input = useRef<HTMLInputElement>(null);
  const [caricando, setCaricando] = useState(false);
  const logo = logoDitta(form);
  const carica = async (file?: File) => {
    if (!file) return;
    setCaricando(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scala = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scala));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scala));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Impossibile leggere il logo");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      updateCampo("logo_data_url", canvas.toDataURL("image/png"));
    } catch {
      toast.error("Impossibile caricare il logo: scegli un'immagine PNG, JPG o WebP valida.");
    } finally {
      URL.revokeObjectURL(url);
      setCaricando(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
      {logo && <img src={logo} alt={`Logo ${nomeDitta(form)}`} className="h-16 max-w-48 object-contain" />}
      <input ref={input} aria-label="File logo aziendale" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void carica(e.target.files?.[0])} />
      <Button type="button" variant="outline" size="sm" disabled={caricando} onClick={() => input.current?.click()} title="Scegli il logo aziendale">
        <ImagePlus className="size-4" />{caricando ? "Caricamento…" : "Carica logo"}
      </Button>
      <Button type="button" variant="destructive" size="sm" disabled={!logo || caricando} onClick={() => updateCampo("logo_data_url", null)} title="Rimuovi il logo dall'anagrafica">
        <Trash2 className="size-4" />Cancella logo
      </Button>
    </div>
  );
}
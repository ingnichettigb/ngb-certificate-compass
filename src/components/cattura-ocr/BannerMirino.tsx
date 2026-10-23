/*
 * File:      BannerMirino.tsx
 * Percorso:  src/components/cattura-ocr/BannerMirino.tsx
 * Avviso mostrato quando il mirino OCR è attivo, con il campo di destinazione e il pulsante di uscita.
 */
import { X } from "lucide-react";

interface Props {
  etichettaCampo?: string | null | undefined;
  onChiudi?: (() => void) | undefined;
}

export function BannerMirino({ etichettaCampo, onChiudi }: Props) {
  return (
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
      {onChiudi && (
        <button
          type="button"
          onClick={onChiudi}
          className="text-muted-foreground hover:text-foreground"
          title="Esci dalla selezione OCR"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

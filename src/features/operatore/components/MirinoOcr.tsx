/*
 * File:      MirinoOcr.tsx
 * Percorso:  src/features/operatore/components/MirinoOcr.tsx
 * Pulsante a mirino accanto a un campo: attiva la cattura OCR di quel campo.
 */
import { Crosshair } from "lucide-react";
import { ETICHETTE_OCR } from "../ocr-testo";
import type { CampoOcr } from "../types";

export function MirinoOcr({
  campo,
  campoAttivo,
  disabled,
  onToggle,
}: {
  campo: CampoOcr;
  campoAttivo: CampoOcr | null;
  disabled: boolean;
  onToggle: (campo: CampoOcr | null) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(campoAttivo === campo ? null : campo)}
      title={`Cattura ${ETICHETTE_OCR[campo]} dal documento`}
      className={`ml-1 inline-grid size-6 place-items-center rounded align-middle disabled:opacity-30 ${
        campoAttivo === campo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Crosshair className="size-3.5" />
    </button>
  );
}

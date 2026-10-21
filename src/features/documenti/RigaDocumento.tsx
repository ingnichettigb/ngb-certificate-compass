/*
 * File:      RigaDocumento.tsx
 * Percorso:  src/features/documenti/RigaDocumento.tsx
 * Una riga dell'elenco attestati: nome, tipo, scadenza e pulsanti apri/elimina.
 */
import { Download, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatData, scadenzaBadgeClass, statoScadenza, type DocumentoAttestato } from "@/lib/api";

export function RigaDocumento({
  doc,
  onApri,
  onElimina,
}: {
  doc: DocumentoAttestato;
  onApri: () => void;
  onElimina: () => void;
}) {
  const stato = statoScadenza(doc.data_scadenza);
  return (
    <li className="flex items-center gap-3 px-3 py-2 text-sm">
      <FileText className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{doc.nome_file}</p>
        <p className="text-xs text-muted-foreground">
          {doc.tipo_personalizzato || doc.tipo_attestato}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${scadenzaBadgeClass(stato)}`}
      >
        {formatData(doc.data_scadenza)}
      </span>
      <Button variant="ghost" size="icon" onClick={() => onApri()} aria-label="Apri PDF">
        <Download className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onElimina()}
        aria-label="Elimina PDF"
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </li>
  );
}

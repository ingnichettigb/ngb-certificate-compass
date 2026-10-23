/*
 * File:      PannelloDocumento.tsx
 * Percorso:  src/features/operatore/components/PannelloDocumento.tsx
 * Anteprima del documento caricato, con il mirino OCR e l'indicatore di lettura AI.
 */
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CatturaOcr } from "@/components/CatturaOcr";
import { ETICHETTE_OCR } from "../ocr-testo";
import type { CampoOcr } from "../types";

export function PannelloDocumento({
  file,
  anteprima,
  anteprimaMime,
  totPagine,
  lettura,
  nomeAi,
  campoOcr,
  onTesto,
  onFile,
}: {
  file: File | null;
  anteprima: string | null;
  anteprimaMime: string | null;
  totPagine: number;
  lettura: boolean;
  nomeAi: string;
  campoOcr: CampoOcr | null;
  onTesto: (testo: string) => void;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [trascinamento, setTrascinamento] = useState(false);

  function gestisciCambioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      onFile(f);
      e.target.value = "";
    }
  }

  function gestisciDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setTrascinamento(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      onFile(f);
    }
  }

  function gestisciDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!trascinamento) setTrascinamento(true);
  }

  function gestisciDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setTrascinamento(false);
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium">Documento caricato</CardTitle>
        <div className="flex items-center gap-2">
          {anteprima && (
            <>
              <span
                className="text-xs text-muted-foreground truncate max-w-[200px]"
                title={file?.name ?? "Attestato caricato"}
              >
                {file?.name ?? "Attestato caricato"} {totPagine > 0 && `(${totPagine} pag.)`}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 px-2.5"
                onClick={() => inputRef.current?.click()}
                title="Carica o sostituisci documento"
              >
                <Upload className="size-3.5" /> Cambia
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent
        className={`p-0 flex-1 min-h-[520px] flex items-center justify-center bg-muted/20 relative transition-colors ${
          trascinamento ? "bg-primary/10 ring-2 ring-primary ring-inset" : ""
        }`}
        onDragOver={gestisciDragOver}
        onDragLeave={gestisciDragLeave}
        onDrop={gestisciDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={gestisciCambioFile}
        />

        {lettura && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Lettura attestato con {nomeAi}...</p>
          </div>
        )}

        {anteprima && file ? (
          <CatturaOcr
            file={file}
            isPdf={anteprimaMime === "application/pdf"}
            totPagine={totPagine}
            etichettaCampo={campoOcr ? ETICHETTE_OCR[campoOcr] : ""}
            onTesto={onTesto}
          />
        ) : anteprima ? (
          anteprimaMime === "application/pdf" ? (
            <iframe src={anteprima} className="w-full h-full min-h-[500px] border-none" title="Anteprima PDF" />
          ) : (
            <img src={anteprima} alt="Anteprima" className="max-h-[550px] object-contain p-2" />
          )
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full h-full min-h-[520px] p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="size-16 rounded-full bg-muted/60 flex items-center justify-center group-hover:scale-105 group-hover:bg-primary/10 group-hover:text-primary transition-all">
              <Upload className="size-8 opacity-70 group-hover:opacity-100" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                Fai clic qui per selezionare il file
              </p>
              <p className="text-xs text-muted-foreground">
                oppure trascina qui un PDF o un'immagine (JPG, PNG)
              </p>
            </div>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

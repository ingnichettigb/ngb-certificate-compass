/*
 * File:      PannelloDocumento.tsx
 * Percorso:  src/features/operatore/components/PannelloDocumento.tsx
 * Anteprima del documento caricato, con il mirino OCR e l'indicatore di lettura AI.
 */
import { FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}: {
  file: File | null;
  anteprima: string | null;
  anteprimaMime: string | null;
  totPagine: number;
  lettura: boolean;
  nomeAi: string;
  campoOcr: CampoOcr | null;
  onTesto: (testo: string) => void;
}) {
  return (
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Documento caricato</CardTitle>
            {anteprima && (
              <span className="text-xs text-muted-foreground">
                {file?.name ?? "Attestato caricato"} {totPagine > 0 && `(${totPagine} pag.)`}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-[520px] flex items-center justify-center bg-muted/20 relative">
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
              <div className="text-center p-6 text-muted-foreground">
                <FileText className="size-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Trascina o carica un file PDF o una foto per iniziare</p>
              </div>
            )}
          </CardContent>
        </Card>
  );
}

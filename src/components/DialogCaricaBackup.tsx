/*
 * File:      DialogCaricaBackup.tsx
 * Percorso:  src/components/DialogCaricaBackup.tsx
 * Data creaz: 26/10/2026
 * Revisioni:
 *   rev 1 — 26/10/2026 17:30 — Finestra interna con scansione esclusiva file 030ArchAttestati_.
 */
import { useState, useRef } from "react";
import { FolderOpen, FileText, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  elencaBackupDaCartella,
  importaDb,
  InfoFileBackup,
  PREFISSO_BACKUP,
} from "@/lib/api";

interface Props {
  aperto: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

export function DialogCaricaBackup({ aperto, onOpenChange, onImported }: Props) {
  const [lista, setLista] = useState<InfoFileBackup[]>([]);
  const [nomeCartella, setNomeCartella] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [ripristinoInCorso, setRipristinoInCorso] = useState(false);
  const inputSingoloRef = useRef<HTMLInputElement>(null);

  async function scegliCartella() {
    const w = window as unknown as {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    };
    if (!w.showDirectoryPicker) {
      toast.error("Browser non supportato", {
        description: "Usa Chrome o Edge per selezionare direttamente la cartella.",
      });
      return;
    }
    try {
      setCaricando(true);
      const dirHandle = await w.showDirectoryPicker();
      setNomeCartella(dirHandle.name);
      const trovati = await elencaBackupDaCartella(dirHandle);
      setLista(trovati);
      if (trovati.length === 0) {
        toast.info("Nessun backup trovato", {
          description: `Nessun file con prefisso '${PREFISSO_BACKUP}' trovato in '${dirHandle.name}'.`,
        });
      }
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") {
        toast.error("Errore lettura cartella", { description: String(e) });
      }
    } finally {
      setCaricando(false);
    }
  }

  async function eseguiRipristino(file: File) {
    setRipristinoInCorso(true);
    try {
      const res = await importaDb(file);
      toast.success("Backup ripristinato con successo", {
        description: `${res.dipCount} dipendenti e ${res.attCount} attestati importati.`,
      });
      onImported?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Ripristino fallito", { description: String(e) });
    } finally {
      setRipristinoInCorso(false);
    }
  }

  async function selezionaDaLista(info: InfoFileBackup) {
    if (!info.fileHandle) return;
    const file = await info.fileHandle.getFile();
    await eseguiRipristino(file);
  }

  return (
    <Dialog open={aperto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-primary" />
            Carica Database da Backup
          </DialogTitle>
          <DialogDescription>
            Visualizza esclusivamente i salvataggi con prefisso{" "}
            <code className="text-primary font-semibold">{PREFISSO_BACKUP}</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Sezione selezione cartella */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
            <div>
              <p className="text-sm font-medium">Cartella di ricerca backup</p>
              <p className="text-xs text-muted-foreground">
                {nomeCartella ? `Cartella: ${nomeCartella}` : "Nessuna cartella selezionata"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={scegliCartella} disabled={caricando || ripristinoInCorso}>
              {caricando ? <Loader2 className="size-4 animate-spin mr-1" /> : <FolderOpen className="size-4 mr-1" />}
              {nomeCartella ? "Cambia cartella" : "Seleziona cartella"}
            </Button>
          </div>

          {/* Elenco dei file trovati filtrati */}
          {lista.length > 0 ? (
            <div className="border rounded-lg p-2">
              <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                Trovati {lista.length} file di backup compatibili (ordinati dal più recente):
              </p>
              <ScrollArea className="max-h-60">
                <div className="space-y-1.5 p-1">
                  {lista.map((item, index) => (
                    <div
                      key={item.nome}
                      className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted border border-transparent hover:border-border transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 pr-2">
                        <FileText className="size-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium truncate">{item.nome}</span>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary">
                                Più recente
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.dataFormattata} · {item.dimensioneKb} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => selezionaDaLista(item)}
                        disabled={ripristinoInCorso}
                        className="shrink-0"
                      >
                        {ripristinoInCorso ? <Loader2 className="size-3.5 animate-spin" /> : "Ripristina"}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : nomeCartella ? (
            <div className="text-center py-6 border border-dashed rounded-lg text-sm text-muted-foreground">
              Nessun backup con prefisso {PREFISSO_BACKUP} presente in questa cartella.
            </div>
          ) : null}

          {/* Opzione alternativa: selezione manuale singolo file */}
          <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>Oppure seleziona un singolo file dal disco:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => inputSingoloRef.current?.click()}
              disabled={ripristinoInCorso}
              className="text-xs"
            >
              Sfoglia singolo file...
            </Button>
            <input
              ref={inputSingoloRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) eseguiRipristino(f);
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

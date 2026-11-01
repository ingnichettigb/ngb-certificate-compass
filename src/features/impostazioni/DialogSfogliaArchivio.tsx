/*
 * File:          DialogSfogliaArchivio.tsx
 * Percorso:      src/features/impostazioni/DialogSfogliaArchivio.tsx
 * Data creazione: 2026-11-01
 * Revisioni:
 *   rev 1 — 01/11/2026 12:20 — Finestra per sfogliare l'archivio locale/rete, aprire i PDF e copiare il percorso.
 */
import { useEffect, useState } from "react";
import {
  FolderOpen,
  Folder,
  FileText,
  Search,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  FolderSync,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  cercaFileRicorsivo,
  apriFileLocale,
  verificaPermessi,
  formattaDimensione,
  type FileTrovato,
} from "@/lib/api/cartella-locale";
import { elencoCartelle, type CartellaCollegata } from "@/lib/api/cartelle-multiple";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartellaSelezionataId?: string;
};

export function DialogSfogliaArchivio({ open, onOpenChange, cartellaSelezionataId }: Props) {
  const [cartelle, setCartelle] = useState<CartellaCollegata[]>([]);
  const [attivaId, setAttivaId] = useState<string>("");
  const [files, setFiles] = useState<FileTrovato[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiato, setCopiato] = useState(false);
  const [haPermesso, setHaPermesso] = useState(true);

  // Carica l'elenco cartelle collegate all'apertura
  useEffect(() => {
    if (!open) return;
    async function init() {
      const elenco = await elencoCartelle();
      setCartelle(elenco);
      const iniziale = cartellaSelezionataId || elenco[0]?.id || "";
      setAttivaId(iniziale);
    }
    init();
  }, [open, cartellaSelezionataId]);

  const cartellaAttiva = cartelle.find((c) => c.id === attivaId) || cartelle[0];

  // Scansiona i file della cartella attiva
  useEffect(() => {
    if (!open || !cartellaAttiva) return;
    const attiva = cartellaAttiva;
    async function carica() {
      setLoading(true);
      try {
        const ok = await verificaPermessi(attiva.handle, false, "read");
        setHaPermesso(ok);
        if (ok) {
          const trovati = await cercaFileRicorsivo(attiva.handle, "", "", [], 0, 6, 150);
          setFiles(trovati.sort((a, b) => b.dataModifica.getTime() - a.dataModifica.getTime()));
        } else {
          setFiles([]);
        }
      } catch {
        setFiles([]);
      } finally {
        setLoading(false);
      }
    }
    carica();
  }, [open, attivaId, cartellaAttiva]);

  async function handleAutorizza() {
    if (!cartellaAttiva) return;
    const ok = await verificaPermessi(cartellaAttiva.handle, true, "read");
    setHaPermesso(ok);
    if (ok) {
      setLoading(true);
      const trovati = await cercaFileRicorsivo(cartellaAttiva.handle, "", "", [], 0, 6, 150);
      setFiles(trovati.sort((a, b) => b.dataModifica.getTime() - a.dataModifica.getTime()));
      setLoading(false);
    }
  }

  function copiaPercorso() {
    const testoDaCopiare = cartellaAttiva?.percorso || cartellaAttiva?.nome || "";
    if (!testoDaCopiare) return;
    navigator.clipboard.writeText(testoDaCopiare);
    setCopiato(true);
    toast.success("Percorso copiato negli appunti!", {
      description: "Puoi incollarlo nella barra degli indirizzi di Esplora File (Windows + E).",
    });
    setTimeout(() => setCopiato(false), 2000);
  }

  const filesFiltrati = filtro.trim()
    ? files.filter((f) => f.nome.toLowerCase().includes(filtro.toLowerCase()))
    : files;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FolderOpen className="size-5 text-primary" /> Sfoglia Cartella Archivio Attestati
          </DialogTitle>
        </DialogHeader>

        {/* Se sono più cartelle: selettore a schede/pulsanti in alto */}
        {cartelle.length > 1 && (
          <div className="flex gap-2 p-3 bg-muted/30 border-b overflow-x-auto text-xs">
            <span className="font-semibold py-1 px-1 text-muted-foreground shrink-0">Cartelle collegate:</span>
            {cartelle.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={c.id === attivaId ? "default" : "outline"}
                className={`h-7 text-xs gap-1.5 shrink-0 ${
                  c.id === attivaId ? "bg-primary text-primary-foreground" : ""
                }`}
                onClick={() => setAttivaId(c.id)}
              >
                <Folder className="size-3.5" />
                <span>{c.nome}</span>
                {c.principale && <span className="opacity-75">(principale)</span>}
              </Button>
            ))}
          </div>
        )}

        {/* Barra percorso cartella attiva con tasto Copia */}
        <div className="p-3 bg-muted/20 border-b flex items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium">Percorso salvataggio archivio:</div>
            <div className="font-mono text-foreground font-semibold truncate select-all">
              {cartellaAttiva?.percorso || cartellaAttiva?.nome || "Cartella non configurata"}
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 shrink-0 h-8" onClick={copiaPercorso}>
            {copiato ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            <span>Copia percorso</span>
          </Button>
        </div>

        {/* Ricerca e conteggio file */}
        <div className="p-3 border-b flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Cerca attestato o sottocartella per nome…"
              className="pl-8 h-9 text-xs"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {loading ? "Scansione in corso…" : `${filesFiltrati.length} file trovati`}
          </span>
        </div>

        {/* Elenco file contenuti nella cartella */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin" /> Lettura della cartella in corso…
            </div>
          ) : !haPermesso ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                L'accesso a questa cartella richiede una conferma del browser per motivi di sicurezza.
              </p>
              <Button size="sm" onClick={handleAutorizza} className="gap-2">
                <FolderSync className="size-4" /> Autorizza lettura cartella
              </Button>
            </div>
          ) : filesFiltrati.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {filtro ? "Nessun file corrisponde alla ricerca." : "Nessun documento PDF trovato in questa cartella."}
            </div>
          ) : (
            <ul className="divide-y rounded-md border text-xs">
              {filesFiltrati.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 p-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="size-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">{f.nome}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{f.percorsoRelativo}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-muted-foreground">
                      {formattaDimensione(f.dimensione)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => apriFileLocale(f.handle)}
                    >
                      <ExternalLink className="size-3.5" /> Apri PDF
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

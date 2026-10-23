/*
 * File:      ArchivioTab.tsx
 * Percorso:  src/features/impostazioni/ArchivioTab.tsx
 * Scheda Impostazioni per la configurazione della cartella locale/rete di destinazione attestati.
 */
import { useEffect, useState } from "react";
import { FolderCheck, FolderSync, FolderX, FolderOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getCartellaArchivio,
  scegliCartellaLocale,
  dimenticaCartellaLocale,
  supportaCartellaLocale,
  verificaPermessi,
} from "@/lib/api/cartella-locale";

export function ArchivioTab() {
  const [supportato] = useState(() => supportaCartellaLocale());
  const [nomeCartella, setNomeCartella] = useState<string | null>(null);
  const [haPermesso, setHaPermesso] = useState<boolean | null>(null);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    async function controlla() {
      setCaricamento(true);
      try {
        const handle = await getCartellaArchivio(false);
        if (handle) {
          setNomeCartella(handle.name);
          const ok = await verificaPermessi(handle, false);
          setHaPermesso(ok);
        } else {
          setNomeCartella(null);
          setHaPermesso(null);
        }
      } catch {
        setNomeCartella(null);
      } finally {
        setCaricamento(false);
      }
    }
    controlla();
  }, []);

  async function handleScegli() {
    try {
      const scelta = await scegliCartellaLocale();
      if (scelta) {
        setNomeCartella(scelta.name);
        setHaPermesso(true);
        toast.success(`Cartella "${scelta.name}" impostata come archivio principale`);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Impossibile selezionare la cartella", { description: (e as Error).message });
      }
    }
  }

  async function handleRiconnetti() {
    try {
      const handle = await getCartellaArchivio(true);
      if (handle) {
        setHaPermesso(true);
        toast.success("Accesso alla cartella confermato");
      }
    } catch (e) {
      toast.error("Permesso non concesso", { description: (e as Error).message });
    }
  }

  async function handleRimuovi() {
    if (!window.confirm("Vuoi scollegare la cartella archivio da questa postazione?")) return;
    await dimenticaCartellaLocale();
    setNomeCartella(null);
    setHaPermesso(null);
    toast.info("Cartella archiviazione scollegata");
  }

  if (!supportato) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="size-5" /> Browser non compatibile con l'accesso alle cartelle locali
        </div>
        <p className="mt-1 text-muted-foreground">
          Per utilizzare il salvataggio e la ricerca diretta dei file sul computer o sulla rete, usa un browser basato su Chromium come <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-medium">Cartella Archivio Attestati (PC / Rete)</h4>
        <p className="text-sm text-muted-foreground">
          Imposta la cartella principale sul tuo computer o disco di rete in cui conservi i PDF degli attestati.
          All'interno puoi organizzare i file in sottocartelle liberamente: il sistema effettuerà le ricerche in modo ricorsivo su tutti i livelli.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        {caricamento ? (
          <p className="text-sm text-muted-foreground">Verifica impostazioni in corso…</p>
        ) : nomeCartella ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderCheck className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{nomeCartella}</span>
                    {haPermesso ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                        <CheckCircle2 className="size-3" /> Collegata
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                        <AlertCircle className="size-3" /> Permesso da rinnovare
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Cartella principale dell'archivio</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!haPermesso && (
                  <Button size="sm" variant="outline" onClick={handleRiconnetti}>
                    <FolderSync className="size-4" /> Autorizza accesso
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleScegli}>
                  Cambia
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleRimuovi}>
                  <FolderX className="size-4" /> Scollega
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p>✓ I file originali non vengono mai spostati o rinominati senza tua conferma.</p>
              <p>✓ La ricerca di un attestato scansiona sia questa cartella sia tutte le sottocartelle presenti.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FolderOpen className="size-6" />
            </div>
            <div>
              <p className="font-medium">Nessuna cartella archivio impostata</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                Seleziona la cartella sul tuo PC o sul server di rete per abilitare la ricerca rapida, l'apertura diretta e l'aggancio degli attestati.
              </p>
            </div>
            <Button onClick={handleScegli} className="gap-2">
              <FolderOpen className="size-4" /> Seleziona cartella archivio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

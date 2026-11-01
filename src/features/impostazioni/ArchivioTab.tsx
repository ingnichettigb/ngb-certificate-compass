/*
 * File:      ArchivioTab.tsx
 * Percorso:  src/features/impostazioni/ArchivioTab.tsx
 * Data creaz: 2026-10-24
 * Revisioni:
 *   rev 1 (2026-10-27 21:05): aggiunta sezione cartelle aggiuntive.
 *   rev 2 (2026-11-01 12:20): visualizzazione percorso completo di salvataggio, apertura al clic e dialog sfoglia.
 */
import { useEffect, useState } from "react";
import {
  FolderCheck,
  FolderSync,
  FolderX,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Edit2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartelleAggiuntive } from "./CartelleAggiuntive";
import { DialogSfogliaArchivio } from "./DialogSfogliaArchivio";
import { toast } from "sonner";
import {
  getCartellaArchivio,
  scegliCartellaLocale,
  dimenticaCartellaLocale,
  supportaCartellaLocale,
  verificaPermessi,
  salvaPercorsoTestuale,
  leggiPercorsoTestuale,
} from "@/lib/api/cartella-locale";

export function ArchivioTab() {
  const [supportato] = useState(() => supportaCartellaLocale());
  const [nomeCartella, setNomeCartella] = useState<string | null>(null);
  const [percorsoEsteso, setPercorsoEsteso] = useState<string>("");
  const [inModificaPercorso, setInModificaPercorso] = useState(false);
  const [tempPercorso, setTempPercorso] = useState("");
  const [haPermesso, setHaPermesso] = useState<boolean | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [dialogSfogliaAperto, setDialogSfogliaAperto] = useState(false);
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    async function controlla() {
      setCaricamento(true);
      try {
        const handle = await getCartellaArchivio(false);
        if (handle) {
          setNomeCartella(handle.name);
          const ok = await verificaPermessi(handle, false);
          setHaPermesso(ok);
          const salvato = await leggiPercorsoTestuale();
          setPercorsoEsteso(salvato || handle.name);
        } else {
          setNomeCartella(null);
          setPercorsoEsteso("");
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
        const percorsoAttuale = await leggiPercorsoTestuale();
        if (!percorsoAttuale) {
          await salvaPercorsoTestuale(scelta.name);
          setPercorsoEsteso(scelta.name);
        }
        toast.success(`Cartella "${scelta.name}" impostata come archivio principale`);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Impossibile selezionare la cartella", { description: (e as Error).message });
      }
    }
  }

  async function handleSalvaPercorso() {
    await salvaPercorsoTestuale(tempPercorso);
    setPercorsoEsteso(tempPercorso.trim() || nomeCartella || "");
    setInModificaPercorso(false);
    toast.success("Percorso salvato!");
  }

  function handleCopiaPercorso() {
    if (!percorsoEsteso) return;
    navigator.clipboard.writeText(percorsoEsteso);
    setCopiato(true);
    toast.success("Percorso copiato negli appunti!", {
      description: "Puoi incollarlo nella barra degli indirizzi di Windows (Win + E).",
    });
    setTimeout(() => setCopiato(false), 2000);
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
    setPercorsoEsteso("");
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setDialogSfogliaAperto(true)}
                  className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0 cursor-pointer"
                  title="Clicca per aprire e sfogliare la cartella"
                >
                  <FolderCheck className="size-6" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDialogSfogliaAperto(true)}
                      className="font-semibold text-base hover:text-primary transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                      title="Clicca per aprire la cartella"
                    >
                      <span>{nomeCartella}</span>
                      <ExternalLink className="size-3.5 opacity-60" />
                    </button>
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

                  {/* Visualizzazione percorso completo con copia e modifica */}
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground shrink-0">Percorso salvataggio:</span>
                    {inModificaPercorso ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          size={1}
                          className="h-7 text-xs font-mono"
                          placeholder="Es. C:\Archivio\ALLEGATO 14 o \\SERVER\Condivisione\..."
                          value={tempPercorso}
                          onChange={(e) => setTempPercorso(e.target.value)}
                        />
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSalvaPercorso}>
                          Salva
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setInModificaPercorso(false)}
                        >
                          Annulla
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span
                          onClick={() => setDialogSfogliaAperto(true)}
                          className="font-mono bg-muted/60 px-2 py-0.5 rounded text-foreground truncate cursor-pointer hover:bg-muted"
                          title="Clicca per aprire la cartella"
                        >
                          {percorsoEsteso}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          title="Copia percorso"
                          onClick={handleCopiaPercorso}
                        >
                          {copiato ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          title="Modifica percorso esteso di rete/disco"
                          onClick={() => {
                            setTempPercorso(percorsoEsteso);
                            setInModificaPercorso(true);
                          }}
                        >
                          <Edit2 className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 bg-primary/15 text-primary border border-primary/40 hover:bg-primary hover:text-primary-foreground font-semibold"
                  onClick={() => setDialogSfogliaAperto(true)}
                >
                  <FolderOpen className="size-4" /> Apri e Sfoglia
                </Button>
                {!haPermesso && (
                  <Button size="sm" variant="outline" onClick={handleRiconnetti}>
                    <FolderSync className="size-4" /> Autorizza
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleScegli}>
                  Cambia
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={handleRimuovi}
                >
                  <FolderX className="size-4" /> Scollega
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p>✓ Cliccando sulla cartella o sul percorso puoi visualizzare direttamente tutti i file contenuti.</p>
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

      {nomeCartella && <CartelleAggiuntive onSfoglia={() => setDialogSfogliaAperto(true)} />}

      <DialogSfogliaArchivio
        open={dialogSfogliaAperto}
        onOpenChange={setDialogSfogliaAperto}
        cartellaSelezionataId="principale"
      />
    </div>
  );
}

/*
 * File:      DialogCercaAgganciaAttestato.tsx
 * Percorso:  src/features/dipendenti/components/DialogCercaAgganciaAttestato.tsx
 * Dialog di ricerca ricorsiva nelle cartelle locali con chiave modificabile, anteprima e aggancio.
 */
import { useEffect, useState } from "react";
import { Search, FileText, Eye, Check, Loader2, FolderOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getCartellaArchivio,
  scegliCartellaLocale,
  cercaFileRicorsivo,
  apriFileLocale,
  type FileTrovato,
} from "@/lib/api/cartella-locale";
import type { Attestato, Dipendente } from "@/lib/api";

export function DialogCercaAgganciaAttestato({
  open,
  onOpenChange,
  attestato,
  dipendente,
  onAgganciato,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attestato: Attestato | null;
  dipendente: Dipendente;
  onAgganciato: (percorso: string) => void;
}) {
  const [chiave, setChiave] = useState("");
  const [inRicerca, setInRicerca] = useState(false);
  const [risultati, setRisultati] = useState<FileTrovato[] | null>(null);
  const [haCartella, setHaCartella] = useState<boolean | null>(null);
  const [agganciando, setAgganciando] = useState<string | null>(null);

  // Prepara la chiave di ricerca suggerita iniziale
  useEffect(() => {
    if (open && attestato) {
      const codiceCorso = attestato.tipi_corso?.codice || "";
      const cognome = dipendente.cognome || "";
      // Pre-compila ad es. "SIC-GEN-04 ROSSI"
      const iniziale = `${codiceCorso} ${cognome}`.trim();
      setChiave(iniziale);
      setRisultati(null);

      getCartellaArchivio(false).then((h) => setHaCartella(Boolean(h)));
    }
  }, [open, attestato, dipendente]);

  async function eseguiRicerca() {
    if (!chiave.trim()) {
      toast.error("Inserisci almeno un termine per la ricerca");
      return;
    }
    setInRicerca(true);
    try {
      let root = await getCartellaArchivio(true);
      if (!root) {
        root = await scegliCartellaLocale();
        if (!root) {
          toast.info("Seleziona prima la cartella archivio");
          setInRicerca(false);
          return;
        }
        setHaCartella(true);
      }
      const files = await cercaFileRicorsivo(root, chiave);
      setRisultati(files);
      if (files.length === 0) {
        toast.info("Nessun file trovato con i termini inseriti", {
          description: "Prova ad accorciare la chiave di ricerca (es. solo il cognome).",
        });
      }
    } catch (e) {
      toast.error("Errore durante la ricerca", { description: (e as Error).message });
    } finally {
      setInRicerca(false);
    }
  }

  async function handleAggancia(file: FileTrovato) {
    if (!attestato) return;
    setAgganciando(file.percorsoRelativo);
    try {
      const { error } = await supabase
        .from("attestati_caricati")
        .update({ url_foto_fronte: file.percorsoRelativo })
        .eq("id", attestato.id);

      if (error) throw error;

      toast.success(`Attestato agganciato con successo: ${file.nome}`);
      onAgganciato(file.percorsoRelativo);
      onOpenChange(false);
    } catch (e) {
      toast.error("Errore nel salvataggio dell'aggancio", { description: (e as Error).message });
    } finally {
      setAgganciando(null);
    }
  }

  function aggiungiFrammento(testo: string) {
    if (!testo) return;
    setChiave((prev) => (prev ? `${prev} ${testo}` : testo));
  }

  if (!attestato) return null;

  const corsoNome = attestato.tipi_corso?.nome_corso || "Corso";
  const codiceCorso = attestato.tipi_corso?.codice || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-5 text-primary" /> Cerca e aggancia attestato
          </DialogTitle>
          <DialogDescription>
            Cerca il documento PDF corrispondente tra tutte le sottocartelle del tuo archivio locale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Informazioni corso di riferimento */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="font-medium text-foreground">
              {corsoNome} {codiceCorso && <span className="font-mono text-xs text-muted-foreground">({codiceCorso})</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Lavoratore: <strong>{dipendente.cognome} {dipendente.nome}</strong> — CF: {dipendente.codice_fiscale}
            </div>
          </div>

          {/* Avviso cartella non ancora impostata */}
          {haCartella === false && (
            <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="size-4" /> Cartella locale non ancora selezionata.
              </span>
              <Button size="sm" variant="outline" onClick={() => scegliCartellaLocale().then((h) => setHaCartella(Boolean(h)))}>
                <FolderOpen className="size-3.5" /> Scegli cartella
              </Button>
            </div>
          )}

          {/* Campo Chiave di ricerca perfezionabile */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Chiave di ricerca (modificabile prima di cercare)
            </label>
            <div className="flex gap-2">
              <Input
                value={chiave}
                onChange={(e) => setChiave(e.target.value)}
                placeholder="es. SIC-GEN-04 ROSSI..."
                onKeyDown={(e) => e.key === "Enter" && eseguiRicerca()}
                className="font-medium"
              />
              <Button onClick={eseguiRicerca} disabled={inRicerca} className="gap-2 shrink-0">
                {inRicerca ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Cerca
              </Button>
            </div>

            {/* Frammenti rapidi per costruire la chiave */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <span>Aggiungi rapido:</span>
              {codiceCorso && (
                <button
                  type="button"
                  onClick={() => aggiungiFrammento(codiceCorso)}
                  className="rounded bg-muted px-2 py-0.5 hover:bg-muted/80 text-foreground font-mono"
                >
                  +{codiceCorso}
                </button>
              )}
              <button
                type="button"
                onClick={() => aggiungiFrammento(dipendente.cognome)}
                className="rounded bg-muted px-2 py-0.5 hover:bg-muted/80 text-foreground"
              >
                +{dipendente.cognome}
              </button>
              <button
                type="button"
                onClick={() => aggiungiFrammento(dipendente.nome)}
                className="rounded bg-muted px-2 py-0.5 hover:bg-muted/80 text-foreground"
              >
                +{dipendente.nome}
              </button>
              {dipendente.codice_fiscale && (
                <button
                  type="button"
                  onClick={() => aggiungiFrammento(dipendente.codice_fiscale)}
                  className="rounded bg-muted px-2 py-0.5 hover:bg-muted/80 text-foreground font-mono"
                >
                  +CF
                </button>
              )}
              <button
                type="button"
                onClick={() => setChiave("")}
                className="ml-auto text-xs text-destructive hover:underline"
              >
                Pulisci
              </button>
            </div>
          </div>

          {/* Elenco dei risultati trovati */}
          {risultati !== null && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>File trovati nelle cartelle ({risultati.length})</span>
                {risultati.length > 0 && <span>Ricerca ricorsiva completata</span>}
              </div>

              {risultati.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nessun file PDF trovato corrispondente a <strong>"{chiave}"</strong>.
                  <p className="mt-1 text-xs">Prova a usare una parola più breve (ad es. solo le prime lettere del cognome).</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-auto divide-y divide-border rounded-lg border border-border bg-surface">
                  {risultati.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 shrink-0 text-primary" />
                          <span className="truncate font-medium">{f.nome}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          📁 {f.percorsoRelativo} • {(f.dimensione / 1024 / 1024).toFixed(2)} MB •{" "}
                          {f.dataModifica.toLocaleDateString("it-IT")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => apriFileLocale(f.handle)}
                          title="Apri anteprima del file"
                        >
                          <Eye className="size-4" /> Anteprima
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={agganciando === f.percorsoRelativo}
                          onClick={() => handleAggancia(f)}
                          className="gap-1.5"
                        >
                          {agganciando === f.percorsoRelativo ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          Aggancia
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

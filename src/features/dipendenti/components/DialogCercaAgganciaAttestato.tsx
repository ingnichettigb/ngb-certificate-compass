/*
 * File:          DialogCercaAgganciaAttestato.tsx
 * Percorso:      src/features/dipendenti/components/DialogCercaAgganciaAttestato.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 08:52): Prima stesura dialog ricerca e aggancio attestati.
 *   - Rev 2 (2026-10-25 11:00): Proposta iniziale su solo cognome, avvio ricerca immediato, anteprima rapida e pulsante esplicito di chiusura senza allegato.
 */
import { useEffect, useState, useCallback } from "react";
import { Search, FileText, Eye, Check, Loader2, FolderOpen, AlertCircle, XCircle } from "lucide-react";
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

  const eseguiRicercaConTesto = useCallback(async (testoRicerca: string) => {
    if (!testoRicerca.trim()) {
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
      const files = await cercaFileRicorsivo(root, testoRicerca);
      setRisultati(files);
      if (files.length === 0) {
        toast.info("Nessun file trovato nelle cartelle", {
          description: "Prova ad accorciare la ricerca o inserisci solo parte del cognome.",
        });
      }
    } catch (e) {
      toast.error("Errore durante la ricerca", { description: (e as Error).message });
    } finally {
      setInRicerca(false);
    }
  }, []);

  // Proposta iniziale: SOLO IL COGNOME per la massima tolleranza
  useEffect(() => {
    if (open && attestato) {
      const soloCognome = (dipendente.cognome || "").trim();
      setChiave(soloCognome);
      setRisultati(null);

      getCartellaArchivio(false).then((h) => {
        setHaCartella(Boolean(h));
        if (h && soloCognome) {
          eseguiRicercaConTesto(soloCognome);
        }
      });
    }
  }, [open, attestato, dipendente, eseguiRicercaConTesto]);

  async function handleAggancia(file: FileTrovato) {
    if (!attestato) return;
    setAgganciando(file.percorsoRelativo);
    try {
      const { error } = await supabase
        .from("attestati_caricati")
        .update({ url_foto_fronte: file.percorsoRelativo })
        .eq("id", attestato.id);

      if (error) throw error;

      toast.success(`Attestato collegato: ${file.nome}`);
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
            Cerca nelle cartelle e sottocartelle del tuo archivio locale. Ti proponiamo il cognome, che puoi modificare liberamente.
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
                <AlertCircle className="size-4" /> Cartella archivio non ancora selezionata.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => scegliCartellaLocale().then((h) => {
                  setHaCartella(Boolean(h));
                  if (h && chiave) eseguiRicercaConTesto(chiave);
                })}
              >
                <FolderOpen className="size-3.5" /> Scegli cartella
              </Button>
            </div>
          )}

          {/* Campo Chiave di ricerca: di default solo il cognome, modificabile */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Termini di ricerca (proposto: solo cognome)
              </label>
              <span className="text-[11px] text-muted-foreground">Cerca in tutte le sottocartelle</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={chiave}
                onChange={(e) => setChiave(e.target.value)}
                placeholder="Inserisci cognome o parole del file..."
                onKeyDown={(e) => e.key === "Enter" && eseguiRicercaConTesto(chiave)}
                className="font-medium"
              />
              <Button onClick={() => eseguiRicercaConTesto(chiave)} disabled={inRicerca} className="gap-2 shrink-0">
                {inRicerca ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Cerca
              </Button>
            </div>

            {/* Frammenti rapidi per aggiungere altri dettagli alla ricerca */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <span>Aggiungi rapido:</span>
              <button
                type="button"
                onClick={() => aggiungiFrammento(dipendente.nome)}
                className="rounded bg-muted px-2 py-0.5 hover:bg-muted/80 text-foreground"
              >
                +{dipendente.nome}
              </button>
              {codiceCorso && (
                <button
                  type="button"
                  onClick={() => aggiungiFrammento(codiceCorso)}
                  className="rounded bg-muted px-2 py-0.5 hover:bg-muted/80 text-foreground font-mono"
                >
                  +{codiceCorso}
                </button>
              )}
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
                Svuota campo
              </button>
            </div>
          </div>

          {/* Elenco dei risultati con opzione di visione e aggancio */}
          {risultati !== null && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>File trovati ({risultati.length})</span>
                {risultati.length > 0 && <span className="text-success">Seleziona o visualizza un file</span>}
              </div>

              {risultati.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground space-y-2">
                  <p>Nessun file trovato per <strong>"{chiave}"</strong> nelle sottocartelle.</p>
                  <p className="text-xs">Se l'attestato non è presente, puoi chiudere senza allegare nulla.</p>
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
                        {/* Visione preventiva del file prima di decidere */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => apriFileLocale(f.handle)}
                          title="Guarda il file prima di allegarlo"
                          className="gap-1 text-xs"
                        >
                          <Eye className="size-3.5" /> Guarda
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={agganciando === f.percorsoRelativo}
                          onClick={() => handleAggancia(f)}
                          className="gap-1.5 text-xs"
                        >
                          {agganciando === f.percorsoRelativo ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          Collega
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Barra inferiore: comando esplicito di chiusura senza collegare */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {risultati ? `${risultati.length} file corrispondenti` : "In attesa di ricerca"}
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="gap-1.5 text-xs"
            >
              <XCircle className="size-3.5" /> Nessun file da allegare (Chiudi)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

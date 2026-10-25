/*
 * File:          DialogCercaAgganciaAttestato.tsx
 * Percorso:      src/features/dipendenti/components/DialogCercaAgganciaAttestato.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 08:52): Prima stesura dialog ricerca e aggancio attestati.
 *   - Rev 2 (2026-10-25 11:00): Proposta iniziale su solo cognome, avvio ricerca immediato.
 *   - Rev 3 (2026-10-25 21:05): Casella di spunta e confronto dati.
 *   - Rev 4 (2026-10-25 21:35): Selezione singola, pulsante verifica in alto (verde quando attivo), verifica spostata in schermata a tutto schermo.
 */
import { useEffect, useState, useCallback } from "react";
import { Search, FileText, Eye, Loader2, FolderOpen, AlertCircle, ArrowRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getCartellaArchivio,
  scegliCartellaLocale,
  cercaFileRicorsivo,
  apriFileLocale,
  type FileTrovato,
} from "@/lib/api/cartella-locale";
import { type Attestato, type Dipendente } from "@/lib/api";
import { SchermoVerificaAttestato } from "../verifica-attestato/SchermoVerificaAttestato";

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
  const [selezionato, setSelezionato] = useState<FileTrovato | null>(null);
  const [inVerifica, setInVerifica] = useState(false);

  const cerca = useCallback(async (testo: string) => {
    if (!testo.trim()) {
      toast.error("Inserisci almeno un termine per la ricerca");
      return;
    }
    setInRicerca(true);
    setSelezionato(null);
    try {
      let root = await getCartellaArchivio(true);
      if (!root) {
        root = await scegliCartellaLocale();
        if (!root) {
          toast.info("Seleziona prima la cartella archivio");
          return;
        }
        setHaCartella(true);
      }
      const files = await cercaFileRicorsivo(root, testo);
      setRisultati(files);
      if (files.length === 0) toast.info("Nessun file trovato nelle cartelle");
    } catch (e) {
      toast.error("Errore durante la ricerca", { description: (e as Error).message });
    } finally {
      setInRicerca(false);
    }
  }, []);

  useEffect(() => {
    if (open && attestato) {
      const cognome = (dipendente.cognome || "").trim();
      setChiave(cognome);
      setRisultati(null);
      setSelezionato(null);
      setInVerifica(false);
      getCartellaArchivio(false).then((h) => {
        setHaCartella(Boolean(h));
        if (h && cognome) cerca(cognome);
      });
    }
  }, [open, attestato, dipendente, cerca]);

  // Selezione singola: un secondo clic su un altro file sostituisce il precedente
  function scegli(f: FileTrovato) {
    setSelezionato((prev) => (prev?.percorsoRelativo === f.percorsoRelativo ? null : f));
  }

  if (!attestato) return null;

  if (open && inVerifica && selezionato) {
    return (
      <SchermoVerificaAttestato
        attestato={attestato}
        dipendente={dipendente}
        fileTrovato={selezionato}
        onChiudi={() => setInVerifica(false)}
        onConfermato={(percorso) => {
          setInVerifica(false);
          onAgganciato(percorso);
          onOpenChange(false);
        }}
      />
    );
  }

  const codice = attestato.tipi_corso?.codice || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-5 text-primary" /> Cerca e seleziona attestato
          </DialogTitle>
          <DialogDescription>
            Spunta un solo file: il pulsante verde in alto si attiva e apre la verifica a tutto schermo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center">
            <div>
              <div className="font-semibold">
                {attestato.tipi_corso?.nome_corso || "Corso"}{" "}
                {codice && <span className="font-mono text-xs text-muted-foreground">({codice})</span>}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Lavoratore: <strong>{dipendente.cognome} {dipendente.nome}</strong> • CF: {dipendente.codice_fiscale}
              </div>
            </div>
            <Button
              type="button"
              disabled={!selezionato}
              onClick={() => setInVerifica(true)}
              className={`shrink-0 gap-2 font-semibold ${
                selezionato ? "bg-success text-success-foreground hover:bg-success/90" : "bg-muted text-muted-foreground"
              }`}
            >
              Procedi alla verifica <ArrowRight className="size-4" />
            </Button>
          </div>

          {haCartella === false && (
            <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
              <span className="flex items-center gap-1.5"><AlertCircle className="size-4" /> Cartella archivio non ancora selezionata.</span>
              <Button size="sm" variant="outline" onClick={() => scegliCartellaLocale().then((h) => { setHaCartella(Boolean(h)); if (h && chiave) cerca(chiave); })}>
                <FolderOpen className="size-3.5" /> Scegli cartella
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Termini di ricerca (proposto: solo cognome)
            </label>
            <div className="flex gap-2">
              <Input value={chiave} onChange={(e) => setChiave(e.target.value)} onKeyDown={(e) => e.key === "Enter" && cerca(chiave)} placeholder="Cognome o parte del nome file..." />
              <Button onClick={() => cerca(chiave)} disabled={inRicerca} className="shrink-0 gap-2">
                {inRicerca ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Cerca
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>Aggiungi:</span>
              {[dipendente.nome, codice, dipendente.codice_fiscale].filter(Boolean).map((t) => (
                <button key={t} type="button" onClick={() => setChiave((p) => (p ? `${p} ${t}` : t))} className="rounded bg-muted px-2 py-0.5 font-mono text-foreground hover:bg-muted/80">
                  +{t === dipendente.codice_fiscale ? "CF" : t}
                </button>
              ))}
            </div>
          </div>

          {risultati !== null && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">File trovati ({risultati.length})</div>
              {risultati.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nessun file trovato per <strong>"{chiave}"</strong>.
                </div>
              ) : (
                <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface">
                  {risultati.map((f) => {
                    const on = selezionato?.percorsoRelativo === f.percorsoRelativo;
                    return (
                      <div key={f.percorsoRelativo} onClick={() => scegli(f)} className={`flex cursor-pointer items-center gap-3 p-3 text-sm ${on ? "border-l-4 border-success bg-success/10" : "hover:bg-muted/40"}`}>
                        <input type="checkbox" checked={on} onChange={() => scegli(f)} onClick={(e) => e.stopPropagation()} className="size-4 cursor-pointer" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 shrink-0 text-primary" />
                            <span className="truncate font-medium">{f.nome}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {f.percorsoRelativo} • {(f.dimensione / 1024 / 1024).toFixed(2)} MB • {f.dataModifica.toLocaleDateString("it-IT")}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" type="button" onClick={(e) => { e.stopPropagation(); apriFileLocale(f.handle); }} className="shrink-0 gap-1 text-xs">
                          <Eye className="size-3.5" /> Guarda
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border pt-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="gap-1.5 text-xs text-muted-foreground">
              <XCircle className="size-3.5" /> Chiudi senza allegare
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

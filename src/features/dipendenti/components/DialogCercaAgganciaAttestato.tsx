/*
 * File:          DialogCercaAgganciaAttestato.tsx
 * Percorso:      src/features/dipendenti/components/DialogCercaAgganciaAttestato.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 08:52): Prima stesura dialog ricerca e aggancio attestati.
 *   - Rev 2 (2026-10-25 11:00): Proposta iniziale su solo cognome, avvio ricerca immediato.
 *   - Rev 3 (2026-10-25 21:05): Casella di spunta e confronto dati.
 *   - Rev 4 (2026-10-25 21:35): Selezione singola, pulsante verifica in alto.
 *   - Rev 5 (2026-10-25 21:45): Finestra a sé stante a tutto schermo (100vw x 100vh) senza vincoli modali stretti.
 *   - Rev 6 (2026-10-27 10:38): Aggiunto attributo title su nome file e percorso per visualizzazione per esteso al passaggio del mouse.
 */
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, FileText, Eye, Loader2, FolderOpen, AlertCircle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  function scegli(f: FileTrovato) {
    setSelezionato((prev) => (prev?.percorsoRelativo === f.percorsoRelativo ? null : f));
  }

  if (!open || !attestato) return null;

  if (inVerifica && selezionato) {
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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex h-screen w-screen flex-col bg-background">
      {/* Barra superiore a tutto schermo */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="gap-1.5"
          >
            <X className="size-4" /> Chiudi ed esci
          </Button>
          <div>
            <h1 className="text-base font-bold text-foreground">Cerca e seleziona attestato dall'archivio</h1>
            <p className="text-xs text-muted-foreground">
              Lavoratore: <strong>{dipendente.cognome} {dipendente.nome}</strong> (CF: {dipendente.codice_fiscale}) •{" "}
              Corso: <strong>{attestato.tipi_corso?.nome_corso || "Corso"}</strong>
              {codice && <span className="font-mono text-muted-foreground"> [{codice}]</span>}
            </p>
          </div>
        </div>

        <Button
          type="button"
          disabled={!selezionato}
          onClick={() => setInVerifica(true)}
          className={`gap-2 px-6 py-2.5 font-bold shadow transition-all ${
            selezionato
              ? "bg-success text-success-foreground hover:bg-success/90 ring-2 ring-success/30"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Procedi alla verifica documento <ArrowRight className="size-4" />
        </Button>
      </header>

      {/* Corpo a tutto schermo */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {haCartella === false && (
          <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <AlertCircle className="size-4 text-warning" /> Cartella dell'archivio non ancora selezionata.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                scegliCartellaLocale().then((h) => {
                  setHaCartella(Boolean(h));
                  if (h && chiave) cerca(chiave);
                })
              }
            >
              <FolderOpen className="size-3.5" /> Seleziona cartella archivio
            </Button>
          </div>
        )}

        {/* Barra di ricerca ampia */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Termine di ricerca nel nome dei file (proposto automaticamente: cognome)
          </label>
          <div className="flex gap-2">
            <Input
              value={chiave}
              onChange={(e) => setChiave(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && cerca(chiave)}
              placeholder="Cerca per cognome, nome, codice fiscale o parte del file..."
              className="h-10 text-base"
            />
            <Button onClick={() => cerca(chiave)} disabled={inRicerca} className="h-10 shrink-0 gap-2 px-5">
              {inRicerca ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Cerca
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>Aggiungi rapidamente alla ricerca:</span>
            {[dipendente.nome, codice, dipendente.codice_fiscale].filter(Boolean).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setChiave((p) => (p ? `${p} ${t}` : t))}
                className="rounded border border-border bg-muted px-2.5 py-1 font-mono text-foreground hover:bg-muted/80"
              >
                +{t === dipendente.codice_fiscale ? "Codice Fiscale" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Elenco file trovati a piena larghezza */}
        {risultati !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>File trovati ({risultati.length})</span>
              <span>Spunta la casella del file corrispondente per attivare il pulsante verde in alto</span>
            </div>

            {risultati.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-12 text-center text-sm text-muted-foreground">
                Nessun file trovato per <strong>"{chiave}"</strong> nella cartella selezionata e nelle relative sottocartelle.
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-surface shadow-sm">
                {risultati.map((f) => {
                  const on = selezionato?.percorsoRelativo === f.percorsoRelativo;
                  return (
                    <div
                      key={f.percorsoRelativo}
                      onClick={() => scegli(f)}
                      className={`flex cursor-pointer items-center gap-4 p-4 transition-colors ${
                        on ? "border-l-4 border-success bg-success/10" : "hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => scegli(f)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-5 cursor-pointer accent-success"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="size-5 shrink-0 text-primary" />
                          <span
                            className="truncate text-base font-semibold text-foreground"
                            title={f.nome}
                          >
                            {f.nome}
                          </span>
                        </div>
                        <p
                          className="mt-1 truncate text-xs text-muted-foreground"
                          title={`Posizione: ${f.percorsoRelativo}`}
                        >
                          Posizione: <span className="font-mono">{f.percorsoRelativo}</span> • Dimensione: {(f.dimensione / 1024 / 1024).toFixed(2)} MB • Data: {f.dataModifica.toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          apriFileLocale(f.handle);
                        }}
                        className="shrink-0 gap-1.5"
                      >
                        <Eye className="size-4" /> Apri file
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>,
    document.body,
  );
}

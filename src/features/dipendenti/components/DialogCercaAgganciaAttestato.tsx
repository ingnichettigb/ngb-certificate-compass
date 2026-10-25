/*
 * File:          DialogCercaAgganciaAttestato.tsx
 * Percorso:      src/features/dipendenti/components/DialogCercaAgganciaAttestato.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 08:52): Prima stesura dialog ricerca e aggancio attestati.
 *   - Rev 2 (2026-10-25 11:00): Proposta iniziale su solo cognome, avvio ricerca immediato, anteprima rapida e pulsante esplicito di chiusura senza allegato.
 *   - Rev 3 (2026-10-25 21:05): Casella di spunta a sinistra per selezione file, vista di verifica/confronto dati memorizzati vs file e conferma salvataggio link nel database.
 */
import { useEffect, useState, useCallback } from "react";
import {
  Search,
  FileText,
  Eye,
  Check,
  Loader2,
  FolderOpen,
  AlertCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  BookOpen,
} from "lucide-react";
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
import { formatData, type Attestato, type Dipendente } from "@/lib/api";

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
  const [fileSelezionato, setFileSelezionato] = useState<FileTrovato | null>(null);
  const [faseVerifica, setFaseVerifica] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  const eseguiRicercaConTesto = useCallback(async (testoRicerca: string) => {
    if (!testoRicerca.trim()) {
      toast.error("Inserisci almeno un termine per la ricerca");
      return;
    }
    setInRicerca(true);
    setFileSelezionato(null);
    setFaseVerifica(false);
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

  // Proposta iniziale: solo il cognome per massimizzare i riscontri
  useEffect(() => {
    if (open && attestato) {
      const soloCognome = (dipendente.cognome || "").trim();
      setChiave(soloCognome);
      setRisultati(null);
      setFileSelezionato(null);
      setFaseVerifica(false);

      getCartellaArchivio(false).then((h) => {
        setHaCartella(Boolean(h));
        if (h && soloCognome) {
          eseguiRicercaConTesto(soloCognome);
        }
      });
    }
  }, [open, attestato, dipendente, eseguiRicercaConTesto]);

  async function handleConfermaAggancio() {
    if (!attestato || !fileSelezionato) return;
    try {
      setSalvataggioInCorso(true);
      const { error } = await supabase
        .from("attestati_caricati")
        .update({ url_foto_fronte: fileSelezionato.percorsoRelativo })
        .eq("id", attestato.id);

      if (error) throw error;

      toast.success(`Attestato collegato al database: ${fileSelezionato.nome}`);
      onAgganciato(fileSelezionato.percorsoRelativo);
      onOpenChange(false);
    } catch (e) {
      toast.error("Errore durante il salvataggio del collegamento", {
        description: (e as Error).message,
      });
    } finally {
      setSalvataggioInCorso(false);
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-5 text-primary" />
            {faseVerifica ? "Verifica e conferma attestato" : "Cerca e seleziona attestato"}
          </DialogTitle>
          <DialogDescription>
            {faseVerifica
              ? "Controlla la corrispondenza tra i dati salvati a sistema e il documento selezionato prima di agganciarlo."
              : "Spunta la casella a sinistra del file corrispondente e procedi alla verifica."}
          </DialogDescription>
        </DialogHeader>

        {/* FASE 1: RICERCA E SELEZIONE FILE CON CASELLA DI SPUNTA */}
        {!faseVerifica && (
          <div className="space-y-4 pt-1">
            {/* Informazioni corso di riferimento */}
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="font-medium text-foreground">
                {corsoNome}{" "}
                {codiceCorso && (
                  <span className="font-mono text-xs text-muted-foreground">({codiceCorso})</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Lavoratore: <strong>{dipendente.cognome} {dipendente.nome}</strong> — CF:{" "}
                {dipendente.codice_fiscale}
              </div>
            </div>

            {/* Avviso cartella locale non impostata */}
            {haCartella === false && (
              <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="size-4" /> Cartella archivio non ancora selezionata.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    scegliCartellaLocale().then((h) => {
                      setHaCartella(Boolean(h));
                      if (h && chiave) eseguiRicercaConTesto(chiave);
                    })
                  }
                >
                  <FolderOpen className="size-3.5" /> Scegli cartella
                </Button>
              </div>
            )}

            {/* Campo Chiave di ricerca */}
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
                <Button
                  onClick={() => eseguiRicercaConTesto(chiave)}
                  disabled={inRicerca}
                  className="gap-2 shrink-0"
                >
                  {inRicerca ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  Cerca
                </Button>
              </div>

              {/* Tag rapidi per affinare */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <span>Aggiungi:</span>
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

            {/* Elenco dei file trovati con casella di spunta a sinistra */}
            {risultati !== null && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>File trovati ({risultati.length})</span>
                  {fileSelezionato && (
                    <span className="text-primary font-medium">1 file selezionato pronto per verifica</span>
                  )}
                </div>

                {risultati.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground space-y-2">
                    <p>Nessun file trovato per <strong>"{chiave}"</strong> nelle cartelle.</p>
                    <p className="text-xs">Se l'attestato non è presente, puoi chiudere senza allegare nulla.</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-lg border border-border bg-surface">
                    {risultati.map((f, i) => {
                      const isChecked = fileSelezionato?.percorsoRelativo === f.percorsoRelativo;
                      return (
                        <div
                          key={i}
                          onClick={() => setFileSelezionato(f)}
                          className={`flex items-center gap-3 p-3 text-sm cursor-pointer transition-colors ${
                            isChecked ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/40"
                          }`}
                        >
                          {/* Casella di spunta a sinistra */}
                          <div className="flex items-center justify-center shrink-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                setFileSelezionato(isChecked ? null : f);
                              }}
                              className="size-4.5 rounded border-input text-primary focus:ring-primary cursor-pointer"
                            />
                          </div>

                          {/* Dati del file */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 shrink-0 text-primary" />
                              <span className={`truncate font-medium ${isChecked ? "text-primary" : ""}`}>
                                {f.nome}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground mt-0.5">
                              📁 {f.percorsoRelativo} • {(f.dimensione / 1024 / 1024).toFixed(2)} MB •{" "}
                              {f.dataModifica.toLocaleDateString("it-IT")}
                            </p>
                          </div>

                          {/* Pulsante Guarda rapido */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                apriFileLocale(f.handle);
                              }}
                              title="Visualizza il documento per controllarlo"
                              className="gap-1 text-xs"
                            >
                              <Eye className="size-3.5" /> Guarda
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Barra inferiore */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <XCircle className="size-3.5" /> Chiudi senza allegare
              </Button>

              <Button
                type="button"
                disabled={!fileSelezionato}
                onClick={() => setFaseVerifica(true)}
                className="gap-2 text-xs"
              >
                Procedi alla verifica <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* FASE 2: VERIFICA E CONFRONTO TRA DATI A SISTEMA E ATTESTATO SELEZIONATO */}
        {faseVerifica && fileSelezionato && (
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-foreground text-sm">
                  Verifica corrispondenza prima del salvataggio
                </p>
                <p className="text-muted-foreground">
                  Verifica che i dati riportati nel documento PDF corrispondano a quelli registrati
                  nella scheda del dipendente prima di agganciare definitivamente il link.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Colonna 1: Dati memorizzati a sistema */}
              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/60 pb-1.5">
                  <User className="size-3.5" /> Dati registrati a database
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Dipendente:</span>{" "}
                    <strong className="text-foreground">
                      {dipendente.cognome} {dipendente.nome}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Codice Fiscale:</span>{" "}
                    <span className="font-mono text-foreground">{dipendente.codice_fiscale}</span>
                  </div>
                  <div className="pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Corso:</span>{" "}
                    <strong className="text-foreground">{corsoNome}</strong>{" "}
                    {codiceCorso && (
                      <span className="font-mono text-muted-foreground">[{codiceCorso}]</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data svolgimento:</span>{" "}
                    <strong className="text-foreground">{formatData(attestato.data_corso)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data scadenza:</span>{" "}
                    <span className="text-foreground">
                      {attestato.data_scadenza_calcolata
                        ? formatData(attestato.data_scadenza_calcolata)
                        : "senza scadenza"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ore registrate:</span>{" "}
                    <span className="text-foreground">
                      {attestato.ore_dichiarate != null ? `${attestato.ore_dichiarate} ore` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Colonna 2: Dati del file selezionato */}
              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/60 pb-1.5">
                  <BookOpen className="size-3.5" /> File attestato da agganciare
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Nome file:</span>
                    <div className="font-mono font-medium text-primary break-all mt-0.5">
                      {fileSelezionato.nome}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Percorso:</span>
                    <div className="text-muted-foreground font-mono text-[11px] break-all mt-0.5">
                      {fileSelezionato.percorsoRelativo}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-1 border-t border-border/40">
                    <div>
                      <span className="text-muted-foreground">Dimensione:</span>{" "}
                      <span className="text-foreground">
                        {(fileSelezionato.dimensione / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data file:</span>{" "}
                      <span className="text-foreground">
                        {fileSelezionato.dataModifica.toLocaleDateString("it-IT")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pulsante per visionare il PDF a schermo intero */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => apriFileLocale(fileSelezionato.handle)}
                    className="w-full gap-2 text-xs"
                  >
                    <Eye className="size-3.5 text-primary" /> Apri e visiona il documento PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Pulsanti di azione finali */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFaseVerifica(false)}
                disabled={salvataggioInCorso}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="size-3.5" /> Torna alla selezione
              </Button>

              <Button
                type="button"
                onClick={handleConfermaAggancio}
                disabled={salvataggioInCorso}
                className="gap-2 text-xs bg-success text-success-foreground hover:bg-success/90"
              >
                {salvataggioInCorso ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Conferma e Collega al Database
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

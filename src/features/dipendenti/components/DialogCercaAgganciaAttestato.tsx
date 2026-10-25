/*
 * File:          DialogCercaAgganciaAttestato.tsx
 * Percorso:      src/features/dipendenti/components/DialogCercaAgganciaAttestato.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 08:52): Prima stesura dialog ricerca e aggancio attestati.
 *   - Rev 2 (2026-10-25 11:00): Proposta iniziale su solo cognome, avvio ricerca immediato.
 *   - Rev 3 (2026-10-25 21:05): Casella di spunta a sinistra e confronto memorizzati vs file.
 *   - Rev 4 (2026-10-25 21:20): Selezione singola esclusiva, pulsante verifica reattivo verde, anteprima PDF ruotabile a 90° e rettifica dati contestuale prima dell'aggancio finale.
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
  RotateCw,
  ExternalLink,
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
import { type Attestato, type Dipendente } from "@/lib/api";

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

  // Campi modificabili durante la verifica
  const [dataCorso, setDataCorso] = useState("");
  const [dataScadenza, setDataScadenza] = useState("");
  const [senzaScadenza, setSenzaScadenza] = useState(false);
  const [oreDichiarate, setOreDichiarate] = useState<number | "">("");

  // Visualizzatore PDF e rotazione
  const [anteprimaUrl, setAnteprimaUrl] = useState<string | null>(null);
  const [rotazione, setRotazione] = useState(0);

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

  // Inizializzazione dialog
  useEffect(() => {
    if (open && attestato) {
      const soloCognome = (dipendente.cognome || "").trim();
      setChiave(soloCognome);
      setRisultati(null);
      setFileSelezionato(null);
      setFaseVerifica(false);
      setRotazione(0);

      setDataCorso(attestato.data_corso || "");
      setDataScadenza(attestato.data_scadenza_calcolata || "");
      setSenzaScadenza(!attestato.data_scadenza_calcolata);
      setOreDichiarate(attestato.ore_dichiarate ?? "");

      getCartellaArchivio(false).then((h) => {
        setHaCartella(Boolean(h));
        if (h && soloCognome) {
          eseguiRicercaConTesto(soloCognome);
        }
      });
    }
  }, [open, attestato, dipendente, eseguiRicercaConTesto]);

  // Caricamento oggetto URL per l'anteprima PDF / Immagine
  useEffect(() => {
    let active = true;
    let urlCreato = "";
    if (fileSelezionato && faseVerifica) {
      fileSelezionato.handle.getFile().then((file) => {
        if (!active) return;
        urlCreato = URL.createObjectURL(file);
        setAnteprimaUrl(urlCreato);
      });
    } else {
      setAnteprimaUrl(null);
    }
    return () => {
      active = false;
      if (urlCreato) URL.revokeObjectURL(urlCreato);
    };
  }, [fileSelezionato, faseVerifica]);

  // Gestione selezione rigorosamente singola
  function toggleSelezioneFile(f: FileTrovato) {
    setFileSelezionato((prev) => (prev?.percorsoRelativo === f.percorsoRelativo ? null : f));
  }

  async function handleConfermaEAggiungi() {
    if (!attestato || !fileSelezionato) return;
    try {
      setSalvataggioInCorso(true);
      const { error } = await supabase
        .from("attestati_caricati")
        .update({
          url_foto_fronte: fileSelezionato.percorsoRelativo,
          data_corso: dataCorso || null,
          data_scadenza_calcolata: senzaScadenza ? null : dataScadenza || null,
          ore_dichiarate: oreDichiarate === "" ? null : Number(oreDichiarate),
        })
        .eq("id", attestato.id);

      if (error) throw error;

      toast.success(`Attestato collegato e salvato: ${fileSelezionato.nome}`);
      onAgganciato(fileSelezionato.percorsoRelativo);
      onOpenChange(false);
    } catch (e) {
      toast.error("Errore durante il salvataggio", {
        description: (e as Error).message,
      });
    } finally {
      setSalvataggioInCorso(false);
    }
  }

  if (!attestato) return null;

  const corsoNome = attestato.tipi_corso?.nome_corso || "Corso";
  const codiceCorso = attestato.tipi_corso?.codice || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-5 text-primary" />
            {faseVerifica ? "Verifica documento e dati prima di aggiungere" : "Cerca e seleziona attestato"}
          </DialogTitle>
          <DialogDescription>
            {faseVerifica
              ? "Visiona il documento, ruotalo se necessario e rettifica i dati prima del collegamento definitivo."
              : "Spunta il file corrispondente (selezione singola) per abilitare il pulsante verde di verifica."}
          </DialogDescription>
        </DialogHeader>

        {/* FASE 1: RICERCA E SELEZIONE FILE */}
        {!faseVerifica && (
          <div className="space-y-4 pt-1">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Termini di ricerca (proposto: solo cognome)
                </label>
                <span className="text-[11px] text-muted-foreground">Ricerca ricorsiva</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={chiave}
                  onChange={(e) => setChiave(e.target.value)}
                  placeholder="Inserisci cognome del lavoratore..."
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
            </div>

            {/* Risultati */}
            {risultati !== null && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>File trovati ({risultati.length})</span>
                  {fileSelezionato && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ 1 file selezionato pronto per verifica
                    </span>
                  )}
                </div>

                {risultati.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground space-y-1">
                    <p>Nessun file trovato per <strong>"{chiave}"</strong>.</p>
                    <p className="text-xs">Puoi modificare il termine di ricerca o chiudere senza allegare.</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-lg border border-border bg-surface">
                    {risultati.map((f, i) => {
                      const isChecked = fileSelezionato?.percorsoRelativo === f.percorsoRelativo;
                      return (
                        <div
                          key={i}
                          onClick={() => toggleSelezioneFile(f)}
                          className={`flex items-center gap-3 p-3 text-sm cursor-pointer transition-colors ${
                            isChecked ? "bg-emerald-500/10 border-l-4 border-emerald-600" : "hover:bg-muted/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelezioneFile(f)}
                            className="size-4.5 rounded border-input text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 shrink-0 text-primary" />
                              <span className={`truncate font-medium ${isChecked ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                                {f.nome}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground mt-0.5">
                              📁 {f.percorsoRelativo} • {(f.dimensione / 1024 / 1024).toFixed(2)} MB •{" "}
                              {f.dataModifica.toLocaleDateString("it-IT")}
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
                            className="gap-1 text-xs shrink-0"
                          >
                            <Eye className="size-3.5" /> Guarda
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Barra inferiore con pulsante verde condizionale */}
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
                onClick={() => {
                  setRotazione(0);
                  setFaseVerifica(true);
                }}
                className={`gap-2 text-xs transition-colors ${
                  fileSelezionato
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                Procedi alla verifica <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* FASE 2: VERIFICA COMBINATA (PDF RUOTABILE + DATI MODIFICABILI) */}
        {faseVerifica && fileSelezionato && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Riquadro 1: Visualizzatore documento con rotazione */}
              <div className="flex flex-col rounded-lg border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2 text-xs">
                  <span className="font-medium truncate max-w-[220px]" title={fileSelezionato.nome}>
                    {fileSelezionato.nome}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRotazione((r) => (r + 90) % 360)}
                      className="h-7 text-xs gap-1"
                      title="Ruota il foglio di 90 gradi a destra"
                    >
                      <RotateCw className="size-3.5" /> Ruota 90°
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => apriFileLocale(fileSelezionato.handle)}
                      className="h-7 text-xs gap-1"
                      title="Apri a schermo intero"
                    >
                      <ExternalLink className="size-3.5" /> Schermo intero
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center min-h-[380px] p-2 bg-black/5 overflow-hidden">
                  {anteprimaUrl ? (
                    <div
                      className="w-full h-[380px] flex items-center justify-center transition-transform duration-200"
                      style={{ transform: `rotate(${rotazione}deg)` }}
                    >
                      <iframe
                        src={`${anteprimaUrl}#toolbar=0`}
                        title="Anteprima PDF"
                        className="w-full h-full rounded border border-border bg-white"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Caricamento documento...
                    </div>
                  )}
                </div>
              </div>

              {/* Riquadro 2: Dati registrati e rettificabili */}
              <div className="flex flex-col justify-between rounded-lg border border-border bg-surface p-4 space-y-4 text-xs">
                <div className="space-y-3">
                  <div className="border-b border-border pb-2">
                    <span className="text-muted-foreground">Lavoratore:</span>{" "}
                    <strong className="text-foreground text-sm">
                      {dipendente.cognome} {dipendente.nome}
                    </strong>{" "}
                    <span className="font-mono text-muted-foreground">({dipendente.codice_fiscale})</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Corso associato:</span>{" "}
                    <strong className="text-foreground">{corsoNome}</strong>{" "}
                    {codiceCorso && <span className="font-mono text-muted-foreground">[{codiceCorso}]</span>}
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="font-medium text-foreground">Data svolgimento corso</label>
                    <Input
                      type="date"
                      value={dataCorso}
                      onChange={(e) => setDataCorso(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-foreground">Data scadenza calcolata</label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={senzaScadenza}
                          onChange={(e) => {
                            setSenzaScadenza(e.target.checked);
                            if (e.target.checked) setDataScadenza("");
                          }}
                          className="rounded text-primary"
                        />
                        <span>Senza scadenza</span>
                      </label>
                    </div>
                    <Input
                      type="date"
                      value={dataScadenza}
                      disabled={senzaScadenza}
                      onChange={(e) => setDataScadenza(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Ore di formazione</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={oreDichiarate}
                      placeholder="Ore dichiarate..."
                      onChange={(e) =>
                        setOreDichiarate(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="rounded border border-border/80 bg-muted/30 p-2 text-[11px] text-muted-foreground break-all">
                    <span>Percorso file selezionato: </span>
                    <strong className="text-foreground font-mono">{fileSelezionato.percorsoRelativo}</strong>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-muted-foreground text-[11px]">
                    Cliccando sul tasto verde sottostante, i dati rettificati e il collegamento al file
                    verranno registrati immediatamente nella scheda del lavoratore.
                  </p>
                </div>
              </div>
            </div>

            {/* Barra azioni finale */}
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
                onClick={handleConfermaEAggiungi}
                disabled={salvataggioInCorso}
                className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {salvataggioInCorso ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Aggiungi e collega al database
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

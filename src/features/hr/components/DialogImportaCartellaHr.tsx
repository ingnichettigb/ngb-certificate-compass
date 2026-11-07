/*
 * File:          DialogImportaCartellaHr.tsx
 * Percorso:      src/features/hr/components/DialogImportaCartellaHr.tsx
 * Data creazione: 2026-11-07
 * Revisioni:
 *   - Rev 1 (2026-11-07 11:57): Finestra di importazione massiva da cartella locale, con
 *     scansione ricorsiva, abbinamento automatico lavoratore/corso e inserimento in «In attesa».
 */
import { useState, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FolderOpen,
  FolderInput,
  Check,
  AlertTriangle,
  HelpCircle,
  UploadCloud,
  HardDrive,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDipendenti, getTipiCorso, creaAttestato, uploadFoto } from "@/lib/api";
import {
  haEstensioneValida,
  abbinaDipendente,
  abbinaTipoCorso,
  estraiDataDalNome,
  type FileAttestatoScansionato,
} from "../import-cartella/analizza-file-cartella";

export function DialogImportaCartellaHr({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const inputFallbackId = useId();
  const [fileList, setFileList] = useState<FileAttestatoScansionato[]>([]);
  const [inScansione, setInScansione] = useState(false);
  const [inSalvataggio, setInSalvataggio] = useState(false);
  const [avanzamento, setAvanzamento] = useState({ corrente: 0, totale: 0 });
  const [caricaSuCloud, setCaricaSuCloud] = useState(false);

  const { data: dipendenti = [] } = useQuery({
    queryKey: ["dipendenti"],
    queryFn: () => getDipendenti(),
    enabled: open,
  });

  const { data: corsi = [] } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
    enabled: open,
  });

  const dataOggi = new Date().toISOString().slice(0, 10);

  /** Scansiona ricorsivamente un FileSystemDirectoryHandle nativo. */
  async function scansionaCartellaNativa(dir: FileSystemDirectoryHandle, prefisso = ""): Promise<FileAttestatoScansionato[]> {
    const trovati: FileAttestatoScansionato[] = [];
    const entries = dir as unknown as { values: () => AsyncIterable<FileSystemHandle> };

    for await (const entry of entries.values()) {
      const percorso = prefisso ? `${prefisso}/${entry.name}` : entry.name;
      if (entry.kind === "file") {
        if (!haEstensioneValida(entry.name)) continue;
        try {
          const fileHandle = entry as FileSystemFileHandle;
          const fileObj = await fileHandle.getFile();
          const matchDip = abbinaDipendente(percorso, dipendenti);
          const matchCorso = abbinaTipoCorso(percorso, corsi);
          const dataEstratta = estraiDataDalNome(percorso) || dataOggi;

          trovati.push({
            id: Math.random().toString(36).substring(2, 9),
            nomeFile: entry.name,
            percorsoRelativo: percorso,
            file: fileObj,
            dimensione: fileObj.size,
            dipendenteId: matchDip.dipendente?.id || null,
            codiceFiscale: matchDip.dipendente?.codice_fiscale || "",
            nomeLavoratore: matchDip.dipendente ? `${matchDip.dipendente.cognome} ${matchDip.dipendente.nome}` : "",
            statoAbbinamento: matchDip.stato,
            tipoCorsoId: matchCorso?.id || corsi[0]?.id || "",
            dataCorso: dataEstratta,
            oreDichiarate: matchCorso?.ore_minime_legge ?? null,
            selezionato: true,
          });
        } catch {
          /* ignora file non leggibili */
        }
      } else if (entry.kind === "directory") {
        if (entry.name.startsWith(".") || entry.name.toLowerCase() === "node_modules") continue;
        const sotto = await scansionaCartellaNativa(entry as FileSystemDirectoryHandle, percorso);
        trovati.push(...sotto);
      }
    }
    return trovati;
  }

  /** Apertura picker nativo cartella. */
  async function selezionaCartellaLocale() {
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        setInScansione(true);
        const risultati = await scansionaCartellaNativa(handle);
        setFileList(risultati);
        if (risultati.length === 0) {
          toast.warning("Nessun PDF o immagine trovata nella cartella selezionata");
        } else {
          toast.success(`Trovati ${risultati.length} file attestato da analizzare`);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          toast.error("Errore lettura cartella", { description: (e as Error).message });
        }
      } finally {
        setInScansione(false);
      }
    } else {
      document.getElementById(inputFallbackId)?.click();
    }
  }

  /** Fallback tramite input file multiplo. */
  function gestisciFileSelezionati(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setInScansione(true);

    const risultati: FileAttestatoScansionato[] = files
      .filter((f) => haEstensioneValida(f.name))
      .map((f) => {
        const percorso = (f as any).webkitRelativePath || f.name;
        const matchDip = abbinaDipendente(percorso, dipendenti);
        const matchCorso = abbinaTipoCorso(percorso, corsi);
        const dataEstratta = estraiDataDalNome(percorso) || dataOggi;

        return {
          id: Math.random().toString(36).substring(2, 9),
          nomeFile: f.name,
          percorsoRelativo: percorso,
          file: f,
          dimensione: f.size,
          dipendenteId: matchDip.dipendente?.id || null,
          codiceFiscale: matchDip.dipendente?.codice_fiscale || "",
          nomeLavoratore: matchDip.dipendente ? `${matchDip.dipendente.cognome} ${matchDip.dipendente.nome}` : "",
          statoAbbinamento: matchDip.stato,
          tipoCorsoId: matchCorso?.id || corsi[0]?.id || "",
          dataCorso: dataEstratta,
          oreDichiarate: matchCorso?.ore_minime_legge ?? null,
          selezionato: true,
        };
      });

    setFileList(risultati);
    setInScansione(false);
    toast.success(`Caricati ${risultati.length} file da verificare`);
  }

  function toggleTutti(stato: boolean) {
    setFileList((prev) => prev.map((f) => ({ ...f, selezionato: stato })));
  }

  function aggiornaElemento(id: string, patch: Partial<FileAttestatoScansionato>) {
    setFileList((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const aggiornato = { ...f, ...patch };
        if (patch.dipendenteId) {
          const dip = dipendenti.find((d) => d.id === patch.dipendenteId);
          if (dip) {
            aggiornato.codiceFiscale = dip.codice_fiscale;
            aggiornato.nomeLavoratore = `${dip.cognome} ${dip.nome}`;
            aggiornato.statoAbbinamento = "univoco";
          }
        }
        return aggiornato;
      }),
    );
  }

  async function eseguiImportazione() {
    const daImportare = fileList.filter((f) => f.selezionato);
    if (daImportare.length === 0) {
      toast.warning("Seleziona almeno un attestato da importare");
      return;
    }

    const senzaLavoratore = daImportare.filter((f) => !f.dipendenteId);
    if (senzaLavoratore.length > 0) {
      toast.error(`${senzaLavoratore.length} file selezionati non hanno un lavoratore associato`, {
        description: "Assegna il lavoratore dalla tendina o deseleziona i file non riconosciuti.",
      });
      return;
    }

    setInSalvataggio(true);
    setAvanzamento({ corrente: 0, totale: daImportare.length });

    let inseriti = 0;
    let errori = 0;

    for (let i = 0; i < daImportare.length; i++) {
      const item = daImportare[i];
      setAvanzamento({ corrente: i + 1, totale: daImportare.length });

      try {
        let pathFoto: string | null = null;
        if (caricaSuCloud) {
          pathFoto = await uploadFoto(item.file, item.codiceFiscale, "fronte");
        } else {
          pathFoto = item.percorsoRelativo || item.nomeFile;
        }

        await creaAttestato({
          dipendente_id: item.dipendenteId!,
          codice_fiscale: item.codiceFiscale,
          tipo_corso_id: item.tipoCorsoId,
          data_corso: item.dataCorso,
          ore_dichiarate: item.oreDichiarate,
          url_foto_fronte: pathFoto,
          url_foto_retro: null,
        });

        inseriti++;
      } catch (e) {
        console.error(`Errore caricamento ${item.nomeFile}:`, e);
        errori++;
      }
    }

    setInSalvataggio(false);

    if (errori === 0) {
      toast.success(`${inseriti} attestati inseriti con successo in «In attesa» per la validazione`);
    } else {
      toast.warning(`${inseriti} attestati importati, ${errori} errori durante il salvataggio`);
    }

    onImported();
    onClose();
  }

  const selezionatiCount = fileList.filter((f) => f.selezionato).length;

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !inSalvataggio ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0 flex flex-col">
        <DialogHeader className="border-b border-border p-5 pb-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <FolderInput className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-semibold">Importa attestati da cartella</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Scansiona una cartella di attestati PDF/immagini e falli confluire nella lista «In attesa» per la validazione HR.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {fileList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/20 p-10 text-center">
              <FolderOpen className="size-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Seleziona la cartella contenente gli attestati</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  Verranno scansionati tutti i file PDF e immagini presenti, comprese le sottocartelle.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button onClick={selezionaCartellaLocale} disabled={inScansione} className="gap-2">
                  {inScansione ? <Loader2 className="size-4 animate-spin" /> : <FolderOpen className="size-4" />}
                  Scegli cartella da analizzare
                </Button>

                <input
                  id={inputFallbackId}
                  type="file"
                  multiple
                  // @ts-expect-error webkitdirectory compatibile browser Chromium/WebKit
                  webkitdirectory=""
                  className="hidden"
                  onChange={gestisciFileSelezionati}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Barra azioni selezione */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">File trovati: {fileList.length}</span>
                  <span className="text-muted-foreground">({selezionatiCount} selezionati)</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleTutti(true)} className="h-7 text-xs gap-1">
                    <CheckSquare className="size-3.5" /> Seleziona tutti
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleTutti(false)} className="h-7 text-xs gap-1">
                    <Square className="size-3.5" /> Deseleziona tutti
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setFileList([])} className="h-7 text-xs text-destructive gap-1">
                    <Trash2 className="size-3.5" /> Rimuovi scansione
                  </Button>
                </div>
              </div>

              {/* Tabella di anteprima */}
              <div className="max-h-[46vh] overflow-auto rounded-xl border border-border bg-surface">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-border bg-muted/60 backdrop-blur font-medium text-muted-foreground">
                    <tr>
                      <th className="w-10 p-2.5 text-center">Sel.</th>
                      <th className="p-2.5 min-w-[200px]">Nome file / Cartella</th>
                      <th className="p-2.5 min-w-[220px]">Lavoratore abbinato</th>
                      <th className="p-2.5 min-w-[200px]">Corso</th>
                      <th className="w-32 p-2.5">Data corso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {fileList.map((item) => (
                      <tr key={item.id} className={!item.selezionato ? "opacity-50" : undefined}>
                        <td className="p-2.5 text-center">
                          <Checkbox
                            checked={item.selezionato}
                            onCheckedChange={(c) => aggiornaElemento(item.id, { selezionato: !!c })}
                          />
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          <p className="font-semibold text-foreground truncate max-w-xs" title={item.nomeFile}>
                            {item.nomeFile}
                          </p>
                          {item.percorsoRelativo !== item.nomeFile && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-xs">
                              {item.percorsoRelativo}
                            </p>
                          )}
                        </td>
                        <td className="p-2.5">
                          <Select
                            value={item.dipendenteId || "none"}
                            onValueChange={(val) =>
                              aggiornaElemento(item.id, { dipendenteId: val === "none" ? null : val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Seleziona dipendente..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              <SelectItem value="none">-- Nessun dipendente --</SelectItem>
                              {dipendenti.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.cognome} {d.nome} ({d.codice_fiscale})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-1 flex items-center gap-1 text-[10px]">
                            {item.statoAbbinamento === "univoco" && (
                              <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                                <Check className="size-3" /> Riconosciuto
                              </span>
                            )}
                            {item.statoAbbinamento === "ambiguo" && (
                              <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                                <AlertTriangle className="size-3" /> Più corrispondenze
                              </span>
                            )}
                            {item.statoAbbinamento === "non_trovato" && (
                              <span className="flex items-center gap-0.5 text-destructive font-medium">
                                <HelpCircle className="size-3" /> Non associato
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <Select
                            value={item.tipoCorsoId}
                            onValueChange={(val) => aggiornaElemento(item.id, { tipoCorsoId: val })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Seleziona tipo corso..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              {corsi.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.codice ? `[${c.codice}] ` : ""}{c.nome_corso}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="date"
                            value={item.dataCorso}
                            onChange={(e) => aggiornaElemento(item.id, { dataCorso: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Opzione salvataggio Cloud vs Locale */}
              <div className="rounded-xl border border-border bg-surface p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="chk-cloud"
                    checked={caricaSuCloud}
                    onCheckedChange={(c) => setCaricaSuCloud(!!c)}
                  />
                  <label htmlFor="chk-cloud" className="cursor-pointer font-medium select-none">
                    Carica i file PDF anche nel Cloud protetto
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {caricaSuCloud ? (
                    <>
                      <UploadCloud className="size-3.5 text-primary" /> Caricamento nel bucket storage di Lovable Cloud
                    </>
                  ) : (
                    <>
                      <HardDrive className="size-3.5 text-muted-foreground" /> Mantiene il collegamento alla cartella locale del computer
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {inSalvataggio && (
              <span className="flex items-center gap-2 text-primary font-medium">
                <Loader2 className="size-4 animate-spin" />
                Salvataggio in corso: {avanzamento.corrente} di {avanzamento.totale}...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={inSalvataggio}>
              Annulla
            </Button>
            <Button
              onClick={eseguiImportazione}
              disabled={inSalvataggio || fileList.length === 0 || selezionatiCount === 0}
              className="gap-2"
            >
              {inSalvataggio && <Loader2 className="size-4 animate-spin" />}
              Importa {selezionatiCount > 0 ? `${selezionatiCount} attestati` : ""} in attesa
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

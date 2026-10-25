/*
 * File:          TabellaAttestati.tsx
 * Percorso:      src/features/dipendenti/components/TabellaAttestati.tsx
 * Data creazione: 2026-10-24
 * Revisioni:
 *   - Rev 1 (2026-10-24 16:30): Intestazioni ordinabili e scrollbar orizzontale sticky.
 *   - Rev 2 (2026-10-25 08:52): Colonna Documento con apertura e aggancio da cartella locale.
 *   - Rev 3 (2026-10-25 11:00): Integrazione con ricerca flessibile per cognome e refresh automatico.
 *   - Rev 4 (2026-10-25 20:30): Azioni complete: Sostituisci, Scollega file, Modifica dati e Cancella attestato.
 */
import { useState } from "react";
import { FileText, Search, ExternalLink, RefreshCw, Unlink, Pencil, Trash2 } from "lucide-react";
import {
  formatData,
  scaduto,
  statoBadgeClass,
  eliminaAttestato,
  scollegaDocumentoAttestato,
  type Dipendente,
  type Attestato,
} from "@/lib/api";
import { type ColonnaSortAttestati, type DirezioneSort, type RigaAttestato } from "../types";
import { IntestazioneOrdinabile } from "@/components/IntestazioneOrdinabile";
import { DialogCercaAgganciaAttestato } from "./DialogCercaAgganciaAttestato";
import { DialogModificaAttestato } from "./DialogModificaAttestato";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCartellaArchivio, apriDaPercorsoRelativo } from "@/lib/api/cartella-locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function TabellaAttestati({
  righe,
  dipendente,
  colonna,
  direzione,
  onOrdina,
  onAttestatoAggiornato,
}: {
  righe: RigaAttestato[];
  dipendente?: Dipendente;
  colonna: ColonnaSortAttestati;
  direzione: DirezioneSort;
  onOrdina: (colonna: ColonnaSortAttestati) => void;
  onAttestatoAggiornato?: () => void;
}) {
  const [attestatoDaAgganciare, setAttestatoDaAgganciare] = useState<Attestato | null>(null);
  const [attestatoDaModificare, setAttestatoDaModificare] = useState<Attestato | null>(null);
  const [attestatoDaEliminare, setAttestatoDaEliminare] = useState<Attestato | null>(null);
  const [eliminazioneInCorso, setEliminazioneInCorso] = useState(false);

  async function apriDocumento(percorso: string) {
    try {
      if (percorso.startsWith("Archivio Attestati") || percorso.startsWith("Coda/")) {
        const { data } = await supabase.storage.from("attestati").createSignedUrl(percorso, 3600);
        if (data?.signedUrl) {
          window.open(data.signedUrl, "_blank", "noopener");
          return;
        }
      }

      const root = await getCartellaArchivio(true);
      if (root) {
        const aperto = await apriDaPercorsoRelativo(root, percorso);
        if (aperto) return;
      }

      toast.info("File locale non trovato nel percorso memorizzato", {
        description: "Puoi cercarlo o sostituirlo cliccando sull'icona di sostituzione.",
      });
    } catch (e) {
      toast.error("Impossibile aprire il file", { description: (e as Error).message });
    }
  }

  async function handleScollegaDocumento(a: Attestato) {
    if (!confirm("Vuoi scollegare il file PDF da questo attestato? Il record del corso rimarrà registrato.")) {
      return;
    }
    try {
      await scollegaDocumentoAttestato(a.id);
      toast.success("Documento PDF scollegato con successo");
      if (onAttestatoAggiornato) onAttestatoAggiornato();
    } catch (err) {
      toast.error("Errore durante lo scollegamento del file", { description: (err as Error).message });
    }
  }

  async function handleConfermaElimina() {
    if (!attestatoDaEliminare) return;
    try {
      setEliminazioneInCorso(true);
      await eliminaAttestato(attestatoDaEliminare.id);
      toast.success("Attestato eliminato definitivamente");
      setAttestatoDaEliminare(null);
      if (onAttestatoAggiornato) onAttestatoAggiornato();
    } catch (err) {
      toast.error("Errore durante l'eliminazione dell'attestato", { description: (err as Error).message });
    } finally {
      setEliminazioneInCorso(false);
    }
  }

  return (
    <>
      <h3 className="text-sm font-semibold">Tutti gli attestati</h3>

      <div className="max-h-[380px] overflow-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[660px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur text-left text-xs text-muted-foreground shadow-xs">
            <tr>
              <IntestazioneOrdinabile colonna="corso" titolo="Corso" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
              <IntestazioneOrdinabile colonna="data" titolo="Data" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
              <IntestazioneOrdinabile colonna="scadenza" titolo="Scadenza" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
              <IntestazioneOrdinabile colonna="stato" titolo="Stato" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
              <th className="px-3 py-2 text-right">Documento e Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {righe.map((r) => {
              if (r.isAttestato && r.attestato) {
                const a = r.attestato;
                const haFile = Boolean(a.url_foto_fronte);

                return (
                  <tr key={a.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium">
                      {a.tipi_corso?.codice && (
                        <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                          [{a.tipi_corso.codice}]
                        </span>
                      )}
                      {a.tipi_corso?.nome_corso ?? "—"}
                    </td>
                    <td className="px-3 py-2">{formatData(a.data_corso)}</td>
                    <td
                      className={`px-3 py-2 ${
                        scaduto(a.data_scadenza_calcolata) ? "font-medium text-destructive" : ""
                      }`}
                    >
                      {a.data_scadenza_calcolata
                        ? formatData(a.data_scadenza_calcolata)
                        : "senza scadenza"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${statoBadgeClass(
                          a.stato_validazione,
                        )}`}
                      >
                        {a.stato_validazione}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Sezione Documento */}
                        {haFile ? (
                          <>
                            <button
                              type="button"
                              onClick={() => apriDocumento(a.url_foto_fronte!)}
                              className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                              title="Apri file collegato"
                            >
                              <FileText className="size-3.5" /> PDF
                              <ExternalLink className="size-3" />
                            </button>
                            {dipendente && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setAttestatoDaAgganciare(a)}
                                  className="inline-flex items-center gap-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  title="Sostituisci certificato con un altro file"
                                >
                                  <RefreshCw className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleScollegaDocumento(a)}
                                  className="inline-flex items-center gap-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-warning"
                                  title="Scollega file PDF (mantiene l'attestato)"
                                >
                                  <Unlink className="size-3.5" />
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          dipendente && (
                            <button
                              type="button"
                              onClick={() => setAttestatoDaAgganciare(a)}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                              title="Cerca e collega il file da archivio"
                            >
                              <Search className="size-3.5" /> Aggancia
                            </button>
                          )
                        )}

                        {/* Modifica dati attestato */}
                        {dipendente && (
                          <button
                            type="button"
                            onClick={() => setAttestatoDaModificare(a)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Modifica e imposta corso, date e ore"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}

                        {/* Cancella intero attestato */}
                        {dipendente && (
                          <button
                            type="button"
                            onClick={() => setAttestatoDaEliminare(a)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                            title="Elimina definitivamente questo attestato"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }
              if (!r.isAttestato && r.integrazione) {
                const i = r.integrazione;
                return (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium">Integrazione DVR — {i.descrizione}</td>
                    <td className="px-3 py-2">{formatData(i.data_richiesta)}</td>
                    <td className="px-3 py-2 text-muted-foreground">—</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          i.stato === "Completata"
                            ? "border-success/40 bg-success/12 text-success"
                            : "border-warning/50 bg-warning/15 text-warning-foreground"
                        }`}
                      >
                        {i.stato}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground text-xs">—</td>
                  </tr>
                );
              }
              return null;
            })}
            {!righe.length && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Nessun attestato registrato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Finestra per cercare, agganciare o sostituire file PDF */}
      {dipendente && (
        <DialogCercaAgganciaAttestato
          open={Boolean(attestatoDaAgganciare)}
          onOpenChange={(v) => !v && setAttestatoDaAgganciare(null)}
          attestato={attestatoDaAgganciare}
          dipendente={dipendente}
          onAgganciato={() => {
            if (onAttestatoAggiornato) onAttestatoAggiornato();
          }}
        />
      )}

      {/* Finestra per modificare e settare i dati dell'attestato */}
      {dipendente && (
        <DialogModificaAttestato
          open={Boolean(attestatoDaModificare)}
          onOpenChange={(v) => !v && setAttestatoDaModificare(null)}
          attestato={attestatoDaModificare}
          onSalvato={() => {
            if (onAttestatoAggiornato) onAttestatoAggiornato();
          }}
        />
      )}

      {/* Conferma eliminazione definitiva attestato */}
      <AlertDialog
        open={Boolean(attestatoDaEliminare)}
        onOpenChange={(v) => !v && setAttestatoDaEliminare(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo attestato?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per cancellare definitivamente l'attestato{" "}
              <strong>{attestatoDaEliminare?.tipi_corso?.nome_corso ?? ""}</strong> registrato in data{" "}
              {attestatoDaEliminare ? formatData(attestatoDaEliminare.data_corso) : ""}. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminazioneInCorso}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfermaElimina();
              }}
              disabled={eliminazioneInCorso}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminazioneInCorso ? "Eliminazione..." : "Elimina attestato"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

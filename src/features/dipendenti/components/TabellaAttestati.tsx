/*
 * File:          TabellaAttestati.tsx
 * Percorso:      src/features/dipendenti/components/TabellaAttestati.tsx
 * Data creazione: 2026-10-24
 * Revisioni:
 *   - Rev 1 (2026-10-24 16:30): Intestazioni ordinabili e scrollbar orizzontale sticky.
 *   - Rev 2 (2026-10-25 08:52): Colonna Documento con apertura e aggancio da cartella locale.
 *   - Rev 3 (2026-10-25 11:00): Integrazione con ricerca flessibile per cognome e refresh automatico.
 *   - Rev 4 (2026-10-25 20:30): Azioni complete: Sostituisci, Scollega file, Modifica dati e Cancella attestato.
 *   - Rev 5 (2026-10-25 21:05): Tooltip con nome file originale e apertura immediata con un clic.
 *   - Rev 6 (2026-10-25 21:20): Inserimento esplicito dell'icona Occhio per visualizzare l'allegato accanto alla matita.
 *   - Rev 7 (2026-10-29 21:50): Tasto Vedi allineato alla ricerca intelligente del Cruscotto HR (prefisso radice e ricerca per nome).
 */
import { useState } from "react";
import { Search, RefreshCw, Unlink, Pencil, Trash2, Eye } from "lucide-react";
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
import { apriDaPercorsoInTutte } from "@/lib/api/cartelle-multiple";
import { toast } from "sonner";

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
    // Apertura immediata della scheda per evitare il blocco popup del browser
    const finestra = window.open("", "_blank");
    try {
      const esito = await risolviDocumentoAttestato(percorso);
      if (esito.url) {
        if (finestra) finestra.location.href = esito.url;
        else window.open(esito.url, "_blank");
        return;
      }
      finestra?.close();
      toast.info("File non trovato nelle cartelle collegate", {
        description: "Controlla la cartella in Impostazioni generali o riaggancialo con l'icona di sostituzione.",
      });
    } catch (e) {
      finestra?.close();
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
                        {/* Sezione Documento: Occhio per visualizzare se presente, o Aggancia se mancante */}
                        {haFile ? (
                          <>
                            <button
                              type="button"
                              onClick={() => apriDocumento(a.url_foto_fronte!)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              title={`Visualizza documento allegato: ${a.url_foto_fronte}`}
                            >
                              <Eye className="size-3.5" />
                              <span>Vedi</span>
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

                        {/* Modifica dati attestato (matita) */}
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

                        {/* Cancella intero attestato (cestino) */}
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
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">—</td>
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </table>
      </div>

      {attestatoDaAgganciare && dipendente && (
        <DialogCercaAgganciaAttestato
          open={Boolean(attestatoDaAgganciare)}
          onOpenChange={(open) => !open && setAttestatoDaAgganciare(null)}
          attestato={attestatoDaAgganciare}
          dipendente={dipendente}
          onAgganciato={() => {
            setAttestatoDaAgganciare(null);
            if (onAttestatoAggiornato) onAttestatoAggiornato();
          }}
        />
      )}

      {attestatoDaModificare && dipendente && (
        <DialogModificaAttestato
          open={Boolean(attestatoDaModificare)}
          onOpenChange={(open) => !open && setAttestatoDaModificare(null)}
          attestato={attestatoDaModificare}
          onSalvato={() => {
            setAttestatoDaModificare(null);
            if (onAttestatoAggiornato) onAttestatoAggiornato();
          }}
        />
      )}

      <AlertDialog
        open={Boolean(attestatoDaEliminare)}
        onOpenChange={(open) => !open && setAttestatoDaEliminare(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questo attestato?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per cancellare la registrazione del corso{" "}
              <strong>
                {attestatoDaEliminare?.tipi_corso?.nome_corso ?? "selezionato"}
              </strong>
              . L'operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminazioneInCorso}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfermaElimina}
              disabled={eliminazioneInCorso}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminazioneInCorso ? "Eliminazione..." : "Elimina definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

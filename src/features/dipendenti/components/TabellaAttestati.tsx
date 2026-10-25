/*
 * File:          TabellaAttestati.tsx
 * Percorso:      src/features/dipendenti/components/TabellaAttestati.tsx
 * Data creazione: 2026-10-24
 * Revisioni:
 *   - Rev 1 (2026-10-24 16:30): Intestazioni ordinabili e scrollbar orizzontale sticky.
 *   - Rev 2 (2026-10-25 08:52): Colonna Documento con apertura e aggancio da cartella locale.
 *   - Rev 3 (2026-10-25 11:00): Integrazione con ricerca flessibile per cognome e refresh automatico.
 */
import { useState } from "react";
import { FileText, Search, ExternalLink } from "lucide-react";
import { formatData, scaduto, statoBadgeClass, type Dipendente, type Attestato } from "@/lib/api";
import { type ColonnaSortAttestati, type DirezioneSort, type RigaAttestato } from "../types";
import { IntestazioneOrdinabile } from "@/components/IntestazioneOrdinabile";
import { DialogCercaAgganciaAttestato } from "./DialogCercaAgganciaAttestato";
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

  async function apriDocumento(percorso: string) {
    try {
      // 1. Se è un file salvato in storage cloud
      if (percorso.startsWith("Archivio Attestati") || percorso.startsWith("Coda/")) {
        const { data } = await supabase.storage.from("attestati").createSignedUrl(percorso, 3600);
        if (data?.signedUrl) {
          window.open(data.signedUrl, "_blank", "noopener");
          return;
        }
      }

      // 2. Prova apertura da cartella locale configurata
      const root = await getCartellaArchivio(true);
      if (root) {
        const aperto = await apriDaPercorsoRelativo(root, percorso);
        if (aperto) return;
      }

      toast.info("File locale non trovato nel percorso memorizzato", {
        description: "Puoi cercarlo di nuovo cliccando sull'icona di ricerca.",
      });
    } catch (e) {
      toast.error("Impossibile aprire il file", { description: (e as Error).message });
    }
  }

  return (
    <>
      <h3 className="text-sm font-semibold">Tutti gli attestati</h3>

      {/* Contenitore con altezza fissa e scrollbar orizzontale sempre visibile */}
      <div className="max-h-[380px] overflow-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur text-left text-xs text-muted-foreground shadow-xs">
            <tr>
              <IntestazioneOrdinabile colonna="corso" titolo="Corso" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
              <IntestazioneOrdinabile colonna="data" titolo="Data" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
              <IntestazioneOrdinabile colonna="scadenza" titolo="Scadenza" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
              <IntestazioneOrdinabile colonna="stato" titolo="Stato" colonnaAttiva={colonna} direzione={direzione} onOrdina={onOrdina} />
              <th className="px-3 py-2 text-right">Documento</th>
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
                      {haFile ? (
                        <div className="inline-flex items-center gap-1.5">
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
                            <button
                              type="button"
                              onClick={() => setAttestatoDaAgganciare(a)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Riaggancia o cambia file"
                            >
                              <Search className="size-3.5" />
                            </button>
                          )}
                        </div>
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
    </>
  );
}

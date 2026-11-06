/*
 * File:      EsitoImportazione.tsx
 * Percorso:  src/features/dipendenti/import-elenco/EsitoImportazione.tsx
 * Creato:    05/11/2026
 * Messaggio finale dell'importazione «solo nuovi»: quanti inseriti e quanti già presenti
 * (con i nomi divisi tra «in forza» e «cessati»), stampa e scarico dell'elenco dei già presenti,
 * pulsante «Riabilita i cessati» (tornano in forza con data assunzione 01/09 e vanno in «Da completare»).
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 *   rev 2 — 06/11/2026 08:20 — Pulsante principale «Completa ora uno a uno (N)» che apre la finestra «Da completare».
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Download, ListChecks, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { riabilitaDipendenti } from "@/lib/api";
import { formatData } from "@/lib/api/formattazione";
import { scaricaPresenti, stampaPresenti } from "./elenco-presenti";
import type { EsitoImportazione, VoceEsito } from "./registra-nuovi";

function ElencoNomi({ titolo, voci, tono }: { titolo: string; voci: VoceEsito[]; tono: string }) {
  if (voci.length === 0) return null;
  return (
    <div className="rounded-lg border border-border">
      <div className={`border-b border-border px-3 py-1.5 text-xs font-semibold ${tono}`}>
        {titolo} ({voci.length})
      </div>
      <ul className="max-h-40 overflow-auto px-3 py-2 text-sm">
        {voci.map((v) => (
          <li key={v.cf} className="flex justify-between gap-3 py-0.5">
            <span className="font-medium">{v.cognome} {v.nome}</span>
            <span className="font-mono text-xs text-muted-foreground">{v.cf}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EsitoImportazioneElenco({
  esito,
  dataInizio,
  onChiudi,
  nDaCompletare = 0,
  onCompleta,
}: {
  esito: EsitoImportazione;
  dataInizio: string;
  onChiudi: () => void;
  /** Quanti lavoratori sono in «Da completare» (nuovi e riabilitati). */
  nDaCompletare?: number;
  onCompleta?: (() => void) | undefined;
}) {
  const qc = useQueryClient();
  const [riabilitati, setRiabilitati] = useState(false);
  const [lavoro, setLavoro] = useState(false);
  const nPresenti = esito.presentiInForza.length + esito.presentiCessati.length;

  async function riabilita() {
    const ids = esito.presentiCessati.map((v) => v.id).filter((i): i is string => !!i);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Riabilitare ${ids.length} lavoratori cessati?\n\nTornano in forza con data di assunzione ${formatData(dataInizio)} e finiscono tra i «Da completare».`,
      )
    )
      return;
    setLavoro(true);
    try {
      await riabilitaDipendenti(ids, dataInizio);
      await qc.invalidateQueries({ queryKey: ["dipendenti"] });
      setRiabilitati(true);
      toast.success(`${ids.length} lavoratori riabilitati: li trovi in «Da completare»`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLavoro(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div className="text-sm">
          <p className="font-semibold">
            Importazione completata: {esito.inseriti.length} {esito.inseriti.length === 1 ? "inserito" : "inseriti"}
            , {nPresenti} già {nPresenti === 1 ? "presente" : "presenti"}.
          </p>
          <p className="text-muted-foreground">
            I già presenti non sono stati toccati ({esito.presentiInForza.length} in forza, {esito.presentiCessati.length} cessati).
            I nuovi inseriti, con i dati ancora mancanti, li trovi nel pulsante «Da completare» dell'elenco Dipendenti.
          </p>
        </div>
      </div>

      {esito.errori.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-semibold">{esito.errori.length} segnalazioni</p>
          <ul className="list-disc pl-5">
            {esito.errori.slice(0, 8).map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <ElencoNomi titolo="Già presenti e in forza" voci={esito.presentiInForza} tono="bg-emerald-500/10 text-emerald-800" />
        <ElencoNomi titolo="Già presenti ma cessati" voci={esito.presentiCessati} tono="bg-amber-500/15 text-amber-800" />
        <ElencoNomi titolo="Codice fiscale non valido (non inseriti)" voci={esito.nonValidi} tono="bg-destructive/10 text-destructive" />
        <ElencoNomi titolo="Doppioni nel file (non inseriti)" voci={esito.doppioni} tono="bg-muted text-muted-foreground" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={nPresenti === 0} onClick={() => stampaPresenti(esito)} className="gap-1.5">
            <Printer className="size-4" /> Stampa elenco già presenti
          </Button>
          <Button variant="outline" size="sm" disabled={nPresenti === 0} onClick={() => scaricaPresenti(esito)} className="gap-1.5">
            <Download className="size-4" /> Scarica elenco
          </Button>
          {esito.presentiCessati.length > 0 && (
            <Button size="sm" disabled={lavoro || riabilitati} onClick={riabilita} className="gap-1.5">
              <RotateCcw className="size-4" />
              {riabilitati ? "Cessati riabilitati" : `Riabilita i cessati (${esito.presentiCessati.length})`}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onChiudi}>Chiudi</Button>
          {onCompleta && (
            <Button onClick={onCompleta} disabled={nDaCompletare === 0} className="gap-1.5">
              <ListChecks className="size-4" /> Completa ora uno a uno ({nDaCompletare})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

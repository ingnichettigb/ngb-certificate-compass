/*
 * File:      DialogDaCompletare.tsx
 * Percorso:  src/features/da-completare/DialogDaCompletare.tsx
 * Creato:    06/11/2026
 * Finestra dedicata che passa uno alla volta i lavoratori «Da completare» (nuovi importati con dati mancanti
 * e cessati riabilitati) nel modulo «Modifica anagrafica» già esistente. Mostra avanzamento («3 di 14»),
 * i dati mancanti, e permette Salva e prossimo / Salta / Indietro, con l'opzione di riusare la fine contratto.
 * Revisioni:
 *   rev 1 — 06/11/2026 08:20 — Prima stesura.
 */
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Dipendente } from "@/lib/api";
import { formatData } from "@/lib/api/formattazione";
import { campiMancanti, ETICHETTA_CAMPO } from "@/features/dipendenti/anagrafica-completa";
import { FormNuovoDipendente } from "@/features/dipendenti/components/FormNuovoDipendente";
import { eTornato } from "./regola-coda";
import { useCodaDaCompletare } from "./useCodaDaCompletare";

export function DialogDaCompletare({
  open,
  onClose,
  dipendenti,
  repartiAttivi,
}: {
  open: boolean;
  onClose: () => void;
  dipendenti: Dipendente[];
  repartiAttivi: string[];
}) {
  const c = useCodaDaCompletare(open, dipendenti);
  const mancantiForm = c.form ? campiMancanti(c.form) : [];
  const mancantiSalvati = c.corrente ? campiMancanti(c.corrente) : [];
  const percentuale = c.totale > 0 ? Math.round(((c.finito ? c.totale : c.indice) / c.totale) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completa i nuovi inserimenti</DialogTitle>
          <DialogDescription>
            {c.finito
              ? "Elenco terminato."
              : `Lavoratore ${c.indice + 1} di ${c.totale}. I dati mancanti sono evidenziati in giallo.`}
          </DialogDescription>
        </DialogHeader>

        {c.totale > 0 && (
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percentuale} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${percentuale}%` }} />
          </div>
        )}

        {c.finito ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div className="text-sm">
                {c.totale === 0 ? (
                  <p className="font-semibold">Non c'è nessun lavoratore da completare.</p>
                ) : (
                  <>
                    <p className="font-semibold">
                      Completati {c.completati}, saltati {c.saltati}.
                    </p>
                    {c.saltati > 0 && (
                      <p className="text-muted-foreground">
                        I saltati restano in «Da completare» finché i loro dati non sono a posto.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {c.totale > 0 && (
                <Button variant="outline" className="gap-1.5" onClick={c.indietro}>
                  <ArrowLeft className="size-4" /> Torna all'ultimo
                </Button>
              )}
              {c.saltati > 0 && (
                <Button variant="outline" className="gap-1.5" onClick={c.rivediSaltati}>
                  <RotateCcw className="size-4" /> Rivedi i saltati ({c.saltati})
                </Button>
              )}
              <Button onClick={onClose}>Chiudi</Button>
            </div>
          </div>
        ) : c.corrente && c.form ? (
          <div className="space-y-3" key={c.corrente.id}>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <div>
                <p className="text-lg font-semibold leading-tight">
                  {c.corrente.cognome} {c.corrente.nome}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{c.corrente.codice_fiscale}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {eTornato(c.corrente) && (
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs font-semibold text-sky-800">
                    Riabilitato (cessato il {formatData(c.corrente.data_cessazione ?? "")})
                  </span>
                )}
                {mancantiSalvati.map((m) => (
                  <span key={m} className="rounded bg-amber-500/25 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    manca: {ETICHETTA_CAMPO[m]}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5" disabled={c.indice === 0 || c.saving} onClick={c.indietro}>
                <ArrowLeft className="size-4" /> Indietro
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={c.riusaFine} onCheckedChange={(v) => c.setRiusaFine(v === true)} />
                Usa questa fine contratto per i prossimi
                {c.fineRicordata && <span className="text-xs text-muted-foreground">(ora: {formatData(c.fineRicordata)})</span>}
              </label>
            </div>

            <FormNuovoDipendente
              modo="modifica"
              form={c.form}
              setForm={(f) => f && c.setForm(f)}
              repartiAttivi={repartiAttivi}
              saving={c.saving}
              onSalva={c.salvaEProssimo}
              onAnnulla={c.salta}
              etichettaSalva="Salva e prossimo"
              etichettaAnnulla="Salta"
              mancanti={mancantiForm}
              focusSuMancante
            />
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Caricamento…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/*
 * File:          DialogIntegrazioneAselli.tsx
 * Percorso:      src/features/hr/components/DialogIntegrazioneAselli.tsx
 * Data creazione: 2026-10-28
 * Revisioni:
 *   - Rev 1 (2026-10-28 11:50): Popup di conferma per approvazione con integrazione SIC-SPI-04.
 */
import { useState } from "react";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Attestato } from "@/lib/api";

export const CORSO_INTEGRATIVO =
  "[SIC-SPI-04] Sicurezza Specifica Rischio MEDIO integrazione al DVR Liceo Aselli";

export function DialogIntegrazioneAselli({
  open,
  onOpenChange,
  attestato,
  busy,
  haEmail,
  onConferma,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  attestato: Attestato;
  busy: boolean;
  haEmail: boolean;
  onConferma: (dati: { ore: number; note: string; inviaEmail: boolean }) => void;
}) {
  const [ore, setOre] = useState("4");
  const [note, setNote] = useState("Integrazione al DVR Liceo Aselli con corso SIC-SPI-04");
  const [inviaEmail, setInviaEmail] = useState(haEmail);
  const d = attestato.dipendenti;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Approva in attesa di integrazione</DialogTitle>
          <DialogDescription>
            L'attestato viene registrato e si crea il corso integrativo da completare nella scheda del lavoratore.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="font-semibold">{d ? `${d.cognome} ${d.nome}` : attestato.codice_fiscale}</div>
            <div className="text-xs text-muted-foreground">
              Corso esaminato: {attestato.tipi_corso?.nome_corso ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground">Corso integrativo richiesto</div>
            <div className="mt-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 font-medium">
              {CORSO_INTEGRATIVO}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Ore</span>
              <Input type="number" min={1} value={ore} onChange={(e) => setOre(e.target.value)} />
            </label>
            <label className="col-span-2 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Note</span>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          {haEmail && (
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={inviaEmail} onCheckedChange={(c) => setInviaEmail(Boolean(c))} />
              Prepara email di esito per il dipendente
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annulla
          </Button>
          <Button
            disabled={busy}
            onClick={() => onConferma({ ore: Number(ore) || 4, note: note.trim(), inviaEmail })}
          >
            <Clock className="size-4" />
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

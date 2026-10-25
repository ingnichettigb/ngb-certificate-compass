/*
 * File:          DialogModificaAttestato.tsx
 * Percorso:      src/features/dipendenti/components/DialogModificaAttestato.tsx
 * Data creazione: 2026-10-25
 * Revisioni:
 *   - Rev 1 (2026-10-25 20:30): Dialog per modifica corso, date, ore e stato di validazione dell'attestato.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getTipiCorso,
  aggiornaAttestato,
  type Attestato,
  type Stato,
} from "@/lib/api";
import { toast } from "sonner";

export function DialogModificaAttestato({
  open,
  onOpenChange,
  attestato,
  onSalvato,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attestato: Attestato | null;
  onSalvato?: () => void;
}) {
  const { data: tipiCorso = [] } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
  });

  const [tipoCorsoId, setTipoCorsoId] = useState("");
  const [dataCorso, setDataCorso] = useState("");
  const [senzaScadenza, setSenzaScadenza] = useState(false);
  const [dataScadenza, setDataScadenza] = useState("");
  const [ore, setOre] = useState("");
  const [stato, setStato] = useState<Stato>("Approvato");
  const [note, setNote] = useState("");
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  useEffect(() => {
    if (attestato && open) {
      setTipoCorsoId(attestato.tipo_corso_id || "");
      setDataCorso(attestato.data_corso || "");
      setSenzaScadenza(!attestato.data_scadenza_calcolata);
      setDataScadenza(attestato.data_scadenza_calcolata || "");
      setOre(attestato.ore_dichiarate != null ? String(attestato.ore_dichiarate) : "");
      setStato(attestato.stato_validazione || "Approvato");
      setNote(attestato.note_rifiuto || "");
    }
  }, [attestato, open]);

  function ricalcolaScadenza(nuovoCorsoId: string, dataRif: string) {
    if (!dataRif) return;
    const corso = tipiCorso.find((c) => c.id === nuovoCorsoId);
    if (!corso || !corso.durata_validita_anni || corso.durata_validita_anni === 0) {
      setSenzaScadenza(true);
      setDataScadenza("");
      return;
    }
    const d = new Date(dataRif);
    if (!isNaN(d.getTime())) {
      d.setFullYear(d.getFullYear() + corso.durata_validita_anni);
      setDataScadenza(d.toISOString().slice(0, 10));
      setSenzaScadenza(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attestato) return;
    if (!tipoCorsoId) {
      toast.error("Seleziona il tipo di corso");
      return;
    }
    if (!dataCorso) {
      toast.error("Inserisci la data del corso");
      return;
    }

    try {
      setSalvataggioInCorso(true);
      await aggiornaAttestato(attestato.id, {
        tipo_corso_id: tipoCorsoId,
        data_corso: dataCorso,
        data_scadenza_calcolata: senzaScadenza ? null : dataScadenza || null,
        ore_dichiarate: ore.trim() ? parseFloat(ore) : null,
        stato_validazione: stato,
        note_rifiuto: stato === "Respinto" ? note.trim() || null : null,
      });

      toast.success("Dati attestato aggiornati con successo");
      if (onSalvato) onSalvato();
      onOpenChange(false);
    } catch (err) {
      toast.error("Errore durante l'aggiornamento dell'attestato", {
        description: (err as Error).message,
      });
    } finally {
      setSalvataggioInCorso(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Modifica Dati Attestato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Tipo di corso */}
          <div className="space-y-1.5">
            <Label htmlFor="tipo-corso">Tipo di corso *</Label>
            <select
              id="tipo-corso"
              value={tipoCorsoId}
              onChange={(e) => {
                const nuovoId = e.target.value;
                setTipoCorsoId(nuovoId);
                ricalcolaScadenza(nuovoId, dataCorso);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">-- Seleziona corso --</option>
              {tipiCorso.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.codice ? `[${tc.codice}] ` : ""}
                  {tc.nome_corso}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Data corso */}
            <div className="space-y-1.5">
              <Label htmlFor="data-corso">Data effettuazione *</Label>
              <Input
                id="data-corso"
                type="date"
                value={dataCorso}
                onChange={(e) => {
                  const val = e.target.value;
                  setDataCorso(val);
                  if (tipoCorsoId) ricalcolaScadenza(tipoCorsoId, val);
                }}
                required
              />
            </div>

            {/* Ore */}
            <div className="space-y-1.5">
              <Label htmlFor="ore-corso">Ore svolte</Label>
              <Input
                id="ore-corso"
                type="number"
                step="0.5"
                min="0"
                placeholder="es. 4"
                value={ore}
                onChange={(e) => setOre(e.target.value)}
              />
            </div>
          </div>

          {/* Scadenza */}
          <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="data-scadenza">Data di scadenza</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={senzaScadenza}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSenzaScadenza(checked);
                    if (checked) setDataScadenza("");
                    else if (tipoCorsoId && dataCorso) ricalcolaScadenza(tipoCorsoId, dataCorso);
                  }}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                Non scade / Illimitata
              </label>
            </div>
            <Input
              id="data-scadenza"
              type="date"
              disabled={senzaScadenza}
              value={dataScadenza}
              onChange={(e) => setDataScadenza(e.target.value)}
              className={senzaScadenza ? "opacity-50" : ""}
            />
          </div>

          {/* Stato validazione */}
          <div className="space-y-1.5">
            <Label htmlFor="stato-validazione">Stato attestato</Label>
            <select
              id="stato-validazione"
              value={stato}
              onChange={(e) => setStato(e.target.value as Stato)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Approvato">Approvato</option>
              <option value="In attesa">In attesa</option>
              <option value="Respinto">Respinto</option>
            </select>
          </div>

          {/* Note se respinto */}
          {stato === "Respinto" && (
            <div className="space-y-1.5">
              <Label htmlFor="note-rifiuto">Motivo rifiuto / Note</Label>
              <Textarea
                id="note-rifiuto"
                rows={2}
                placeholder="Spiega il motivo del rifiuto..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={salvataggioInCorso}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={salvataggioInCorso}>
              {salvataggioInCorso ? "Salvataggio..." : "Salva modifiche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

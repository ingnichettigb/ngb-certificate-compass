/*
 * File:      DialogAggiungiVoceOrganigramma.tsx
 * Percorso:  src/features/stampe/components/DialogAggiungiVoceOrganigramma.tsx
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 13:20 — Finestra per aggiungere una voce all'organigramma A3:
 *            scelta tra «Ruolo di sicurezza (collegato a DB e lavoratori)» (azzurro)
 *            oppure «Nota / Testo descrittivo» (marroncino, solo su organigramma).
 */
import { useState } from "react";
import { ShieldCheck, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import type { TipoVoceOrganigramma, VoceOrganigramma } from "@/lib/api/ditta";

type Props = {
  aperto: boolean;
  onChiudi: () => void;
  ruoliEsistenti: RuoloSicurezza[];
  onAggiungi: (voce: VoceOrganigramma, creaRuoloNelDb?: boolean) => Promise<void>;
};

export function DialogAggiungiVoceOrganigramma({ aperto, onChiudi, ruoliEsistenti, onAggiungi }: Props) {
  const [tipo, setTipo] = useState<TipoVoceOrganigramma>("ruolo");
  const [modalitaRuolo, setModalitaRuolo] = useState<"esistente" | "nuovo">("nuovo");
  const [ruoloSelezionatoId, setRuoloSelezionatoId] = useState<string>("");
  const [titoloNuovo, setTitoloNuovo] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  const ruoliDisponibili = ruoliEsistenti.filter((r) => !r.obbligatorio_tutti && r.nome.toLowerCase() !== "lavoratore");

  const resettaEChiudi = () => {
    setTipo("ruolo");
    setModalitaRuolo("nuovo");
    setRuoloSelezionatoId("");
    setTitoloNuovo("");
    onChiudi();
  };

  const handleConferma = async () => {
    setSalvataggio(true);
    try {
      if (tipo === "nota") {
        if (!titoloNuovo.trim()) return;
        await onAggiungi({ titolo: titoloNuovo.trim(), nomi: [], tipo: "nota" }, false);
      } else if (modalitaRuolo === "esistente") {
        const ruolo = ruoliDisponibili.find((r) => r.id === ruoloSelezionatoId);
        if (!ruolo) return;
        await onAggiungi({ titolo: ruolo.nome, nomi: [], tipo: "ruolo", ruolo_id: ruolo.id }, false);
      } else {
        if (!titoloNuovo.trim()) return;
        await onAggiungi({ titolo: titoloNuovo.trim(), nomi: [], tipo: "ruolo" }, true);
      }
      resettaEChiudi();
    } finally {
      setSalvataggio(false);
    }
  };

  const disabilitato =
    salvataggio ||
    (tipo === "nota" && !titoloNuovo.trim()) ||
    (tipo === "ruolo" && modalitaRuolo === "nuovo" && !titoloNuovo.trim()) ||
    (tipo === "ruolo" && modalitaRuolo === "esistente" && !ruoloSelezionatoId);

  return (
    <Dialog open={aperto} onOpenChange={(open) => !open && resettaEChiudi()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi voce all&apos;organigramma A3</DialogTitle>
          <DialogDescription>
            Scegli se collegare la voce a un ruolo di sicurezza aziendale oppure creare una nota descrittiva a sé stante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as TipoVoceOrganigramma)} className="grid grid-cols-2 gap-3">
            <label
              htmlFor="tipo-ruolo"
              className={`flex flex-col items-center justify-between rounded-lg border-2 p-3 text-center transition-all cursor-pointer ${
                tipo === "ruolo"
                  ? "border-sky-500 bg-sky-50/70 text-sky-950 shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="ruolo" id="tipo-ruolo" className="sr-only" />
              <ShieldCheck className="h-6 w-6 text-sky-600 mb-1" />
              <span className="text-xs font-semibold">Ruolo di sicurezza</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">DB, Matrice, Schede e Nomine (azzurro)</span>
            </label>

            <label
              htmlFor="tipo-nota"
              className={`flex flex-col items-center justify-between rounded-lg border-2 p-3 text-center transition-all cursor-pointer ${
                tipo === "nota"
                  ? "border-amber-600 bg-amber-50/70 text-amber-950 shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="nota" id="tipo-nota" className="sr-only" />
              <FileText className="h-6 w-6 text-amber-700 mb-1" />
              <span className="text-xs font-semibold">Nota descrittiva</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Solo organigramma (marroncino)</span>
            </label>
          </RadioGroup>

          {tipo === "ruolo" ? (
            <div className="space-y-3 rounded-md border border-sky-200 bg-sky-50/40 p-3">
              <div className="flex gap-4 text-xs font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="modalita-ruolo"
                    checked={modalitaRuolo === "nuovo"}
                    onChange={() => setModalitaRuolo("nuovo")}
                  />
                  Crea nuovo ruolo nel DB
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="modalita-ruolo"
                    checked={modalitaRuolo === "esistente"}
                    onChange={() => setModalitaRuolo("esistente")}
                  />
                  Collega a ruolo esistente
                </label>
              </div>

              {modalitaRuolo === "nuovo" ? (
                <div className="space-y-1">
                  <Label htmlFor="titolo-ruolo" className="text-xs">
                    Nome del nuovo ruolo:
                  </Label>
                  <Input
                    id="titolo-ruolo"
                    placeholder="Es. Addetto controllo uscite di emergenza"
                    value={titoloNuovo}
                    onChange={(e) => setTitoloNuovo(e.target.value)}
                    className="bg-card text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Verrà creato in <code>ruoli_sicurezza</code> e comparirà nella Matrice per assegnarlo al personale.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="seleziona-ruolo" className="text-xs">
                    Scegli tra i ruoli già presenti nel DB:
                  </Label>
                  <Select value={ruoloSelezionatoId} onValueChange={setRuoloSelezionatoId}>
                    <SelectTrigger id="seleziona-ruolo" className="bg-card text-sm">
                      <SelectValue placeholder="Seleziona un ruolo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ruoliDisponibili.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50/40 p-3">
              <Label htmlFor="titolo-nota" className="text-xs">
                Titolo della nota:
              </Label>
              <Input
                id="titolo-nota"
                placeholder="Es. Squadre di evacuazione studenti"
                value={titoloNuovo}
                onChange={(e) => setTitoloNuovo(e.target.value)}
                className="bg-card text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                I nominativi o le righe descrittive si compileranno liberamente nel riquadro marroncino.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={resettaEChiudi} disabled={salvataggio}>
            Annulla
          </Button>
          <Button onClick={handleConferma} disabled={disabilitato}>
            {salvataggio ? "Aggiunta in corso..." : "Aggiungi all'organigramma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

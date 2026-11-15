/*
 * File:      DialogModificaSede.tsx
 * Percorso:  src/features/impostazioni/ditta/DialogModificaSede.tsx
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 — Finestra «Modifica sede» (icona matita): nome, indirizzo, CAP, comune, provincia e massimo di presenti, per Sede Centrale e succursali.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHIAVE_SEDI, aggiornaSede, validaPersoneMax, type Sede } from "@/lib/api/sedi";
import { DICITURA_PERSONE_MAX } from "@/features/ditta/presenze-sedi";

interface Props {
  sede: Sede | null;
  onChiudi: () => void;
}

export function DialogModificaSede({ sede, onChiudi }: Props) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [cap, setCap] = useState("");
  const [comune, setComune] = useState("");
  const [provincia, setProvincia] = useState("");
  const [persone, setPersone] = useState("");
  const [saving, setSaving] = useState(false);

  // Ogni volta che si apre su una sede, ricarica i suoi dati
  useEffect(() => {
    if (!sede) return;
    setNome(sede.nome);
    setIndirizzo(sede.indirizzo ?? "");
    setCap(sede.cap ?? "");
    setComune(sede.comune ?? "");
    setProvincia(sede.provincia ?? "");
    setPersone(sede.persone_max ? String(sede.persone_max) : "");
  }, [sede]);

  const salva = async () => {
    if (!sede) return;
    if (!nome.trim()) {
      toast.error("Inserisci il nome della sede");
      return;
    }
    let n: number;
    try {
      n = validaPersoneMax(persone);
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    setSaving(true);
    try {
      await aggiornaSede(sede.id, { nome, indirizzo, cap, comune, provincia, persone_max: n });
      await qc.invalidateQueries({ queryKey: CHIAVE_SEDI });
      toast.success(`Sede «${nome.trim()}» aggiornata`);
      onChiudi();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Dentro il modulo Ditta: Invio salva la sede, non l'intera Ditta
  const invio = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void salva();
    }
  };

  return (
    <Dialog open={sede !== null} onOpenChange={(aperto) => !aperto && onChiudi()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifica {sede?.is_principale ? "Sede Centrale" : "sede / plesso"}</DialogTitle>
          <DialogDescription>
            {sede?.is_principale
              ? "La Sede Centrale resta unica e non si elimina. L'indirizzo legale dell'azienda si cambia nell'anagrafica Ditta."
              : "Correggi i dati del plesso. I lavoratori e gli incarichi assegnati restano collegati."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <div className="col-span-2 space-y-1 md:col-span-6">
            <Label htmlFor="mod-sede-nome">Nome sede / plesso</Label>
            <Input id="mod-sede-nome" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={invio} />
          </div>
          <div className="col-span-2 space-y-1 md:col-span-6">
            <Label htmlFor="mod-sede-ind">Indirizzo</Label>
            <Input id="mod-sede-ind" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} onKeyDown={invio} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="mod-sede-cap">CAP</Label>
            <Input id="mod-sede-cap" value={cap} onChange={(e) => setCap(e.target.value)} onKeyDown={invio} />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label htmlFor="mod-sede-comune">Comune</Label>
            <Input id="mod-sede-comune" value={comune} onChange={(e) => setComune(e.target.value)} onKeyDown={invio} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mod-sede-prov">Prov.</Label>
            <Input id="mod-sede-prov" maxLength={2} value={provincia} onChange={(e) => setProvincia(e.target.value)} onKeyDown={invio} />
          </div>
          <div className="col-span-2 space-y-1 md:col-span-6">
            <Label htmlFor="mod-sede-persone" className="text-[11px] leading-tight">
              {DICITURA_PERSONE_MAX}
              <span className="text-destructive"> *</span>
            </Label>
            <Input
              id="mod-sede-persone"
              type="number"
              min={1}
              step={1}
              required
              value={persone}
              onChange={(e) => setPersone(e.target.value)}
              onKeyDown={invio}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onChiudi} disabled={saving}>
            Annulla
          </Button>
          <Button type="button" onClick={() => void salva()} disabled={saving}>
            Salva modifiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

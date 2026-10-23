/*
 * File:      CampiValidazione.tsx
 * Percorso:  src/features/hr/components/CampiValidazione.tsx
 * Campi correggibili da HR: tipo corso, data, ore e note di rifiuto.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function CampiValidazione({
  corsi,
  tipoCorsoId,
  setTipoCorsoId,
  dataCorso,
  setDataCorso,
  ore,
  setOre,
  mostraNote,
  note,
  setNote,
}: {
  corsi: { id: string; nome_corso: string; macro_categoria: string }[];
  tipoCorsoId: string;
  setTipoCorsoId: (v: string) => void;
  dataCorso: string;
  setDataCorso: (v: string) => void;
  ore: string;
  setOre: (v: string) => void;
  mostraNote: boolean;
  note: string;
  setNote: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Tipo corso</Label>
        <Select value={tipoCorsoId} onValueChange={setTipoCorsoId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {corsi.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.macro_categoria} — {c.nome_corso}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Data corso</Label>
          <Input type="date" value={dataCorso} onChange={(e) => setDataCorso(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Ore dichiarate</Label>
          <Input type="number" step="0.5" value={ore} onChange={(e) => setOre(e.target.value)} />
        </div>
      </div>

      {mostraNote && (
        <div className="space-y-2">
          <Label>Note di rifiuto *</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Indica il motivo del respingimento"
          />
        </div>
      )}
    </>
  );
}

/*
 * File:      NuovoReparto.tsx
 * Percorso:  src/features/impostazioni/reparti/NuovoReparto.tsx
 * Campo e pulsante per aggiungere un reparto all'elenco.
 */
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  valore: string;
  onCambia: (v: string) => void;
  onAggiungi: (nome: string) => void;
  occupato: boolean;
}

export function NuovoReparto({ valore, onCambia, onAggiungi, occupato }: Props) {
  return (
    <div className="flex gap-2">
      <Input
        value={valore}
        onChange={(e) => onCambia(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valore.trim()) onAggiungi(valore);
        }}
        placeholder="Nuovo reparto, es. Collaboratore"
      />
      <Button onClick={() => onAggiungi(valore)} disabled={!valore.trim() || occupato}>
        {occupato ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Aggiungi
      </Button>
    </div>
  );
}

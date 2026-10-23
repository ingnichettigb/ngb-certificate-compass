/*
 * File:      NuovaClasseConcorso.tsx
 * Percorso:  src/features/impostazioni/insegnamento/NuovaClasseConcorso.tsx
 * Campi per aggiungere una classe di concorso (codice e denominazione facoltativa).
 */
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  codice: string;
  onCodice: (v: string) => void;
  denominazione: string;
  onDenominazione: (v: string) => void;
  onAggiungi: () => void;
  occupato: boolean;
}

export function NuovaClasseConcorso({
  codice,
  onCodice,
  denominazione,
  onDenominazione,
  onAggiungi,
  occupato,
}: Props) {
  return (
    <div className="flex gap-2">
      <Input
        value={codice}
        onChange={(e) => onCodice(e.target.value.toUpperCase())}
        placeholder="A-26"
        className="w-28 uppercase"
      />
      <Input
        value={denominazione}
        onChange={(e) => onDenominazione(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && codice.trim()) onAggiungi();
        }}
        placeholder="Denominazione (facoltativa)"
      />
      <Button onClick={onAggiungi} disabled={!codice.trim() || occupato}>
        {occupato ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Aggiungi
      </Button>
    </div>
  );
}

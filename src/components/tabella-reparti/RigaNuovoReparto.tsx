/*
 * File:      RigaNuovoReparto.tsx
 * Percorso:  src/components/tabella-reparti/RigaNuovoReparto.tsx
 * Ultima riga della tabella reparti: nome e ordine del reparto da inserire.
 */
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

interface Props {
  nome: string;
  ordine: string;
  onNome: (v: string) => void;
  onOrdine: (v: string) => void;
  onInserisci: () => void;
  occupato: boolean;
}

export function RigaNuovoReparto({ nome, ordine, onNome, onOrdine, onInserisci, occupato }: Props) {
  return (
    <TableRow>
      <TableCell className="p-1.5">
        <Input
          value={nome}
          onChange={(e) => onNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onInserisci();
          }}
          placeholder="Nuovo reparto…"
          className="h-9"
        />
      </TableCell>
      <TableCell className="p-1.5">
        <Input
          type="number"
          value={ordine}
          onChange={(e) => onOrdine(e.target.value)}
          placeholder="auto"
          className="h-9"
        />
      </TableCell>
      <TableCell colSpan={2} />
      <TableCell className="p-1.5">
        <Button
          size="icon"
          variant="outline"
          disabled={!nome.trim() || occupato}
          onClick={onInserisci}
          aria-label="Aggiungi reparto"
        >
          {occupato ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </Button>
      </TableCell>
    </TableRow>
  );
}

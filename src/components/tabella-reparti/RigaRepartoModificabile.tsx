/*
 * File:      RigaRepartoModificabile.tsx
 * Percorso:  src/components/tabella-reparti/RigaRepartoModificabile.tsx
 * Riga della tabella reparti: ogni cella si modifica sul posto e si salva da sola.
 */
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Reparto } from "@/lib/api";

interface Props {
  reparto: Reparto;
  occupato: boolean;
  onSalva: <K extends keyof Reparto>(campo: K, valore: Reparto[K]) => void;
  onRimuovi: () => void;
}

export function RigaRepartoModificabile({ reparto: r, occupato, onSalva, onRimuovi }: Props) {
  return (
    <TableRow className={occupato ? "opacity-60" : ""}>
      <TableCell className="p-1.5">
        <Input
          defaultValue={r.nome}
          disabled={occupato}
          onBlur={(e) => onSalva("nome", e.target.value.trim())}
          className="h-9"
        />
      </TableCell>
      <TableCell className="p-1.5">
        <Input
          type="number"
          defaultValue={r.ordine}
          disabled={occupato}
          onBlur={(e) => onSalva("ordine", Number(e.target.value) || 0)}
          className="h-9"
        />
      </TableCell>
      <TableCell className="p-1.5 text-center">
        <Switch
          checked={r.attivo}
          disabled={occupato}
          onCheckedChange={(v) => onSalva("attivo", v)}
        />
      </TableCell>
      <TableCell className="p-1.5 text-center">
        <Switch
          checked={r.richiede_classe_concorso}
          disabled={occupato}
          onCheckedChange={(v) => onSalva("richiede_classe_concorso", v)}
        />
      </TableCell>
      <TableCell className="p-1.5">
        <Button
          variant="ghost"
          size="icon"
          disabled={occupato}
          onClick={onRimuovi}
          aria-label={`Elimina ${r.nome}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

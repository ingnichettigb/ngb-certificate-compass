/*
 * File:      PulsanteEsporta.tsx
 * Percorso:  src/components/tabella-comune/PulsanteEsporta.tsx
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 10:50 — Bottone «Esporta» delle tabelle: al clic propone la scelta tra Excel (.xlsx) e CSV.
 */
import { useState } from "react";
import { ChevronDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FormatoEsportazione } from "./esporta-tabella";

interface Props {
  /** Esegue l'esportazione nel formato scelto; se fallisce compare un avviso. */
  onEsporta: (formato: FormatoEsportazione) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function PulsanteEsporta({ onEsporta, disabled, className }: Props) {
  const [inCorso, setInCorso] = useState(false);

  async function scegli(formato: FormatoEsportazione) {
    setInCorso(true);
    try {
      await onEsporta(formato);
    } catch {
      toast.error("Esportazione non riuscita");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          disabled={disabled || inCorso}
          data-aiuto="Scarica la tabella: scegli Excel (.xlsx) oppure CSV"
        >
          {inCorso ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Esporta{" "}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void scegli("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void scegli("csv")}>CSV (.csv)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

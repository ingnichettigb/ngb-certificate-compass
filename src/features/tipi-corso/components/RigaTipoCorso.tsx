/*
 * File:      RigaTipoCorso.tsx
 * Percorso:  src/features/tipi-corso/components/RigaTipoCorso.tsx
 * Una riga della tabella corsi: maniglia e frecce, celle modificabili, interruttore, cestino.
 */
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { type TipoCorso } from "@/lib/api";
import { CellaNumerica } from "./CellaNumerica";

export function RigaTipoCorso({
  c,
  indice,
  totale,
  occupata,
  inTrascinamento,
  onSalvaCampo,
  onRimuovi,
  onSposta,
  onIniziaTrascinamento,
  onFinisciTrascinamento,
  onTrascinaSopra,
  onLasciaRiga,
  onRilascia,
}: {
  c: TipoCorso;
  indice: number;
  totale: number;
  occupata: boolean;
  inTrascinamento: boolean;
  onSalvaCampo: <K extends keyof TipoCorso>(campo: K, valore: TipoCorso[K]) => void;
  onRimuovi: () => void;
  onSposta: (direzione: -1 | 1) => void;
  onIniziaTrascinamento: () => void;
  onFinisciTrascinamento: () => void;
  onTrascinaSopra: () => void;
  onLasciaRiga: () => void;
  onRilascia: () => void;
}) {
  return (
    <TableRow
     
      className={`${occupata ? "opacity-60" : ""} ${inTrascinamento ? "bg-accent/40" : ""}`}
      onDragOver={(e) => {
  e.preventDefault();
  onTrascinaSopra();
}}
      onDragLeave={onLasciaRiga}
      onDrop={(e) => {
  e.preventDefault();
  onRilascia();
}}
    >
      <TableCell className="p-1.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            draggable
            onDragStart={onIniziaTrascinamento}
            onDragEnd={onFinisciTrascinamento}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label={`Trascina per spostare ${c.nome_corso}`}
            title="Trascina per riordinare"
          >
            <GripVertical className="size-4" />
          </button>
          <div className="flex flex-col">
            <button
              type="button"
              disabled={indice === 0 || occupata}
              onClick={() => onSposta(-1)}
              className="text-muted-foreground hover:text-foreground disabled:opacity-20"
              aria-label={`Sposta su ${c.nome_corso}`}
            >
              ▲
            </button>
            <button
              type="button"
              disabled={indice === totale - 1 || occupata}
              onClick={() => onSposta(1)}
              className="text-muted-foreground hover:text-foreground disabled:opacity-20"
              aria-label={`Sposta giù ${c.nome_corso}`}
            >
              ▼
            </button>
          </div>
        </div>
      </TableCell>
      <TableCell className="p-1.5">
        <Input
          defaultValue={c.codice ?? ""}
          disabled={occupata}
          onBlur={(e) => onSalvaCampo("codice", e.target.value.trim() || null)}
          title={c.codice ?? "Codice del corso"}
          className="h-9 min-w-[110px] font-mono text-xs"

        />
      </TableCell>

      <TableCell className="p-1.5">
        <Input
          defaultValue={c.nome_corso}
          disabled={occupata}
          onBlur={(e) => onSalvaCampo("nome_corso", e.target.value.trim())}
          className="h-9"
        />
        <span className="pl-1 text-xs text-muted-foreground">
          {c.macro_categoria} · {c.livello_specifico}
        </span>
      </TableCell>
      <CellaNumerica valore={c.ore_minime_legge} disabled={occupata} onSalva={(v) => onSalvaCampo("ore_minime_legge", v)} />
      <CellaNumerica valore={c.durata_validita_anni} placeholder="non scade" disabled={occupata} onSalva={(v) => onSalvaCampo("durata_validita_anni", v)} />
      <CellaNumerica valore={c.anni_aggiornamento} placeholder="—" disabled={occupata} onSalva={(v) => onSalvaCampo("anni_aggiornamento", v)} />
      <CellaNumerica valore={c.ore_aggiornamento} placeholder="—" disabled={occupata} onSalva={(v) => onSalvaCampo("ore_aggiornamento", v)} />
      <TableCell className="p-1.5">
        <Input
          defaultValue={c.codice_corso_aggiornamento ?? ""}
          placeholder="—"
          disabled={occupata}
          onBlur={(e) =>
            onSalvaCampo("codice_corso_aggiornamento", e.target.value.trim() || null)
          }
          className="h-9 min-w-[96px] font-mono text-xs"
        />
      </TableCell>

      <TableCell className="p-1.5 text-center">
        <Switch
          checked={c.visibile_lavoratore}
          disabled={occupata}
          onCheckedChange={(v) => onSalvaCampo("visibile_lavoratore", v)}
          aria-label={`Mostra ${c.nome_corso} a chi carica l'attestato`}
        />
      </TableCell>
      <TableCell className="p-1.5">
        <Button
          variant="ghost"
          size="icon"
          disabled={occupata}
          onClick={() => onRimuovi()}
          aria-label={`Elimina ${c.nome_corso}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

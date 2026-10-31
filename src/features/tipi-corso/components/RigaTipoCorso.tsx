/*
 * File:      RigaTipoCorso.tsx
 * Percorso:  src/features/tipi-corso/components/RigaTipoCorso.tsx
 * Una riga della tabella corsi: maniglia e frecce, celle modificabili, interruttore, cestino.
 * Revisioni:
 * - Rev 3: 2026-10-26 17:15 - Sfondo per argomento e blocco dei corsi standard del programma.
 * - Rev 4: 2026-10-31 13:40 - Corsi standard modificabili (solo eliminazione bloccata).
 */
import { GripVertical, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { type TipoCorso } from "@/lib/api";
import { CellaNumerica } from "./CellaNumerica";
import { assegnaGruppoArgomento, isCorsoProtetto } from "../tipi-raggruppamento";

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
  const gruppo = assegnaGruppoArgomento(c);
  const protetto = isCorsoProtetto(c);
  // Rev 4 (31/10/2026 13:40): i corsi standard ora sono modificabili; restano solo non eliminabili.
  const blocca = occupata;
  const bloccoCls = "";

  return (
    <TableRow
      className={`${gruppo.coloreSfondo} ${occupata ? "opacity-60" : ""} ${inTrascinamento ? "bg-accent/40" : ""}`}
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
            <button type="button" disabled={indice === 0 || occupata} onClick={() => onSposta(-1)} className="text-muted-foreground hover:text-foreground disabled:opacity-20" aria-label={`Sposta su ${c.nome_corso}`}>▲</button>
            <button type="button" disabled={indice === totale - 1 || occupata} onClick={() => onSposta(1)} className="text-muted-foreground hover:text-foreground disabled:opacity-20" aria-label={`Sposta giù ${c.nome_corso}`}>▼</button>
          </div>
        </div>
      </TableCell>
      <TableCell className="p-1.5">
        <Input
          defaultValue={c.codice ?? ""}
          disabled={blocca}
          onBlur={(e) => onSalvaCampo("codice", e.target.value.trim() || null)}
          title={protetto ? "Corso standard del programma: non modificabile" : (c.codice ?? "Codice del corso")}
          className={`h-9 min-w-[110px] font-mono text-xs ${bloccoCls}`}
        />
      </TableCell>
      <TableCell className="p-1.5">
        <Input
          defaultValue={c.nome_corso}
          disabled={blocca}
          onBlur={(e) => onSalvaCampo("nome_corso", e.target.value.trim())}
          className={`h-9 ${bloccoCls}`}
        />
        <span className="flex items-center gap-1 pl-1 text-xs text-muted-foreground">
          <span className={`font-medium ${gruppo.coloreTesto}`}>{gruppo.titolo}</span> · {c.livello_specifico}
          {protetto && (
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              <Lock className="size-2.5" /> standard
            </span>
          )}
        </span>
      </TableCell>
      <CellaNumerica valore={c.ore_minime_legge} disabled={blocca} onSalva={(v) => onSalvaCampo("ore_minime_legge", v)} />
      <CellaNumerica valore={c.durata_validita_anni} placeholder="N/A" zeroComeVuoto title="Lascia vuoto, scrivi 0 o N/A se il corso non scade" disabled={blocca} onSalva={(v) => onSalvaCampo("durata_validita_anni", v)} />
      <CellaNumerica valore={c.anni_aggiornamento} placeholder="—" disabled={blocca} onSalva={(v) => onSalvaCampo("anni_aggiornamento", v)} />
      <CellaNumerica valore={c.ore_aggiornamento} placeholder="—" disabled={blocca} onSalva={(v) => onSalvaCampo("ore_aggiornamento", v)} />
      <TableCell className="p-1.5">
        <Input
          defaultValue={c.codice_corso_aggiornamento ?? ""}
          placeholder="—"
          disabled={blocca}
          onBlur={(e) => onSalvaCampo("codice_corso_aggiornamento", e.target.value.trim() || null)}
          className={`h-9 min-w-[96px] font-mono text-xs ${bloccoCls}`}
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
        {protetto ? (
          <Button variant="ghost" size="icon" disabled title="Corso standard: non eliminabile" aria-label={`${c.nome_corso} protetto`}>
            <Lock className="size-4 opacity-40" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" disabled={occupata} onClick={() => onRimuovi()} aria-label={`Elimina ${c.nome_corso}`}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

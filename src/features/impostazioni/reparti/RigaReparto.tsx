/*
 * File:      RigaReparto.tsx
 * Percorso:  src/features/impostazioni/reparti/RigaReparto.tsx
 * Una riga dell'elenco reparti: nome, interruttore "Nel modulo", eliminazione e dettaglio apribile
 * (classe di concorso e sottoreparti).
 */
import { ChevronDown, ChevronRight, GraduationCap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { getReparti, getSottoreparti } from "@/lib/api";
import { SottorepartiBox } from "../SottorepartiBox";

type Reparto = Awaited<ReturnType<typeof getReparti>>[number];
type Sottoreparto = Awaited<ReturnType<typeof getSottoreparti>>[number];

interface Props {
  reparto: Reparto;
  figli: Sottoreparto[];
  aperto: boolean;
  occupato: boolean;
  onApriChiudi: () => void;
  onCambiaAttivo: (attivo: boolean) => void;
  onCambiaClasse: (richiede: boolean) => void;
  onRimuovi: () => void;
  onSottorepartiCambiati: () => void;
}

export function RigaReparto({
  reparto: r,
  figli,
  aperto,
  occupato,
  onApriChiudi,
  onCambiaAttivo,
  onCambiaClasse,
  onRimuovi,
  onSottorepartiCambiati,
}: Props) {
  return (
    <li>
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <button
          type="button"
          onClick={onApriChiudi}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={aperto}
        >
          {aperto ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            <span className={`font-medium ${r.attivo ? "" : "text-muted-foreground"}`}>
              {r.nome}
            </span>
            <span className="block text-xs text-muted-foreground">
              {figli.length
                ? `${figli.length} ${figli.length === 1 ? "sottoreparto" : "sottoreparti"}`
                : "nessun sottoreparto"}
              {r.richiede_classe_concorso ? " · classe di concorso richiesta" : ""}
            </span>
          </span>
        </button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {r.attivo ? "Nel modulo" : "Nascosto"}
          <Switch checked={r.attivo} disabled={occupato} onCheckedChange={onCambiaAttivo} />
        </label>
        <Button
          variant="ghost"
          size="icon"
          disabled={occupato}
          onClick={onRimuovi}
          aria-label={`Elimina ${r.nome}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      {aperto && (
        <div className="space-y-3 border-t border-border bg-muted/30 px-3 py-3">
          <label className="flex items-start gap-3 rounded-lg bg-surface px-3 py-2.5 text-sm">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">
              Chiedi classe di concorso e materia
              <span className="block text-xs text-muted-foreground">
                Da attivare per i docenti: i valori inseriti alimentano l'elenco dei suggerimenti.
              </span>
            </span>
            <Switch
              checked={!!r.richiede_classe_concorso}
              disabled={occupato}
              onCheckedChange={onCambiaClasse}
            />
          </label>
          <SottorepartiBox repartoId={r.id} figli={figli} onChanged={onSottorepartiCambiati} />
        </div>
      )}
    </li>
  );
}

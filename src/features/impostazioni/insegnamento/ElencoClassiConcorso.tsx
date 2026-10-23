/*
 * File:      ElencoClassiConcorso.tsx
 * Percorso:  src/features/impostazioni/insegnamento/ElencoClassiConcorso.tsx
 * Elenco delle classi di concorso con ricerca, interruttore "nel modulo" ed eliminazione.
 */
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { getClassiConcorso } from "@/lib/api";

type ClasseConcorso = Awaited<ReturnType<typeof getClassiConcorso>>[number];

interface Props {
  totale: number;
  classi: ClasseConcorso[];
  isLoading: boolean;
  filtro: string;
  onFiltro: (v: string) => void;
  busy: string | null;
  onCambiaAttiva: (id: string, attivo: boolean) => void;
  onRimuovi: (id: string, etichetta: string) => void;
}

export function ElencoClassiConcorso({
  totale,
  classi,
  isLoading,
  filtro,
  onFiltro,
  busy,
  onCambiaAttiva,
  onRimuovi,
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Classi di concorso ({totale})</p>
        <Input
          value={filtro}
          onChange={(e) => onFiltro(e.target.value)}
          placeholder="Cerca…"
          className="h-8 w-40"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Caricamento…
        </div>
      ) : (
        <ul className="max-h-64 divide-y divide-border overflow-auto rounded-lg border border-border">
          {classi.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-16 shrink-0 font-mono text-xs">{c.codice}</span>
              <span className={`flex-1 truncate ${c.attivo ? "" : "text-muted-foreground"}`}>
                {c.denominazione ?? "—"}
                {c.usi > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    usata {c.usi} {c.usi === 1 ? "volta" : "volte"}
                  </span>
                )}
              </span>
              <Switch
                checked={c.attivo}
                disabled={busy === c.id}
                onCheckedChange={(v) => onCambiaAttiva(c.id, v)}
                aria-label={`Mostra ${c.codice} nel modulo`}
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={busy === c.id}
                onClick={() => onRimuovi(c.id, c.codice)}
                aria-label={`Elimina ${c.codice}`}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {!classi.length && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nessuna classe di concorso.
            </li>
          )}
        </ul>
      )}
    </>
  );
}

/*
 * File:      ElencoMaterie.tsx
 * Percorso:  src/features/impostazioni/insegnamento/ElencoMaterie.tsx
 * Materie raccolte dai moduli compilati dai docenti, con eliminazione.
 */
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { getMaterie } from "@/lib/api";

type Materia = Awaited<ReturnType<typeof getMaterie>>[number];

interface Props {
  materie: Materia[];
  busy: string | null;
  onRimuovi: (id: string, nome: string) => void;
}

export function ElencoMaterie({ materie, busy, onRimuovi }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Materie raccolte ({materie.length})</p>
      {materie.length ? (
        <ul className="max-h-48 divide-y divide-border overflow-auto rounded-lg border border-border">
          {materie.map((m) => (
            <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1 truncate">
                {m.nome}
                <span className="block text-xs text-muted-foreground">
                  {m.classe_concorso ? `${m.classe_concorso} · ` : ""}
                  indicata {m.usi} {m.usi === 1 ? "volta" : "volte"}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy === m.id}
                onClick={() => onRimuovi(m.id, m.nome)}
                aria-label={`Elimina ${m.nome}`}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Ancora nessuna materia. Si riempie da sola man mano che i docenti compilano il modulo.
        </p>
      )}
    </div>
  );
}

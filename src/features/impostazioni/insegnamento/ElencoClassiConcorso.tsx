/*
 * File:      ElencoClassiConcorso.tsx
 * Percorso:  src/features/impostazioni/insegnamento/ElencoClassiConcorso.tsx
 * Elenco delle classi di concorso con ricerca, interruttore "nel modulo", modifica della denominazione ed eliminazione.
 * Revisioni:
 *   - Rev 2 (2026-10-31 10:00): Denominazione modificabile (matita → scrivi → Invio per salvare, Esc per annullare).
 */
import { useState } from "react";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
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
  /** Salva la denominazione; restituisce true se il salvataggio è riuscito. */
  onSalvaDenominazione: (id: string, testo: string) => Promise<boolean>;
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
  onSalvaDenominazione,
  onRimuovi,
}: Props) {
  const [inModifica, setInModifica] = useState<string | null>(null);
  const [bozza, setBozza] = useState("");

  function iniziaModifica(c: ClasseConcorso) {
    setInModifica(c.id);
    setBozza(c.denominazione ?? "");
  }

  async function conferma(id: string) {
    const ok = await onSalvaDenominazione(id, bozza);
    if (ok) setInModifica(null);
  }

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
              {inModifica === c.id ? (
                <>
                  <Input
                    autoFocus
                    value={bozza}
                    onChange={(e) => setBozza(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void conferma(c.id);
                      if (e.key === "Escape") setInModifica(null);
                    }}
                    placeholder="Denominazione della classe di concorso"
                    aria-label={`Denominazione di ${c.codice}`}
                    className="h-8 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy === c.id}
                    onClick={() => void conferma(c.id)}
                    aria-label={`Salva denominazione di ${c.codice}`}
                  >
                    <Check className="size-4 text-success" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setInModifica(null)}
                    aria-label="Annulla modifica"
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span
                    className={`flex-1 truncate ${c.attivo ? "" : "text-muted-foreground"}`}
                    title={c.denominazione ?? undefined}
                  >
                    {c.denominazione ?? "—"}
                    {c.usi > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        usata {c.usi} {c.usi === 1 ? "volta" : "volte"}
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy === c.id}
                    onClick={() => iniziaModifica(c)}
                    aria-label={`Modifica denominazione di ${c.codice}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </>
              )}
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

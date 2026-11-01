/*
 * File:          CartelleAggiuntive.tsx
 * Percorso:      src/features/impostazioni/CartelleAggiuntive.tsx
 * Data creazione: 2026-10-27
 * Revisioni:
 *   - Rev 1 (2026-10-27 21:05): Elenco cartelle archivio aggiuntive con Aggiungi / Riautorizza / Scollega.
 *   - Rev 2 (2026-11-01 12:20): Visualizzazione percorso esteso e tasto per aprire/sfogliare la cartella.
 */
import { useEffect, useState } from "react";
import { FolderPlus, FolderX, FolderSync, Folder, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { verificaPermessi } from "@/lib/api/cartella-locale";
import {
  elencoCartelle,
  aggiungiCartella,
  rimuoviCartellaAggiuntiva,
  type CartellaCollegata,
} from "@/lib/api/cartelle-multiple";

type Props = {
  onSfoglia?: () => void;
};

export function CartelleAggiuntive({ onSfoglia }: Props) {
  const [lista, setLista] = useState<(CartellaCollegata & { ok: boolean })[]>([]);

  async function ricarica() {
    const tutte = (await elencoCartelle()).filter((c) => !c.principale);
    setLista(await Promise.all(tutte.map(async (c) => ({ ...c, ok: await verificaPermessi(c.handle, false) }))));
  }
  useEffect(() => {
    ricarica();
  }, []);

  async function aggiungi() {
    try {
      const h = await aggiungiCartella();
      if (h) toast.success(`Cartella "${h.name}" aggiunta`);
      ricarica();
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="font-medium">Altre cartelle collegate</h4>
          <p className="text-xs text-muted-foreground">
            La ricerca degli attestati avviene in tutte le cartelle. Al salvataggio puoi scegliere dove scrivere.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={aggiungi}>
          <FolderPlus className="size-4" /> Aggiungi cartella
        </Button>
      </div>
      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna cartella aggiuntiva.</p>
      ) : (
        <ul className="divide-y divide-border">
          {lista.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Folder className="size-4 text-primary" /> {c.nome}
                  {!c.ok && <span className="text-xs text-muted-foreground">(permesso da rinnovare)</span>}
                </span>
                {c.percorso && (
                  <span className="text-[11px] font-mono text-muted-foreground pl-6 truncate">
                    {c.percorso}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 shrink-0">
                {onSfoglia && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={onSfoglia}>
                    <FolderOpen className="size-3.5" /> Sfoglia
                  </Button>
                )}
                {!c.ok && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={async () => {
                      await verificaPermessi(c.handle, true);
                      ricarica();
                    }}
                  >
                    <FolderSync className="size-3.5" /> Riautorizza
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    if (!window.confirm(`Scollegare "${c.nome}"?`)) return;
                    await rimuoviCartellaAggiuntiva(c.id);
                    ricarica();
                  }}
                >
                  <FolderX className="size-3.5" /> Scollega
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

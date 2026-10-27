/*
 * File:          CartelleAggiuntive.tsx
 * Percorso:      src/features/impostazioni/CartelleAggiuntive.tsx
 * Data creazione: 2026-10-27
 * Revisioni:
 *   - Rev 1 (2026-10-27 21:05): Elenco cartelle archivio aggiuntive con Aggiungi / Riautorizza / Scollega.
 */
import { useEffect, useState } from "react";
import { FolderPlus, FolderX, FolderSync, Folder } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { verificaPermessi } from "@/lib/api/cartella-locale";
import {
  elencoCartelle,
  aggiungiCartella,
  rimuoviCartellaAggiuntiva,
  type CartellaCollegata,
} from "@/lib/api/cartelle-multiple";

export function CartelleAggiuntive() {
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
            <li key={c.nome} className="flex items-center justify-between gap-2 py-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Folder className="size-4 text-primary" /> {c.nome}
                {!c.ok && <span className="text-xs text-muted-foreground">(permesso da rinnovare)</span>}
              </span>
              <span className="flex gap-1">
                {!c.ok && (
                  <Button size="sm" variant="outline" onClick={async () => { await verificaPermessi(c.handle, true); ricarica(); }}>
                    <FolderSync className="size-4" /> Riautorizza
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    if (!window.confirm(`Scollegare "${c.nome}"?`)) return;
                    await rimuoviCartellaAggiuntiva(c.handle);
                    ricarica();
                  }}
                >
                  <FolderX className="size-4" /> Scollega
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

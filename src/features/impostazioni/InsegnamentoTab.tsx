/*
 * File:      InsegnamentoTab.tsx
 * Percorso:  src/features/impostazioni/InsegnamentoTab.tsx
 * Scheda Classi di concorso e materie.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  aggiungiClasseConcorso,
  eliminaClasseConcorso,
  eliminaMateria,
  getClassiConcorso,
  getMaterie,
  impostaClasseAttiva,
} from "@/lib/api";
import { ErroreTabelle } from "./ErroreTabelle";

export function InsegnamentoTab() {
  const qc = useQueryClient();
  const [codice, setCodice] = useState("");
  const [denominazione, setDenominazione] = useState("");
  const [filtro, setFiltro] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const {
    data: classi = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["classi_concorso"],
    queryFn: getClassiConcorso,
    retry: false,
  });
  const { data: materie = [] } = useQuery({
    queryKey: ["materie"],
    queryFn: getMaterie,
    retry: false,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["classi_concorso"] });
    qc.invalidateQueries({ queryKey: ["materie"] });
  }

  const classiFiltrate = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    if (!t) return classi;
    return classi.filter(
      (c) =>
        c.codice.toLowerCase().includes(t) || (c.denominazione ?? "").toLowerCase().includes(t),
    );
  }, [classi, filtro]);

  async function aggiungi() {
    setBusy("nuovo");
    try {
      await aggiungiClasseConcorso(codice, denominazione);
      setCodice("");
      setDenominazione("");
      refresh();
    } catch (e) {
      toast.error("Classe non aggiunta", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function cambiaAttiva(id: string, attivo: boolean) {
    setBusy(id);
    try {
      await impostaClasseAttiva(id, attivo);
      refresh();
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function rimuovi(id: string, etichetta: string) {
    if (!window.confirm(`Eliminare "${etichetta}" dai suggerimenti?`)) return;
    setBusy(id);
    try {
      await eliminaClasseConcorso(id);
      refresh();
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function rimuoviMateria(id: string, nome: string) {
    if (!window.confirm(`Eliminare la materia "${nome}" dai suggerimenti?`)) return;
    setBusy(id);
    try {
      await eliminaMateria(id);
      refresh();
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  if (error) return <ErroreTabelle messaggio={(error as Error).message} />;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Elenco proposto ai docenti nel modulo. Ogni valore nuovo scritto da un lavoratore viene
        aggiunto qui in automatico, così col tempo l'elenco si completa da solo.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Classi di concorso ({classi.length})</p>
          <Input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
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
            {classiFiltrate.map((c) => (
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
                  onCheckedChange={(v) => cambiaAttiva(c.id, v)}
                  aria-label={`Mostra ${c.codice} nel modulo`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy === c.id}
                  onClick={() => rimuovi(c.id, c.codice)}
                  aria-label={`Elimina ${c.codice}`}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
            {!classiFiltrate.length && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nessuna classe di concorso.
              </li>
            )}
          </ul>
        )}

        <div className="flex gap-2">
          <Input
            value={codice}
            onChange={(e) => setCodice(e.target.value.toUpperCase())}
            placeholder="A-26"
            className="w-28 uppercase"
          />
          <Input
            value={denominazione}
            onChange={(e) => setDenominazione(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && codice.trim()) aggiungi();
            }}
            placeholder="Denominazione (facoltativa)"
          />
          <Button onClick={aggiungi} disabled={!codice.trim() || busy === "nuovo"}>
            {busy === "nuovo" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Aggiungi
          </Button>
        </div>
      </div>

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
                  onClick={() => rimuoviMateria(m.id, m.nome)}
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
    </div>
  );
}

/*
 * File:      RepartiTab.tsx
 * Percorso:  src/features/impostazioni/RepartiTab.tsx
 * Scheda Reparti: elenco, attivazione, eliminazione e importazione dai dipendenti.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, GraduationCap, Loader2, Plus, Trash2 } from "lucide-react";
import { TabellaRepartiDialog } from "@/components/TabellaRepartiDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  aggiungiReparto,
  eliminaReparto,
  getDipendenti,
  getReparti,
  getSottoreparti,
  impostaRepartoAttivo,
  impostaRepartoClasseConcorso,
} from "@/lib/api";
import { ErroreTabelle } from "./ErroreTabelle";
import { SottorepartiBox } from "./SottorepartiBox";

export function RepartiTab() {
  const qc = useQueryClient();
  const [nuovo, setNuovo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [aperti, setAperti] = useState<Set<string>>(new Set());

  const {
    data: reparti = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reparti"],
    queryFn: getReparti,
    retry: false,
  });
  const { data: sottoreparti = [] } = useQuery({
    queryKey: ["sottoreparti"],
    queryFn: getSottoreparti,
    retry: false,
  });
  const { data: dipendenti = [] } = useQuery({
    queryKey: ["dipendenti"],
    queryFn: getDipendenti,
  });

  // Valori di "reparto" già scritti a mano nei dipendenti ma non ancora in elenco.
  const daImportare = useMemo(() => {
    const presenti = new Set(reparti.map((r) => r.nome.trim().toLowerCase()));
    const visti = new Map<string, string>();
    for (const d of dipendenti) {
      const v = (d.reparto ?? "").trim();
      if (!v || v.length > 40 || /^\d/.test(v)) continue; // salta vuoti e date importate male
      const k = v.toLowerCase();
      if (!presenti.has(k) && !visti.has(k)) visti.set(k, v);
    }
    return Array.from(visti.values())
      .sort((a, b) => a.localeCompare(b, "it"))
      .slice(0, 30);
  }, [dipendenti, reparti]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["reparti"] });
    qc.invalidateQueries({ queryKey: ["sottoreparti"] });
  }

  function apriChiudi(id: string) {
    setAperti((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function aggiungi(nome: string) {
    const ordine = reparti.reduce((m, r) => Math.max(m, r.ordine), 0) + 1;
    setBusy("nuovo");
    try {
      await aggiungiReparto(nome, ordine);
      setNuovo("");
      refresh();
    } catch (e) {
      toast.error("Reparto non aggiunto", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function cambiaAttivo(id: string, attivo: boolean) {
    setBusy(id);
    try {
      await impostaRepartoAttivo(id, attivo);
      refresh();
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function cambiaClasse(id: string, richiede: boolean) {
    setBusy(id);
    try {
      await impostaRepartoClasseConcorso(id, richiede);
      refresh();
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function rimuovi(id: string, nome: string) {
    if (
      !window.confirm(
        `Togliere "${nome}" dall'elenco? I dipendenti che l'hanno già scelto lo mantengono.`,
      )
    )
      return;
    setBusy(id);
    try {
      await eliminaReparto(id);
      refresh();
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  if (error) return <ErroreTabelle messaggio={(error as Error).message} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex-1 text-sm text-muted-foreground">
          Il lavoratore sceglie il proprio reparto da questo elenco. Apri un reparto per gestire i
          sottoreparti (es. ATA → AA, AT, CS, DSGA) e per decidere se chiedere classe di concorso e
          materia.
        </p>
        <TabellaRepartiDialog />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Caricamento…
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {reparti.map((r) => {
            const figli = sottoreparti.filter((s) => s.reparto_id === r.id);
            const aperto = aperti.has(r.id);
            return (
              <li key={r.id}>
                <div className="flex items-center gap-2 px-3 py-2 text-sm">
                  <button
                    type="button"
                    onClick={() => apriChiudi(r.id)}
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
                    <Switch
                      checked={r.attivo}
                      disabled={busy === r.id}
                      onCheckedChange={(v) => cambiaAttivo(r.id, v)}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy === r.id}
                    onClick={() => rimuovi(r.id, r.nome)}
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
                          Da attivare per i docenti: i valori inseriti alimentano l'elenco dei
                          suggerimenti.
                        </span>
                      </span>
                      <Switch
                        checked={!!r.richiede_classe_concorso}
                        disabled={busy === r.id}
                        onCheckedChange={(v) => cambiaClasse(r.id, v)}
                      />
                    </label>
                    <SottorepartiBox repartoId={r.id} figli={figli} onChanged={refresh} />
                  </div>
                )}
              </li>
            );
          })}
          {!reparti.length && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nessun reparto. Aggiungine uno qui sotto.
            </li>
          )}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={nuovo}
          onChange={(e) => setNuovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nuovo.trim()) aggiungi(nuovo);
          }}
          placeholder="Nuovo reparto, es. Collaboratore"
        />
        <Button onClick={() => aggiungi(nuovo)} disabled={!nuovo.trim() || busy === "nuovo"}>
          {busy === "nuovo" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Aggiungi
        </Button>
      </div>

      {daImportare.length > 0 && (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            Già presenti nei dipendenti ma non nell'elenco. Tocca per aggiungerli:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {daImportare.map((v) => (
              <button
                key={v}
                onClick={() => aggiungi(v)}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs hover:bg-accent/40"
              >
                + {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

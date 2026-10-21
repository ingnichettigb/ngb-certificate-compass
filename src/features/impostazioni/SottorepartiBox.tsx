/*
 * File:      SottorepartiBox.tsx
 * Percorso:  src/features/impostazioni/SottorepartiBox.tsx
 * Sottoreparti di un reparto (es. ATA → AA, AT, CS, DSGA).
 */
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  aggiungiSottoreparto,
  eliminaSottoreparto,
  impostaSottorepartoAttivo,
  type Sottoreparto,
} from "@/lib/api";

export function SottorepartiBox({
  repartoId,
  figli,
  onChanged,
}: {
  repartoId: string;
  figli: Sottoreparto[];
  onChanged: () => void;
}) {
  const [codice, setCodice] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function aggiungi() {
    const ordine = figli.reduce((m, s) => Math.max(m, s.ordine), 0) + 1;
    setBusy("nuovo");
    try {
      await aggiungiSottoreparto({ reparto_id: repartoId, nome, codice, ordine });
      setNome("");
      setCodice("");
      onChanged();
    } catch (e) {
      toast.error("Sottoreparto non aggiunto", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function cambiaAttivo(id: string, attivo: boolean) {
    setBusy(id);
    try {
      await impostaSottorepartoAttivo(id, attivo);
      onChanged();
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function rimuovi(id: string, etichetta: string) {
    if (!window.confirm(`Togliere "${etichetta}" dai sottoreparti?`)) return;
    setBusy(id);
    try {
      await eliminaSottoreparto(id);
      onChanged();
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Sottoreparti</p>
      {figli.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {figli.map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              {s.codice && (
                <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                  {s.codice}
                </span>
              )}
              <span className={`flex-1 ${s.attivo ? "" : "text-muted-foreground"}`}>{s.nome}</span>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                {s.attivo ? "Nel modulo" : "Nascosto"}
                <Switch
                  checked={s.attivo}
                  disabled={busy === s.id}
                  onCheckedChange={(v) => cambiaAttivo(s.id, v)}
                />
              </label>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy === s.id}
                onClick={() => rimuovi(s.id, s.codice ? `${s.codice} — ${s.nome}` : s.nome)}
                aria-label={`Elimina ${s.nome}`}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={codice}
          onChange={(e) => setCodice(e.target.value.toUpperCase())}
          placeholder="Sigla"
          className="w-24 uppercase"
          maxLength={10}
        />
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nome.trim()) aggiungi();
          }}
          placeholder="Nuovo sottoreparto, es. Assistente tecnico"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={aggiungi}
          disabled={!nome.trim() || busy === "nuovo"}
        >
          {busy === "nuovo" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

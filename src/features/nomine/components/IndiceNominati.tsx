/*
 * File:      IndiceNominati.tsx
 * Percorso:  src/features/nomine/components/IndiceNominati.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Indice a fianco dell'anteprima: nominativi dell'organigramma con spunta per la stampa, clic per vedere la lettera,
 *            aggiunta di un lavoratore a mano.
 *   rev 2 — 16/11/2026 — Cestino su ogni nominato (toglie la persona da questa lista di nomine, senza toccare database e organigramma),
 *            «Ripristina eliminati»; il nome scritto a mano viene portato in MAIUSCOLO.
 *   rev 3 — 16/11/2026 — Etichetta «Organigramma» accanto ai nominati che arrivano dalle voci dell'organigramma (non dai ruoli assegnati nei Dipendenti).
 */
import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { inMaiuscolo, maiuscolo } from "@/lib/testo-maiuscolo";
import type { Nominato } from "../nominativi";

type Props = {
  nominati: Nominato[];
  selezionati: Set<string>;
  attivo: string | null;
  candidati: Nominato[];
  onAttivo: (id: string) => void;
  onSpunta: (id: string, valore: boolean) => void;
  onTutti: (valore: boolean) => void;
  onAggiungi: (n: Nominato) => void;
  /** Toglie il nominato da questa lista (non cancella nulla dal database). */
  onElimina: (id: string) => void;
  /** Quanti nominati sono stati tolti dalla lista. */
  eliminati: number;
  onRipristinaEliminati: () => void;
};

export function IndiceNominati({
  nominati,
  selezionati,
  attivo,
  candidati,
  onAttivo,
  onSpunta,
  onTutti,
  onAggiungi,
  onElimina,
  eliminati,
  onRipristinaEliminati,
}: Props) {
  const [scelta, setScelta] = useState("");
  const [libero, setLibero] = useState("");
  const aggiungi = () => {
    const c = candidati.find((x) => x.id === scelta);
    if (c) onAggiungi(c);
    else if (maiuscolo(libero)) {
      const nome = maiuscolo(libero);
      onAggiungi({ id: `manuale:${nome}`, nome, origine: "manuale" });
    }
    setScelta("");
    setLibero("");
  };
  return (
    <aside
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
      aria-label="Indice dei nominati"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Nominati ({selezionati.size}/{nominati.length})
        </h2>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onTutti(true)}>
            Tutti
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onTutti(false)}>
            Nessuno
          </Button>
        </div>
      </div>
      {nominati.length === 0 && (
        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          Nessun nominativo nell'organigramma per questa nomina. Assegna il ruolo ai lavoratori
          (Dipendenti) oppure aggiungi i nomi alla voce corrispondente dell'organigramma; in
          alternativa aggiungi qui sotto un lavoratore a mano.
        </p>
      )}
      <ol className="flex max-h-[55vh] flex-col gap-1 overflow-auto">
        {nominati.map((n, i) => (
          <li
            key={n.id}
            className={`flex items-center gap-2 rounded-md px-2 py-1 ${attivo === n.id ? "bg-accent" : "hover:bg-muted"}`}
          >
            <Checkbox
              checked={selezionati.has(n.id)}
              onCheckedChange={(v) => onSpunta(n.id, v === true)}
              aria-label={`Stampa ${n.nome}`}
            />
            <button
              type="button"
              className="min-w-0 flex-1 text-left text-sm"
              onClick={() => onAttivo(n.id)}
            >
              <span className="mr-1 text-xs text-muted-foreground">{i + 1}.</span>
              {n.nome}
              {n.origine === "voce" && (
                <span
                  className="ml-1.5 rounded bg-sky-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-sky-800"
                  title="Nominativo scritto nelle voci dell'organigramma"
                >
                  Organigramma
                </span>
              )}
              {n.dettaglio && (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {n.dettaglio}
                </span>
              )}
            </button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 text-destructive hover:bg-destructive/10"
              onClick={() => onElimina(n.id)}
              title="Togli dalla lista"
              aria-label={`Togli ${n.nome} dalla lista`}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ol>
      {eliminati > 0 && (
        <Button size="sm" variant="outline" onClick={onRipristinaEliminati}>
          <RotateCcw className="size-4" /> Ripristina eliminati ({eliminati})
        </Button>
      )}
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground">Aggiungi a mano</p>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={scelta}
          onChange={(e) => setScelta(e.target.value)}
          aria-label="Lavoratore da aggiungere"
        >
          <option value="">— scegli un lavoratore —</option>
          {candidati.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <Input
          placeholder="oppure scrivi il nome"
          value={libero}
          onChange={(e) => setLibero(inMaiuscolo(e.target.value))}
        />
        <Button size="sm" variant="outline" onClick={aggiungi} disabled={!scelta && !maiuscolo(libero)}>
          <Plus className="size-4" /> Aggiungi
        </Button>
      </div>
    </aside>
  );
}

/*
 * File:      IndiceNominati.tsx
 * Percorso:  src/features/nomine/components/IndiceNominati.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Indice a fianco dell'anteprima: nominativi dell'organigramma con spunta per la stampa, clic per vedere la lettera,
 *            aggiunta di un lavoratore a mano.
 *   rev 2 — 16/11/2026 — Nomine collegate a un ruolo del DB (registro, DPI, SDS): «Aggiungi» assegna l'incarico e il cestino lo toglie
 *            (stessi dati dell'organigramma); niente nome scritto a mano, si sceglie solo tra i lavoratori.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  /** Nomina collegata a un ruolo del DB: toglie l'incarico (compare il cestino sui nominati che vengono dal ruolo). */
  onRimuovi?: (n: Nominato) => void;
  /** Solo scelta dall'elenco dei lavoratori, senza nome scritto a mano. */
  soloElenco?: boolean;
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
  onRimuovi,
  soloElenco = false,
}: Props) {
  const [scelta, setScelta] = useState("");
  const [libero, setLibero] = useState("");
  const aggiungi = () => {
    const c = candidati.find((x) => x.id === scelta);
    if (c) onAggiungi(c);
    else if (libero.trim())
      onAggiungi({ id: `manuale:${libero.trim()}`, nome: libero.trim(), origine: "manuale" });
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
          {soloElenco
            ? "Nessun incarico assegnato. Scegli qui sotto un lavoratore e premi «Aggiungi»: comparirà anche nell'organigramma."
            : "Nessun nominativo nell'organigramma per questa nomina. Assegna il ruolo ai lavoratori (Dipendenti) oppure aggiungi i nomi alla voce corrispondente dell'organigramma; in alternativa aggiungi qui sotto un lavoratore a mano."}
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
              {n.dettaglio && (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {n.dettaglio}
                </span>
              )}
            </button>
            {onRimuovi && n.origine === "ruolo" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10"
                title="Togli l'incarico (si toglie anche dall'organigramma)"
                aria-label={`Togli l'incarico a ${n.nome}`}
                onClick={() => onRimuovi(n)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </li>
        ))}
      </ol>
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground">{soloElenco ? "Aggiungi un incaricato" : "Aggiungi a mano"}</p>
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
        {!soloElenco && (
          <Input
            placeholder="oppure scrivi il nome"
            value={libero}
            onChange={(e) => setLibero(e.target.value)}
          />
        )}
        <Button size="sm" variant="outline" onClick={aggiungi} disabled={!scelta && !libero.trim()}>
          <Plus className="size-4" /> Aggiungi
        </Button>
      </div>
    </aside>
  );
}

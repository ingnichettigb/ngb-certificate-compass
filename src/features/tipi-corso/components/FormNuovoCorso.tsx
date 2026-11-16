/*
 * File:      FormNuovoCorso.tsx
 * Percorso:  src/features/tipi-corso/components/FormNuovoCorso.tsx
 * Riga per aggiungere un nuovo corso in fondo alla tabella.
 * Revisioni:
 *   rev 1 - (originale) - Riga di inserimento nuovo corso.
 *   rev 2 - 16/11/2026 19:58 - Prima di aggiungere mostra i corsi simili già in archivio
 *           (con "Rendi visibile" per quelli nascosti) e chiede conferma se ce ne sono.
 */
import { type Dispatch, type SetStateAction } from "react";
import { Eye, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TipoCorso } from "@/lib/api";
import { VUOTO } from "../types";
import { cercaInArchivio } from "../cerca-in-archivio";

export function FormNuovoCorso({
  nuovo,
  setNuovo,
  busy,
  onInserisci,
  corsi = [],
  onRendiVisibile,
}: {
  nuovo: typeof VUOTO;
  setNuovo: Dispatch<SetStateAction<typeof VUOTO>>;
  busy: string | null;
  onInserisci: () => void;
  corsi?: TipoCorso[];
  onRendiVisibile?: (c: TipoCorso) => void;
}) {
  const simili = cercaInArchivio(corsi, nuovo.codice, nuovo.nome_corso);

  function conferma() {
    if (!nuovo.nome_corso.trim()) return;
    if (
      simili.length > 0 &&
      !window.confirm(
        `In archivio ci sono ${simili.length} corsi simili (vedi elenco sotto). Vuoi aggiungere comunque un corso nuovo?`,
      )
    )
      return;
    onInserisci();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input
          value={nuovo.codice}
          onChange={(e) => setNuovo((n) => ({ ...n, codice: e.target.value.toUpperCase() }))}
          placeholder="Codice (es. RLS-BAS-32)"
          className="w-40 font-mono text-xs"
        />
        <Input
          value={nuovo.nome_corso}
          onChange={(e) => setNuovo((n) => ({ ...n, nome_corso: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nuovo.nome_corso.trim()) conferma();
          }}
          placeholder="Nome del nuovo corso"
          className="min-w-[220px] flex-1"
        />
        <Input
          value={nuovo.ore}
          onChange={(e) => setNuovo((n) => ({ ...n, ore: e.target.value }))}
          placeholder="Ore"
          inputMode="decimal"
          className="w-20"
        />
        <Input
          value={nuovo.macro_categoria}
          onChange={(e) => setNuovo((n) => ({ ...n, macro_categoria: e.target.value }))}
          placeholder="Categoria (es. Antincendio)"
          className="w-48"
        />
        <Button onClick={conferma} disabled={!nuovo.nome_corso.trim() || busy === "nuovo"}>
          {busy === "nuovo" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Aggiungi corso
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Scrivi codice o nome: prima ti mostro se il corso è già in archivio.
      </p>
      {simili.length > 0 && (
        <div className="rounded-md border border-accent bg-accent/30 p-2 text-sm">
          <p className="mb-1 font-medium">Già in archivio ({simili.length}):</p>
          <ul className="space-y-1">
            {simili.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{c.codice}</span>
                <span className="flex-1">{c.nome_corso}</span>
                <span className="text-xs text-muted-foreground">{c.ore ?? "–"} h</span>
                {c.visibile_lavoratore ? (
                  <span className="text-xs text-primary">visibile</span>
                ) : onRendiVisibile ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === c.id}
                    onClick={() => onRendiVisibile(c)}
                  >
                    <Eye className="size-4" /> Rendi visibile
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">nascosto</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

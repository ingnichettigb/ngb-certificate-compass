/*
 * File:      FormNuovoCorso.tsx
 * Percorso:  src/features/tipi-corso/components/FormNuovoCorso.tsx
 * Riga per aggiungere un nuovo corso in fondo alla tabella.
 */
import { type Dispatch, type SetStateAction } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VUOTO } from "../types";

export function FormNuovoCorso({
  nuovo,
  setNuovo,
  busy,
  onInserisci,
}: {
  nuovo: typeof VUOTO;
  setNuovo: Dispatch<SetStateAction<typeof VUOTO>>;
  busy: string | null;
  onInserisci: () => void;
}) {
  return (
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
          if (e.key === "Enter" && nuovo.nome_corso.trim()) onInserisci();
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
      <Button onClick={onInserisci} disabled={!nuovo.nome_corso.trim() || busy === "nuovo"}>
        {busy === "nuovo" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        Aggiungi corso
      </Button>
    </div>
  );
}

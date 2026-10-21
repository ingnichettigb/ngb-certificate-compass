/*
 * File:      IntestazioneOperatore.tsx
 * Percorso:  src/features/operatore/components/IntestazioneOperatore.tsx
 * Titolo della pagina, impostazioni AI e pulsante «Carica documento».
 */
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ImpostaAiButton } from "@/features/ai/ImpostaAiButton";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IntestazioneOperatore({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Torna alla home"
          aria-label="Torna alla home"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Postazione Operatore</h1>
          <p className="text-sm text-muted-foreground">Verifica, lettura automatica con AI e archiviazione attestati</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ImpostaAiButton />
        <Button onClick={() => inputRef.current?.click()} className="gap-2">
          <Plus className="size-4" /> Carica documento
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
    </div>
  );
}

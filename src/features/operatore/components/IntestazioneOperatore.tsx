/*
 * File:      IntestazioneOperatore.tsx
 * Percorso:  src/features/operatore/components/IntestazioneOperatore.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Titolo della pagina, impostazioni AI e pulsante «Carica documento».
 *   rev 2 — 28/10/2026 09:30 — Titolo aggiornato in «Inserimento Attestati».
 *   rev 3 — 07/11/2026 — Titolo «Inserimento singolo» (distinto dal massivo); tolta la freccia «Home».
 */
import { useRef } from "react";
import { ImpostaAiButton } from "@/features/ai/ImpostaAiButton";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IntestazioneOperatore({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inserimento singolo</h1>
          <p className="text-sm text-muted-foreground">Un attestato alla volta: verifica, lettura automatica con AI e archiviazione</p>
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

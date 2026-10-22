/*
 * File:      CaricaCompletato.tsx
 * Percorso:  src/features/carica/components/CaricaCompletato.tsx
 * Schermata mostrata dopo l'invio dell'attestato.
 */
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CaricaCompletato({ onAltro }: { onAltro: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-background px-5 text-center">
      <CheckCircle2 className="size-14 text-success" />
      <h1 className="font-display text-2xl font-semibold">Attestato inviato</h1>
      <p className="text-sm text-muted-foreground">
        Il tuo attestato è in attesa di validazione da parte dell'ufficio personale. Riceverai
        l'esito via email.
      </p>
      <Button
        onClick={onAltro}
      >
        Carica un altro attestato
      </Button>
    </main>
  );
}

/*
 * File:      IntestazioneCarica.tsx
 * Percorso:  src/features/carica/components/IntestazioneCarica.tsx
 * Intestazione della pagina «Carica il tuo attestato».
 */
import { Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export function IntestazioneCarica() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
        <Link to="/" aria-label="Torna alla home">
          <ArrowLeft className="size-5 text-muted-foreground" />
        </Link>
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-base font-semibold">Carica il tuo attestato</h1>
          <p className="text-xs text-muted-foreground">Formazione sicurezza</p>
        </div>
      </div>
    </header>
  );
}

/*
 * File:      CardPostazioneOperatore.tsx
 * Percorso:  src/features/home/components/CardPostazioneOperatore.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Scheda postazione operatore con OCR AI.
 *   rev 2 — 28/10/2026 09:30 — Rinomina titolo in «Inserimento attestati».
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CardPostazioneOperatore() {
  return (
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Bot className="size-5" />
        </span>
        <Button asChild>
          <Link to="/operatore">
            Apri inserimento
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <h2 className="mt-4 text-xl font-semibold">Inserimento attestati</h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Carica foto e PDF da cartella o scanner, esegui la lettura automatica con intelligenza
        artificiale, archivia i documenti e compila i registri.
      </p>

      <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Lettura automatica con AI
        </div>
        <p className="mt-1">
          Estrae nominativo, codice fiscale, data del corso ed ente formatore direttamente dal file.
        </p>
      </div>
    </article>
  );
}

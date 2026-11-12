/*
 * File:      CardNomine.tsx
 * Percorso:  src/features/home/components/CardNomine.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Scheda «Nomine» della home: apre la pagina con le lettere di nomina degli addetti.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CardNomine() {
  return (
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          <FileSignature className="size-5" />
        </span>
        <Button asChild>
          <Link to="/nomine">
            NOMINE
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <h2 className="mt-4 text-xl font-semibold">Nomine</h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Lettere di nomina di primo soccorso, antincendio, evacuazione, registro antincendio, DPI e
        schede di sicurezza: nominativi dall&apos;organigramma, testo modificabile, anteprima e PDF
        con l&apos;intestazione della ditta.
      </p>
    </article>
  );
}

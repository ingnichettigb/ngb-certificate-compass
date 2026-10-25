/*
 * File:      CardDashboardHr.tsx
 * Percorso:  src/features/home/components/CardDashboardHr.tsx
 * Scheda «Dashboard HR» con i collegamenti a dashboard, dipendenti e scaduti.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CardDashboardHr() {
  return (
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
      <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Monitor className="size-5" />
      </span>

      <h2 className="mt-4 text-xl font-semibold">Dashboard HR</h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Elenco degli attestati caricati: visualizza l&apos;immagine,
        correggi i dati letti dal documento e valida o respingi l&apos;attestato.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/hr">
            Apri dashboard
            <ArrowRight className="size-4" />
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link to="/dipendenti">Elenco dipendenti</Link>
        </Button>

        <Button asChild variant="outline">
          <Link to="/scadenze">Scaduti</Link>
        </Button>
      </div>
    </article>
  );
}

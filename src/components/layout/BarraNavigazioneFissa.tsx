/*
 * File:      BarraNavigazioneFissa.tsx
 * Percorso:  src/components/layout/BarraNavigazioneFissa.tsx
 * Data creaz: 28/10/2026
 * Revisioni:
 *   rev 1 — 28/10/2026 17:40 — Barra di navigazione fissa superiore con le 4 sezioni chiave (TanStack Router).
 */
import { Link } from "@tanstack/react-router";
import { Bot, CheckCircle2, Users, Calendar, Home } from "lucide-react";

const VOCI_NAV = [
  { to: "/" as const, label: "Home", Icona: Home },
  { to: "/operatore" as const, label: "Inserimento attestati", Icona: Bot },
  { to: "/hr" as const, label: "Validazione HR", Icona: CheckCircle2 },
  { to: "/dipendenti" as const, label: "Dipendenti", Icona: Users },
  { to: "/scadenze" as const, label: "Scadenze & Piano Corsi", Icona: Calendar },
];

export function BarraNavigazioneFissa() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {VOCI_NAV.map(({ to, label, Icona }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-primary bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
              activeProps={{
                className: "!bg-primary !text-primary-foreground shadow-sm ring-2 ring-primary/40",
              }}
            >
              <Icona className="size-3.5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

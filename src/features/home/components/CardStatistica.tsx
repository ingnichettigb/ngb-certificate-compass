/*
 * File:      CardStatistica.tsx
 * Percorso:  src/features/home/components/CardStatistica.tsx
 * Scheda cliccabile con un contatore della home.
 * Revisioni:
 *   rev 2 — 27/11/2026 — Prop facoltativa «search»: la scheda può aprire la pagina con un filtro già attivo.
 */
import { Link } from "@tanstack/react-router";

export function CardStatistica({
  label,
  value,
  icon: Icon,
  tone = "default",
  to,
  search,
}: {
  label: string;
  value?: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "destructive";
  to: string;
  /** Parametri dell'indirizzo (es. { stato: "senza_pdf" }). */
  search?: Record<string, string>;
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-primary";

  return (
    <Link
      to={to}
      search={search as never}
      className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${toneClass}`} />
      </div>

      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{value ?? "—"}</p>
    </Link>
  );
}

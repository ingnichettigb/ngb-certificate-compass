/*
 * File:      StatCard.tsx
 * Percorso:  src/features/home/components/StatCard.tsx
 * Singolo contatore cliccabile (etichetta, icona e numero).
 */
import { Link } from "@tanstack/react-router";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  to,
}: {
  label: string;
  value?: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "destructive";
  to: string;
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
      className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${toneClass}`} />
      </div>

      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
        {value ?? "—"}
      </p>
    </Link>
  );
}

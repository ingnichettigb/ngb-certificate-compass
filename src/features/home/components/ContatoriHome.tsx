/*
 * File:      ContatoriHome.tsx
 * Percorso:  src/features/home/components/ContatoriHome.tsx
 * Griglia dei cinque contatori (dipendenti, attestati, in attesa, in scadenza, scaduti).
 */
import { CalendarClock, Clock, FileCheck2, ShieldCheck, AlertTriangle } from "lucide-react";
import { type Statistiche } from "../statistiche";
import { StatCard } from "./StatCard";

export function ContatoriHome({ stats }: { stats: Statistiche | undefined }) {
  return (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <StatCard
      label="Dipendenti"
      value={stats?.dipendenti}
      icon={ShieldCheck}
      to="/dipendenti"
    />
    <StatCard
      label="Attestati"
      value={stats?.attestati}
      icon={FileCheck2}
      to="/hr"
    />
    <StatCard
      label="In attesa di validazione"
      value={stats?.attesa}
      icon={Clock}
      tone="warning"
      to="/hr"
    />
    <StatCard
      label="In scadenza (6 mesi)"
      value={stats?.inScadenza6m}
      icon={CalendarClock}
      tone="warning"
      to="/scadenze"
    />
    <StatCard
      label="Scaduti"
      value={stats?.scaduti}
      icon={AlertTriangle}
      tone="destructive"
      to="/scadenze"
    />
  </div>
  );
}

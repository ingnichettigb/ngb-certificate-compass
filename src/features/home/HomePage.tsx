/*
 * File:      HomePage.tsx
 * Percorso:  src/features/home/HomePage.tsx
 * Pagina iniziale: testata, contatori e tre schede di accesso (lavoratore, HR, operatore).
 */
import { AlertTriangle, CalendarClock, Clock, FileCheck2, FileX, ShieldCheck } from "lucide-react";
import { IntestazioneHome } from "./components/IntestazioneHome";
import { CardStatistica } from "./components/CardStatistica";
import { CardModuloLavoratore } from "./components/CardModuloLavoratore";
import { CardDashboardHr } from "./components/CardDashboardHr";
import { CardPostazioneOperatore } from "./components/CardPostazioneOperatore";
import { useStatisticheHome } from "./hooks/useStatisticheHome";

// Rev 2 (2026-10-28 10:55): sesto contatore «Senza PDF».
export function HomePage() {
  const { data: stats } = useStatisticheHome();

  return (
    <main className="min-h-screen bg-background">
      <IntestazioneHome />

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <CardStatistica
            label="Dipendenti"
            value={stats?.dipendenti}
            icon={ShieldCheck}
            to="/dipendenti"
          />
          <CardStatistica label="Attestati" value={stats?.attestati} icon={FileCheck2} to="/hr" />
          <CardStatistica
            label="In attesa di validazione"
            value={stats?.attesa}
            icon={Clock}
            tone="warning"
            to="/hr"
          />
          <CardStatistica
            label="In scadenza (6 mesi)"
            value={stats?.inScadenza6m}
            icon={CalendarClock}
            tone="warning"
            to="/scadenze"
          />
          <CardStatistica
            label="Scaduti"
            value={stats?.scaduti}
            icon={AlertTriangle}
            tone="destructive"
            to="/scadenze"
          />
          <CardStatistica label="Senza PDF" value={stats?.senzaPdf} icon={FileX} to="/hr" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <CardModuloLavoratore />
          <CardDashboardHr />
          <CardPostazioneOperatore />
        </div>
      </section>
    </main>
  );
}

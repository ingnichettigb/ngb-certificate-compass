/*
 * File:      SceltaTipoStampa.tsx
 * Percorso:  src/features/stampe/components/SceltaTipoStampa.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Pagina d'ingresso di «Stampe & Report»: scelta tra Stampa personalizzata e Stampe predefinite.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, LayoutList, SlidersHorizontal } from "lucide-react";

const CARTA =
  "group flex h-full flex-col gap-3 rounded-lg border-2 border-border bg-card p-6 transition-all hover:border-verde-vivo hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde-vivo";

export function SceltaTipoStampa() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1400px] px-5 py-4">
          <h1 className="text-lg font-semibold">Stampe & Report</h1>
        </div>
      </header>
      <main className="mx-auto grid max-w-[900px] gap-4 p-6 md:grid-cols-2">
        <Link to="/stampe/predefinite" className={CARTA}>
          <LayoutList className="size-8 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold">Stampe predefinite</h2>
          <p className="flex-1 text-sm text-muted-foreground">
            Elenchi pronti: anagrafica dei lavoratori, divisa per reparto o per funzione, e scadenze di tutti gli attestati o di preposti,
            antincendio e primo soccorso. I filtri sono già impostati: scegli la carta e guarda l'anteprima.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Scegli una stampa <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
        <Link to="/stampe/personalizzata" className={CARTA}>
          <SlidersHorizontal className="size-8 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold">Stampa personalizzata</h2>
          <p className="flex-1 text-sm text-muted-foreground">
            Costruisci tu il documento: tipo di elenco, selezioni (nuovi arrivati, anagrafica incompleta, senza attestati), filtri per reparto,
            ruolo, classe di concorso e scadenza, con anteprima, colonne a scelta e guida con le ricette rapide.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Apri la stampa personalizzata <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </main>
    </div>
  );
}

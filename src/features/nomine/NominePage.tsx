/*
 * File:      NominePage.tsx
 * Percorso:  src/features/nomine/NominePage.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Pagina «Nomine»: un bottone per ogni tipo di nomina, con il numero di nominati trovati nell'organigramma.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, FileSignature } from "lucide-react";
import { IdentitaDitta } from "@/components/IdentitaDitta";
import { useDatiNomine } from "./hooks/useDatiNomine";
import { nominatiDaOrganigramma } from "./nominativi";
import { ELENCO_NOMINE } from "./tipi";

const CARTA =
  "group flex h-full flex-col gap-2 rounded-lg border-2 border-border bg-card p-5 transition-all hover:border-verde-vivo hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde-vivo";

export function NominePage() {
  const { organigramma, caricamento } = useDatiNomine();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Torna alla home"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <h1 className="text-lg font-semibold">Nomine</h1>
          </div>
          <IdentitaDitta compatta />
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] p-6">
        <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
          Scegli la nomina: i nominativi sono quelli dell'organigramma, il testo si può modificare e
          l'intestazione (ragione sociale, recapiti, logo) è quella della ditta in anagrafica.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ELENCO_NOMINE.map((v) => {
            const n = nominatiDaOrganigramma(v, organigramma).length;
            return (
              <Link key={v.tipo} to="/nomine/$tipo" params={{ tipo: v.tipo }} className={CARTA}>
                <FileSignature className="size-7 text-primary" aria-hidden />
                <h2 className="text-lg font-semibold">{v.label}</h2>
                <p className="flex-1 text-sm text-muted-foreground">{v.descrizione}</p>
                <span className="inline-flex items-center justify-between text-sm font-semibold text-primary">
                  <span>{caricamento ? "…" : n === 1 ? "1 nominato" : `${n} nominati`}</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

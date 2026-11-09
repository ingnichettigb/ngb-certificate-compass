/*
 * File:      ElencoStampePredefinite.tsx
 * Percorso:  src/features/stampe/components/ElencoStampePredefinite.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Pagina con le carte delle stampe predefinite: titolo, spiegazione e cosa contiene; la carta apre la stampa.
 *   rev 2 — 09/11/2026 17:10 — Aggiunta la sezione «Formazione completata e abilitazioni» per le 6 nuove carte.
 *   rev 3 — 09/11/2026 22:10 — Numero progressivo (01, 02, …) in alto a sinistra di ogni carta, nell'ordine in cui compaiono in pagina
 *            (le famiglie una dopo l'altra), per ricordare facilmente quale stampa usare. Se si aggiunge o sposta una carta si rinumera da solo.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAMPE_PREDEFINITE, type FamigliaPredefinita } from "../stampe-predefinite";

const FAMIGLIE: { nome: FamigliaPredefinita; titolo: string }[] = [
  { nome: "Anagrafica", titolo: "Anagrafica e organico" },
  { nome: "Scadenze", titolo: "Scadenze degli attestati" },
  { nome: "Completati", titolo: "Formazione completata e abilitazioni" },
];

/** Numero progressivo a due cifre di ogni carta, nell'ordine di visualizzazione (famiglia per famiglia). */
const NUMERI: Record<string, string> = Object.fromEntries(
  FAMIGLIE.flatMap((f) => STAMPE_PREDEFINITE.filter((s) => s.famiglia === f.nome)).map((s, i) => [s.id, String(i + 1).padStart(2, "0")]),
);

export function ElencoStampePredefinite() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-5 py-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/stampe">
              <ArrowLeft className="size-4" /> Scelta stampe
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Stampe predefinite</h1>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] space-y-8 p-6">
        {FAMIGLIE.map((f) => (
          <section key={f.nome} aria-labelledby={`famiglia-${f.nome}`}>
            <h2 id={`famiglia-${f.nome}`} className="mb-3 text-base font-semibold">{f.titolo}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STAMPE_PREDEFINITE.filter((s) => s.famiglia === f.nome).map((s) => (
                <Link
                  key={s.id}
                  to="/stampe/predefinite/$id"
                  params={{ id: s.id }}
                  className="group relative flex h-full flex-col gap-2 rounded-lg border-2 border-border bg-card p-4 transition-all hover:border-verde-vivo hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde-vivo"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-2 -top-2 rounded-md bg-primary px-1.5 py-0.5 font-mono text-xs font-bold text-primary-foreground shadow-sm"
                  >
                    {NUMERI[s.id]}
                  </span>
                  <h3 className="text-base font-semibold"><span className="sr-only">Stampa {NUMERI[s.id]}: </span>{s.titolo}</h3>
                  <p className="text-sm">{s.descrizione}</p>
                  <p className="flex-1 text-xs text-muted-foreground"><b>Colonne:</b> {s.contiene}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Apri l'anteprima <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

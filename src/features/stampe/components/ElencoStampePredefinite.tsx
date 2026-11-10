/*
 * File:      ElencoStampePredefinite.tsx
 * Percorso:  src/features/stampe/components/ElencoStampePredefinite.tsx
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Pagina con le carte delle stampe predefinite: titolo, spiegazione e cosa contiene; la carta apre la stampa.
 *   rev 2 — 09/11/2026 17:10 — Aggiunta la sezione «Formazione completata e abilitazioni» per le 6 nuove carte.
 *   rev 3 — 09/11/2026 22:10 — Numero progressivo (01, 02, …) in alto a sinistra di ogni carta, nell'ordine in cui compaiono in pagina
 *            (le famiglie una dopo l'altra), per ricordare facilmente quale stampa usare. Se si aggiunge o sposta una carta si rinumera da solo.
 *   rev 4 — 10/11/2026 16:10 — Carta «Organigramma della sicurezza – A3» (tavola grafica) in testa alla pagina.
 *   rev 5 — 10/11/2026 18:00 — La tavola A3 non è più un riquadro separato senza numero: è la carta 01 di «Anagrafica e organico».
 *            Nuovo ordine 01 A3, 02 Organigramma squadre, 03 Registro, 04 Per settore, 05 Per funzioni; Scadenze dalla 06 e Completati a seguire.
 *            Elenco e numeri arrivano da numerazione-carte.ts.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { carteDellaFamiglia, FAMIGLIE, numeriCarte, type VoceCarta } from "../numerazione-carte";

/** Numero progressivo a due cifre di ogni carta, nell'ordine di visualizzazione (famiglia per famiglia). */
const NUMERI = numeriCarte();

const CLASSI_CARTA =
  "group relative flex h-full flex-col gap-2 rounded-lg border-2 border-border bg-card p-4 transition-all hover:border-verde-vivo hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde-vivo";

function ContenutoCarta({ c }: { c: VoceCarta }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute -left-2 -top-2 rounded-md bg-primary px-1.5 py-0.5 font-mono text-xs font-bold text-primary-foreground shadow-sm"
      >
        {NUMERI[c.id]}
      </span>
      <h3 className="text-base font-semibold"><span className="sr-only">Stampa {NUMERI[c.id]}: </span>{c.titolo}</h3>
      <p className="text-sm">{c.descrizione}</p>
      <p className="flex-1 text-xs text-muted-foreground"><b>{c.tavolaA3 ? "Contiene:" : "Colonne:"}</b> {c.contiene}</p>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        {c.tavolaA3 ? "Apri la tavola" : "Apri l'anteprima"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </>
  );
}

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
              {carteDellaFamiglia(f.nome).map((c) =>
                c.tavolaA3 ? (
                  <Link key={c.id} to="/stampe/organigramma-a3" className={CLASSI_CARTA}>
                    <ContenutoCarta c={c} />
                  </Link>
                ) : (
                  <Link key={c.id} to="/stampe/predefinite/$id" params={{ id: c.id }} className={CLASSI_CARTA}>
                    <ContenutoCarta c={c} />
                  </Link>
                ),
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

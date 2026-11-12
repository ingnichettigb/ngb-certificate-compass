/*
 * File:      BarraNavigazioneFissa.tsx
 * Percorso:  src/components/layout/BarraNavigazioneFissa.tsx
 * Data creaz: 28/10/2026
 * Revisioni:
 *   rev 1 — 28/10/2026 17:40 — Barra di navigazione fissa superiore con le 4 sezioni chiave (TanStack Router).
 *   rev 2 — 02/11/2026 11:10 — Aggiunta voce «Stampe & Report».
 *   rev 3 — 07/11/2026 — Barra unica su tutte le pagine del gestionale (montata in __root): voci raggruppate per
 *            fase di lavoro, suggerimento al passaggio del mouse, bottoni verde vivo, menu «Sistema» a destra.
 *   rev 4 — 07/11/2026 — Etichette dei bottoni su due righe (più corti); icona e testo centrati.
 *   rev 5 — 12/11/2026 06:53 — Identità aziendale condivisa su tutte le pagine del gestionale.
 */
import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MenuSistema } from "./MenuSistema";
import { IdentitaDitta } from "@/components/IdentitaDitta";
import { GRUPPI_NAV, type VoceNav } from "./voci-navigazione";

// A riposo: verde chiaro con bordo verde vivo. Pagina attiva: verde scuro pieno.
const BASE =
  "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-pre-line rounded-lg border-2 border-verde-vivo bg-verde-vivo/15 px-2.5 py-0.5 text-center text-sm font-semibold leading-tight text-primary transition-all hover:bg-verde-vivo/30";
const ATTIVO = "!bg-primary !text-primary-foreground shadow-sm ring-2 ring-verde-vivo/40";

function VoceBarra({ voce }: { voce: VoceNav }) {
  const { to, label, descrizione, Icona, soloIcona, nuovaScheda } = voce;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          {...(soloIcona ? { "aria-label": label } : {})}
          {...(nuovaScheda ? { target: "_blank", rel: "noopener" } : {})}
          activeOptions={{ exact: to === "/" }}
          className={BASE}
          activeProps={{ className: ATTIVO }}
        >
          <div className="hidden max-w-48 shrink-0 lg:block"><IdentitaDitta compatta /></div>
          <Icona className="size-4 shrink-0" />
          {soloIcona ? null : <span>{label}</span>}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        {descrizione}
      </TooltipContent>
    </Tooltip>
  );
}

export function BarraNavigazioneFissa() {
  return (
    <TooltipProvider delayDuration={250}>
      <nav
        aria-label="Navigazione principale"
        className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm print:hidden"
      >
        <div
          className="mx-auto flex max-w-[1600px] items-center gap-3 px-4"
          style={{ height: "var(--altezza-barra)" }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1">
            {GRUPPI_NAV.map((gruppo, i) => (
              <Fragment key={gruppo[0]?.to}>
                {i > 0 ? <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" /> : null}
                {gruppo.map((voce) => (
                  <VoceBarra key={voce.to} voce={voce} />
                ))}
              </Fragment>
            ))}
          </div>
          <MenuSistema />
        </div>
        <div className="border-t border-border px-4 py-1 lg:hidden"><IdentitaDitta compatta /></div>
      </nav>
    </TooltipProvider>
  );
}

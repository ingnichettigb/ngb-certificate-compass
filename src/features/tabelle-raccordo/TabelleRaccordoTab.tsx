/*
 * File:      TabelleRaccordoTab.tsx
 * Percorso:  src/features/tabelle-raccordo/TabelleRaccordoTab.tsx
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Scheda «Tabelle di raccordo» di Impostazioni generali: un pulsante numerato per ognuna delle 9 tabelle.
 *   rev 2 — 14/11/2026 21:50 — Pulsanti delle 9 tabelle con il bottone standard (variante «selezione»).
 *   rev 3 — 15/11/2026 10:50 — Tabella 09 (Corsi): bottone «Esporta» (Excel o CSV) accanto a «Tabella corsi».
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PulsanteEsporta } from "@/components/tabella-comune/PulsanteEsporta";
import { esportaTipiCorso } from "@/features/tipi-corso/esporta-excel";
import { TabellaTipiCorsoDialog } from "@/features/tipi-corso/TabellaTipiCorsoDialog";
import { TABELLE_RACCORDO } from "./definizioni";
import { TabellaRaccordo } from "./TabellaRaccordo";

export function TabelleRaccordoTab() {
  const [corrente, setCorrente] = useState(TABELLE_RACCORDO[0]!.id);
  const def = TABELLE_RACCORDO.find((t) => t.id === corrente) ?? TABELLE_RACCORDO[0]!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tabelle di raccordo">
        {TABELLE_RACCORDO.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="selezione"
            role="tab"
            aria-selected={t.id === corrente}
            aria-pressed={t.id === corrente}
            onClick={() => setCorrente(t.id)}
          >
            {t.numero} – {t.titolo}
          </Button>
        ))}
      </div>

      {def.tabella ? (
        <TabellaRaccordo key={def.id} def={def} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{def.descrizione}</p>
          <div className="flex flex-wrap items-center gap-2">
            <TabellaTipiCorsoDialog />
            <PulsanteEsporta onEsporta={(formato) => esportaTipiCorso(formato)} />
          </div>
        </div>
      )}
    </div>
  );
}

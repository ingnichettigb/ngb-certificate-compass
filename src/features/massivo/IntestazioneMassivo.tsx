/*
 * File:      IntestazioneMassivo.tsx
 * Percorso:  src/features/massivo/IntestazioneMassivo.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Testata della pagina «Inserimento massivo»: titolo e comandi di carico in blocco
 *            («Importa da cartella», «Aggancia attestato come allegato», «Aggiungi attestato»).
 *            Provengono dalla vecchia sezione «Gestione attestati archiviati» del Cruscotto HR.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderInput, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogImportaCartellaHr } from "@/features/hr/components/DialogImportaCartellaHr";
import { AzioniAttestatiBarra } from "@/features/hr/components/AzioniAttestatiBarra";

export function IntestazioneMassivo() {
  const [apriImport, setApriImport] = useState(false);
  const qc = useQueryClient();

  // Gli attestati importati finiscono tra quelli da validare: si aggiornano elenco e contatori.
  function aggiorna() {
    qc.invalidateQueries({ queryKey: ["attestati"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

  return (
    <>
      <div
        className="sticky z-30 border-b border-border bg-background/95 backdrop-blur"
        style={{ top: "var(--altezza-barra)" }}
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Layers className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-base font-semibold">Inserimento massivo</h1>
              <p className="text-xs text-muted-foreground">
                Avvio a regime e arrivi in blocco dopo un corso: importa da cartella e aggancia i file
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApriImport(true)}
              className="gap-1.5 border-2 border-primary bg-primary/15 font-medium text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <FolderInput className="size-4" /> Importa da cartella
            </Button>
            <AzioniAttestatiBarra />
          </div>
        </div>
      </div>

      <DialogImportaCartellaHr open={apriImport} onClose={() => setApriImport(false)} onImported={aggiorna} />
    </>
  );
}

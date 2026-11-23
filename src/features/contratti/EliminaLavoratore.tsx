/*
 * File:      EliminaLavoratore.tsx
 * Percorso:  src/features/contratti/EliminaLavoratore.tsx
 * Data creaz: 23/11/2026
 * Zona di pericolo della scheda lavoratore: «Elimina definitivamente» con doppia conferma
 * («Elimina per sempre», poi «Sei sicuro di volerlo eliminare per sempre?»). Vale per lavoratori in forza e cessati.
 * I file già caricati nello storage non vengono toccati.
 * Revisioni:
 *   rev 1 — 23/11/2026 08:55 — Pulsante, finestra a due passi, aggiornamento delle liste dopo l'eliminazione.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { eliminaDipendente, type Dipendente } from "@/lib/api";
import { CHIAVE_DITTA, CHIAVE_LAVORATORI_IN_FORZA } from "@/lib/api/ditta";
import { CHIAVE_ASSEGNAZIONI_RUOLI } from "@/lib/api/ruoli";

/** Liste da ricaricare dopo l'eliminazione: lavoratori, attestati, PDF, DVR, ruoli, coda operatore, organigramma, contatori e stampe. */
const CHIAVI_DA_AGGIORNARE: readonly (readonly string[])[] = [
  ["dipendenti"],
  ["attestati"],
  ["documenti"],
  ["integrazioni-dvr"],
  ["coda"],
  ["stats"],
  ["ditta"],
  ["stampe-attestati"],
  ["export-attestati"],
  [...CHIAVE_DITTA],
  [...CHIAVE_LAVORATORI_IN_FORZA],
  [...CHIAVE_ASSEGNAZIONI_RUOLI],
];

export function EliminaLavoratore({
  corrente,
  nAttestati,
  onEliminato,
}: {
  corrente: Dipendente;
  /** Attestati registrati del lavoratore (per l'avviso nella finestra). */
  nAttestati: number;
  /** Chiamata a eliminazione riuscita: la pagina deseleziona la scheda. */
  onEliminato?: (() => void) | undefined;
}) {
  const qc = useQueryClient();
  const [aperto, setAperto] = useState(false);
  const [passo, setPasso] = useState<1 | 2>(1);
  const [inCorso, setInCorso] = useState(false);

  const nomeCompleto = `${corrente.cognome} ${corrente.nome ?? ""}`.trim();

  function apri() {
    setPasso(1);
    setAperto(true);
  }

  async function elimina() {
    setInCorso(true);
    try {
      const { avvisi } = await eliminaDipendente(corrente);
      toast.success("Lavoratore eliminato definitivamente");
      if (avvisi.length > 0) {
        toast.info(`Lavoratore eliminato, ma non sono riuscito a pulire: ${avvisi.join(", ")}.`);
      }
      for (const queryKey of CHIAVI_DA_AGGIORNARE)
        qc.invalidateQueries({ queryKey: [...queryKey] });
      setAperto(false);
      onEliminato?.();
    } catch (e) {
      toast.error((e as Error).message || "Eliminazione non riuscita");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <>
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-destructive/80">
          Zona di pericolo
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          data-aiuto="Elimina per sempre la scheda e tutti i dati del lavoratore dal programma. I file già caricati nell'archivio restano dove sono."
          onClick={apri}
        >
          <Trash2 className="size-4" /> Elimina definitivamente lavoratore
        </Button>
      </div>

      <AlertDialog
        open={aperto}
        onOpenChange={(open) => {
          if (!inCorso) setAperto(open);
        }}
      >
        <AlertDialogContent>
          {passo === 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare definitivamente questo lavoratore?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-muted p-3 text-foreground">
                      <dt className="text-muted-foreground">Nome</dt>
                      <dd className="font-medium">{corrente.nome}</dd>
                      <dt className="text-muted-foreground">Cognome</dt>
                      <dd className="font-medium">{corrente.cognome}</dd>
                      <dt className="text-muted-foreground">Reparto</dt>
                      <dd>{corrente.reparto || "—"}</dd>
                      <dt className="text-muted-foreground">Codice fiscale</dt>
                      <dd className="font-mono">{corrente.codice_fiscale}</dd>
                    </dl>
                    {nAttestati > 0 ? (
                      <p className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-foreground">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                        <span>
                          Attenzione: questo lavoratore ha {nAttestati}{" "}
                          {nAttestati === 1 ? "attestato" : "attestati"} registrati. Verranno
                          cancellati dal programma insieme all'anagrafica, ai ruoli, alle
                          integrazioni DVR, ai dati nella coda dell'operatore e al nominativo
                          nell'organigramma. I file PDF e le foto già caricati restano dove sono.
                        </span>
                      </p>
                    ) : (
                      <p>
                        Questa scheda non ha attestati registrati e verrà rimossa dal programma, con
                        ruoli, dati nella coda dell'operatore e nominativo nell'organigramma. I file
                        già caricati restano dove sono.
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    setPasso(2);
                  }}
                >
                  Elimina per sempre
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Sei sicuro di volerlo eliminare per sempre?</AlertDialogTitle>
                <AlertDialogDescription>
                  Stai per eliminare <strong>{nomeCompleto}</strong>. L'operazione non può essere
                  annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={inCorso}>No, annulla</AlertDialogCancel>
                <AlertDialogAction
                  disabled={inCorso}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    void elimina();
                  }}
                >
                  {inCorso ? "Eliminazione..." : "Sì, elimina per sempre"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

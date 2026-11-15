/*
 * File:      DialogRisultatiSede.tsx
 * Percorso:  src/features/impostazioni/ditta/DialogRisultatiSede.tsx
 * Data creaz: 15/11/2026
 * Revisioni:
 *   rev 1 — 15/11/2026 — Finestra «Risultati sede» (icona occhio): prospetto SOLO LETTURA con presenze massime, incidenza sul totale, lavoratori in forza assegnati, presidio delle emergenze e data di aggiornamento automatica.
 */
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CHIAVE_LAVORATORI_PER_SEDE, contaLavoratoriPerSede, type Sede } from "@/lib/api/sedi";
import {
  CHIAVE_ASSEGNAZIONI_RUOLI,
  CHIAVE_RUOLI,
  getAssegnazioniRuoli,
  getRuoliSicurezza,
} from "@/lib/api/ruoli";
import type { RiepilogoPresenze } from "@/features/ditta/presenze-sedi";

interface Props {
  sede: Sede | null;
  riepilogo: RiepilogoPresenze;
  onChiudi: () => void;
}

/** Riga etichetta/valore: solo testo, nessun campo modificabile. */
function Dato({ etichetta, valore }: { etichetta: string; valore: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded border bg-muted/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{etichetta}</span>
      <strong className="text-right">{valore}</strong>
    </div>
  );
}

export function DialogRisultatiSede({ sede, riepilogo, onChiudi }: Props) {
  const aperta = sede !== null;
  const { data: perSede, isLoading: l1 } = useQuery({
    queryKey: CHIAVE_LAVORATORI_PER_SEDE,
    queryFn: contaLavoratoriPerSede,
    enabled: aperta,
  });
  const { data: assegnazioni = [], isLoading: l2 } = useQuery({
    queryKey: CHIAVE_ASSEGNAZIONI_RUOLI,
    queryFn: getAssegnazioniRuoli,
    enabled: aperta,
  });
  const { data: ruoli = [], isLoading: l3 } = useQuery({
    queryKey: CHIAVE_RUOLI,
    queryFn: getRuoliSicurezza,
    enabled: aperta,
  });

  const lavoratori = sede ? (perSede?.[sede.id] ?? 0) : 0;
  const persone = sede?.persone_max ?? null;
  const incidenza =
    persone !== null && riepilogo.totale > 0 ? `${((persone / riepilogo.totale) * 100).toFixed(1)}%` : "—";

  // Presidio delle emergenze: incarichi assegnati a questa sede, raggruppati per ruolo
  const presidio = sede
    ? Object.entries(
        assegnazioni
          .filter((a) => a.sede_id === sede.id)
          .reduce<Record<string, number>>((acc, a) => {
            acc[a.ruolo_id] = (acc[a.ruolo_id] ?? 0) + 1;
            return acc;
          }, {}),
      )
        .map(([ruoloId, n]) => ({ nome: ruoli.find((r) => r.id === ruoloId)?.nome ?? "Ruolo", n }))
        .sort((a, b) => a.nome.localeCompare(b.nome))
    : [];

  const indirizzo = sede
    ? [sede.indirizzo, [sede.cap, sede.comune].filter(Boolean).join(" "), sede.provincia && `(${sede.provincia})`]
        .filter(Boolean)
        .join(" — ")
    : "";
  const aggiornata = sede?.updated_at ? new Date(sede.updated_at).toLocaleDateString("it-IT") : "—";

  return (
    <Dialog open={aperta} onOpenChange={(a) => !a && onChiudi()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Risultati — {sede?.nome}</DialogTitle>
          <DialogDescription>
            Prospetto calcolato dal programma, solo consultazione: per correggere un dato usa la matita.
          </DialogDescription>
        </DialogHeader>

        {l1 || l2 || l3 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Calcolo in corso…
          </div>
        ) : (
          <div className="space-y-2" data-testid="risultati-sede">
            <Dato etichetta="Tipo" valore={sede?.is_principale ? "Sede Centrale" : "Plesso / succursale"} />
            <Dato etichetta="Indirizzo" valore={indirizzo || "Non indicato"} />
            <Dato etichetta="Massimo presenti nella sede" valore={persone ?? "Da compilare"} />
            <Dato etichetta="Incidenza sul totale aziendale" valore={incidenza} />
            <Dato etichetta="Totale presenze di tutte le sedi" valore={riepilogo.totale} />
            <Dato etichetta="Lavoratori in forza assegnati" valore={lavoratori} />
            <div className="rounded border bg-muted/20 px-3 py-2 text-sm">
              <p className="mb-1 text-muted-foreground">Presidio delle emergenze (incarichi assegnati alla sede)</p>
              {presidio.length === 0 ? (
                <strong>Nessun incarico assegnato</strong>
              ) : (
                <ul className="space-y-0.5">
                  {presidio.map((p) => (
                    <li key={p.nome} className="flex justify-between">
                      <span>{p.nome}</span>
                      <strong>{p.n}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Dato etichetta="Ultimo aggiornamento (automatico)" valore={aggiornata} />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onChiudi}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

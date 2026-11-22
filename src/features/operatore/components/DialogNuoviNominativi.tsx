/*
 * File:      DialogNuoviNominativi.tsx
 * Percorso:  src/features/operatore/components/DialogNuoviNominativi.tsx
 * Data creazione: 22/11/2026
 * Scheda «Completa i nuovi inserimenti» per i lavoratori creati ex novo dall'archiviazione di un attestato.
 * Riusa la finestra «Da completare» (stessa scheda anagrafica, «Salva e prossimo», «Salta») limitata ai
 * soli nominativi appena creati. Si apre quando i loro dati sono arrivati dal database.
 * Revisioni:
 *   rev 1 — 22/11/2026 — Prima stesura.
 */
import { useQuery } from "@tanstack/react-query";
import { getDipendenti, getReparti } from "@/lib/api";
import { DialogDaCompletare } from "@/features/da-completare/DialogDaCompletare";

export function DialogNuoviNominativi({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const attiva = ids.length > 0;
  const { data: dipendenti = [] } = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti, enabled: attiva });
  const { data: reparti = [] } = useQuery({ queryKey: ["reparti"], queryFn: getReparti, enabled: attiva, retry: false });
  // Si apre solo quando l'elenco aggiornato contiene tutti i nuovi: altrimenti la coda partirebbe vuota.
  const pronti = attiva && ids.every((id) => dipendenti.some((d) => d.id === id));

  return (
    <DialogDaCompletare
      open={pronti}
      onClose={onClose}
      dipendenti={dipendenti}
      repartiAttivi={reparti.filter((r) => r.attivo).map((r) => r.nome)}
      soloIds={ids}
    />
  );
}

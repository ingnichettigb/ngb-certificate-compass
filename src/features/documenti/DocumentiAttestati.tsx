/**
 * @file DocumentiAttestati.tsx
 * @path src/features/documenti/DocumentiAttestati.tsx
 * @created 2024-05-10
 * @revision 2026-10-28 20:20 - rev 3 - Utilizzo di Button unificato per aggancio e aggiunta attestati
 * @description Elenco degli attestati PDF di un dipendente, con apertura, eliminazione e caricamento.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Paperclip, Plus } from "lucide-react";
import {
  eliminaDocumento,
  getDocumenti,
  urlDocumento,
  type Dipendente,
  type DocumentoAttestato,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { RigaDocumento } from "./RigaDocumento";
import { DialogCaricamento } from "./DialogCaricamento";
import { SchermoAgganciaAllegato } from "@/features/dipendenti/aggancia-allegato/SchermoAgganciaAllegato";
import { pubblicaDipendente, registraComando } from "./barra-azioni";

export function DocumentiAttestati({
  dipendente,
  bottoniInBarra = false,
}: {
  dipendente: Dipendente;
  bottoniInBarra?: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [aggancia, setAggancia] = useState(false);

  const { data: documenti = [], isLoading } = useQuery({
    queryKey: ["documenti", dipendente.id],
    queryFn: () => getDocumenti(dipendente.id),
  });

  // La barra fissa del Cruscotto HR comanda da qui: pubblica il dipendente aperto
  // e registra le azioni dei due bottoni.
  useEffect(() => {
    pubblicaDipendente(dipendente);
  }, [dipendente]);
  useEffect(() => () => pubblicaDipendente(null), []);
  useEffect(() => registraComando("caricamento", () => setOpen(true)), []);
  useEffect(() => registraComando("aggancio", () => setAggancia(true)), []);

  async function apri(doc: DocumentoAttestato) {
    try {
      const url = await urlDocumento(doc.percorso_file);
      if (url) window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error("Impossibile aprire il file", { description: (e as Error).message });
    }
  }

  async function elimina(doc: DocumentoAttestato) {
    if (!window.confirm(`Eliminare definitivamente "${doc.nome_file}"?`)) return;
    try {
      await eliminaDocumento(doc);
      toast.success("Attestato eliminato");
      qc.invalidateQueries({ queryKey: ["documenti", dipendente.id] });
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">Attestati (PDF)</h3>
        {!bottoniInBarra ? (
          <div className="flex flex-col items-end gap-1.5">
            <Button type="button" onClick={() => setAggancia(true)}>
              <Paperclip className="size-4" /> Aggancia attestato come allegato
            </Button>
            <Button type="button" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Aggiungi attestato
            </Button>
          </div>
        ) : null}
      </div>
      <SchermoAgganciaAllegato
        open={aggancia}
        onChiudi={() => setAggancia(false)}
        dipendente={dipendente}
        onAgganciato={() => qc.invalidateQueries({ queryKey: ["documenti", dipendente.id] })}
      />

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Caricamento…
        </div>
      ) : documenti.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documenti.map((doc) => (
            <RigaDocumento key={doc.id} doc={doc} onApri={() => apri(doc)} onElimina={() => elimina(doc)} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Nessun PDF caricato per questo dipendente
        </p>
      )}

      <DialogCaricamento
        dipendente={dipendente}
        open={open}
        onOpenChange={setOpen}
        onDone={() => qc.invalidateQueries({ queryKey: ["documenti", dipendente.id] })}
      />
    </div>
  );
}

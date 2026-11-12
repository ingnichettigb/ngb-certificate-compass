/*
 * File:      ControlliElenco.tsx
 * Percorso:  src/features/dipendenti/import-elenco/ControlliElenco.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DialogImportaElenco.tsx: selettore della modalità e barra di configurazione (file, date di servizio). Nessun cambio di comportamento.
 *   rev 2 — 11/11/2026 — Pulsante «Scarica modello Excel» sotto il campo file (modalità «Solo nuovi»).
 */
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scaricaModelloElenco } from "./modello-excel";

export type ModalitaElenco = "nuovi" | "aggiorna";

export function SelettoreModalita({
  modalita,
  onCambia,
}: {
  modalita: ModalitaElenco;
  onCambia: (m: ModalitaElenco) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold">Modalità:</span>
      <div className="inline-flex rounded-md border border-border bg-background p-0.5">
        <Button
          type="button"
          size="sm"
          variant={modalita === "nuovi" ? "default" : "ghost"}
          className="h-8 px-3 text-xs"
          onClick={() => onCambia("nuovi")}
        >
          Solo nuovi
        </Button>
        <Button
          type="button"
          size="sm"
          variant={modalita === "aggiorna" ? "default" : "ghost"}
          className="h-8 px-3 text-xs"
          onClick={() => onCambia("aggiorna")}
        >
          Aggiornamento elenco
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">
        {modalita === "nuovi"
          ? "Inserisce i nuovi e riabilita i cessati selezionati portandoli in «Da completare»."
          : "Registra cessazioni e cambi di profilo o classe sui lavoratori già in archivio."}
      </span>
    </div>
  );
}

export function BarraConfigurazione({
  modalita,
  dataFine,
  setDataFine,
  dataInizio,
  setDataInizio,
  onFile,
}: {
  modalita: ModalitaElenco;
  dataFine: string;
  setDataFine: (v: string) => void;
  dataInizio: string;
  setDataInizio: (v: string) => void;
  onFile: (f: File | undefined) => void;
}) {
  const [scarico, setScarico] = useState(false);
  async function scaricaModello() {
    setScarico(true);
    try {
      await scaricaModelloElenco();
    } catch (e) {
      toast.error(`Modello Excel non generato: ${(e as Error).message}`);
    } finally {
      setScarico(false);
    }
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-foreground">File (.docx, .xlsx, .csv)</span>
          <Input
            type="file"
            accept=".docx,.xlsx,.xls,.xlsm,.csv"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {modalita === "nuovi" && (
          <Button type="button" variant="outline" size="sm" className="h-8 w-fit gap-1.5 text-xs" disabled={scarico} onClick={scaricaModello}>
            <Download className="size-3.5" /> {scarico ? "Preparo il modello…" : "Scarica modello Excel"}
          </Button>
        )}
      </div>
      {modalita === "aggiorna" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Data fine servizio (cessati)</span>
          <Input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">Data inizio servizio (nuovi)</span>
        <Input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} />
      </label>
    </div>
  );
}

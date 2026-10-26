/*
 * File:      BackupBar.tsx
 * Percorso:  src/components/BackupBar.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:30 — Barra superiore con Impostazioni generali e backup DB.
 *   rev 2 — 25/10/2026 10:15 — Dati ditta spostati dentro "Impostazioni generali".
 *   rev 3 — 26/10/2026 17:30 — Integrazione DialogCaricaBackup con filtro esclusivo 030ArchAttestati_.
 */
import { useState } from "react";
import { Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { esportaDb } from "@/lib/api";
import { ImpostazioniDialog } from "@/components/ImpostazioniDialog";
import { DialogCaricaBackup } from "@/components/DialogCaricaBackup";

export function BackupBar({ onImported }: { onImported?: () => void }) {
  const [busyExport, setBusyExport] = useState(false);
  const [dialogImportAperto, setDialogImportAperto] = useState(false);

  async function handleExport() {
    setBusyExport(true);
    try {
      const dump = await esportaDb();
      if (dump) {
        toast.success("Backup salvato", {
          description: `${dump.dipendenti.length} dipendenti e ${dump.attestati_caricati.length} attestati esportati.`,
        });
      }
    } catch (e) {
      toast.error("Esportazione non riuscita", { description: String(e) });
    } finally {
      setBusyExport(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ImpostazioniDialog />

      <Button variant="outline" size="sm" onClick={handleExport} disabled={busyExport}>
        {busyExport ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Salva DB su cartella
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogImportAperto(true)}
      >
        <Upload className="size-4" />
        Carica DB da file
      </Button>

      <DialogCaricaBackup
        aperto={dialogImportAperto}
        onOpenChange={setDialogImportAperto}
        onImported={onImported}
      />
    </div>
  );
}

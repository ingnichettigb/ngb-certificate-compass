/*
 * File:      BackupBar.tsx
 * Percorso:  src/components/BackupBar.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:30 — Barra superiore backup e impostazioni.
 *   rev 2 — 25/10/2026 10:15 — Dati ditta spostati dentro Impostazioni generali.
 *   rev 3 — 26/10/2026 17:30 — DialogCaricaBackup selettivo 030ArchAttestati_.
 *   rev 4 — 26/10/2026 17:45 — Uniformazione stile bottoni verde tenue e bordo verde scuro elettrico.
 *   rev 5 — 30/10/2026 21:00 — Indicatore stato cartella locale accanto a Impostazioni generali.
 *   rev 6 — 31/10/2026 09:00 — Indicatore spostato in alto a destra nelle testate; aggiunta prop className.
 */
import { useState } from "react";
import { Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { esportaDb } from "@/lib/api";
import { ImpostazioniDialog } from "@/components/ImpostazioniDialog";
import { DialogCaricaBackup } from "@/components/DialogCaricaBackup";

const STILE_BOTTONE =
  "border-2 border-primary bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground transition-all font-medium";

export function BackupBar({ onImported, className }: { onImported?: () => void; className?: string }) {
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
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`.trim()}>
      <ImpostazioniDialog />

      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={busyExport}
        className={STILE_BOTTONE}
      >
        {busyExport ? (
          <Loader2 className="size-4 animate-spin mr-1.5" />
        ) : (
          <Download className="size-4 mr-1.5" />
        )}
        Salva DB su cartella
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogImportAperto(true)}
        className={STILE_BOTTONE}
      >
        <Upload className="size-4 mr-1.5" />
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

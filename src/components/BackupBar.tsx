/*
 * File:      BackupBar.tsx
 * Percorso:  src/components/BackupBar.tsx
 * Barra superiore con backup DB e configurazione dati ditta.
 */
import { useRef, useState } from "react";
import { Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { esportaDb, importaDb } from "@/lib/api";
import { DatiAziendaDialog } from "@/components/DatiAziendaDialog";

export function BackupBar({ onImported }: { onImported?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);

  async function handleExport() {
    setBusy("export");
    try {
      const dump = await esportaDb();
      if (dump)
        toast.success("Backup salvato", {
          description: `${dump.dipendenti.length} dipendenti e ${dump.attestati_caricati.length} attestati esportati.`,
        });
    } catch (e) {
      toast.error("Esportazione non riuscita", { description: String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function handleImport(file: File) {
    setBusy("import");
    try {
      const res = await importaDb(file);
      toast.success("Backup caricato", {
        description: `${res.dipCount} dipendenti e ${res.attCount} attestati ripristinati.`,
      });
      onImported?.();
    } catch (e) {
      toast.error("Importazione non riuscita", { description: String(e) });
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DatiAziendaDialog />

      <Button variant="outline" size="sm" onClick={handleExport} disabled={!!busy}>
        {busy === "export" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Salva DB su cartella
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={!!busy}
      >
        {busy === "import" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        Carica DB da file
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImport(f);
        }}
      />
    </div>
  );
}

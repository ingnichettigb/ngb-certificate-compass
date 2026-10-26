/*
 * File:      BackupBar.tsx
 * Percorso:  src/components/BackupBar.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:30 — Barra superiore con Impostazioni generali e backup DB.
 *   rev 2 — 25/10/2026 10:15 — Dati ditta spostati dentro "Impostazioni generali".
 *   rev 3 — 26/10/2026 17:25 — Filtro e blocco file se non inizia con 030ArchAttestati_.
 */
import { useRef, useState } from "react";
import { Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { esportaDb, importaDb, PREFISSO_BACKUP } from "@/lib/api";
import { ImpostazioniDialog } from "@/components/ImpostazioniDialog";

export function BackupBar({ onImported }: { onImported?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);

  async function handleExport() {
    setBusy("export");
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
      setBusy(null);
    }
  }

  async function handleImport(file: File) {
    if (!file.name.startsWith(PREFISSO_BACKUP)) {
      toast.error("File non valido", {
        description: `Il file deve iniziare con '${PREFISSO_BACKUP}'. File scelto: '${file.name}'`,
      });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

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
      <ImpostazioniDialog />

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
